import os
from datetime import timedelta
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from django.contrib.auth import get_user_model 

from django.utils import timezone
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator

import numpy as np
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from backendservice import settings

from .models import ClinicianPatientAssignment, PressureRawUpload, SessionWindow
from .permissions import (
    IsAdminRole,
    IsAdminOrClinician,
    IsClinicianOrPatient,
    can_view_patient_data,
    is_assigned,
)
from .serializers import (
    UserSerializer,
    AdminUserSerializer,
    SecureTokenSerializer,
    ClinicianSerializer,
    ClinicianPatientsSerializer,
    PressureRawUploadSerializer,
    PressureAlertSerializer,
    SessionWindowPointSerializer,
    generate_windows_for_upload
)

User = get_user_model()

# -------------------------------
# Authentication & Users
# -------------------------------
class CreateUserView(generics.CreateAPIView):
    # Public self-registration is disabled: only admins can provision accounts.
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]

class AdminCreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

class SecureTokenView(TokenObtainPairView):
    serializer_class = SecureTokenSerializer

class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)

# -------------------------------
# Password Reset Logic
# -------------------------------
@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email", "").strip()
    try:
        user = User.objects.get(email__iexact=email)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = f"http://localhost:5173/reset-password/{uid}/{token}"
        send_mail(
            "Reset your password",
            f"Click the link below to reset your password:\n\n{reset_link}",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    except User.DoesNotExist:
        pass
    return Response({"message": "If the email exists, a password reset link has been sent."})

@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    uid_b64 = request.data.get("uid")
    token = request.data.get("token")
    password = request.data.get("password")
    try:
        uid = urlsafe_base64_decode(uid_b64).decode()
        user = User.objects.get(pk=uid)
        if default_token_generator.check_token(user, token):
            user.set_password(password)
            user.save()
            return Response({"message": "Password reset successful"})
        return Response({"error": "Invalid or expired token"}, status=400)
    except Exception:
        return Response({"error": "Invalid request"}, status=400)

# -------------------------------
# Clinician & Patient Data
# -------------------------------
class ClinicianListView(generics.ListAPIView):
    queryset = User.objects.filter(role='clinician').order_by('last_name', 'first_name')
    serializer_class = ClinicianSerializer
    permission_classes = [IsAdminRole]

class ClinicianPatientsView(generics.ListAPIView):
    """Admins see every active patient (for uploads); clinicians see only their assigned patients."""
    serializer_class = ClinicianPatientsSerializer
    permission_classes = [IsAdminOrClinician]

    def get_queryset(self):
        user = self.request.user
        patients = User.objects.filter(role='patient', is_active=True)
        if user.role == 'clinician':
            patients = patients.filter(
                assigned_clinicians__clinician=user,
                assigned_clinicians__is_active=True,
            )
        return patients.distinct().order_by('-date_joined')

# -------------------------------
# Pressure Data Upload & Processing
# -------------------------------
class PressureRawUploadView(generics.CreateAPIView):
    serializer_class = PressureRawUploadSerializer
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get('file')
        original_name = file_obj.name if file_obj else ''
        with transaction.atomic():
            upload = serializer.save(original_name=original_name)
            generate_windows_for_upload(upload)

class Prefetch:
    def __init__(self, lookup, queryset=None, to_attr=None):
        self.lookup = lookup
        self.queryset = queryset
        self.to_attr = to_attr

    def some_method(self, *args, **kwargs):
        raise NotImplementedError

from datetime import timedelta
import numpy as np

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView



from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from .models import FeedbackComment, User
from .serializers import FeedbackCommentSerializer



def _patient_or_none(patient_id):
    """Look up a patient by id, treating non-numeric ids (e.g. 'me') as not found instead of erroring."""
    try:
        pk = int(patient_id)
    except (TypeError, ValueError):
        return None
    return User.objects.filter(id=pk, role="patient").first()


class FeedbackCommentsView(generics.ListAPIView):
    serializer_class = FeedbackCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        patient_id = self.kwargs.get('patient_id')

        if user.role == 'patient':
            return FeedbackComment.objects.filter(
                patient=user,
                parent__isnull=True
            ).select_related('author', 'patient', 'clinician').prefetch_related('replies__author')
        elif user.role == 'clinician':
            patient = _patient_or_none(patient_id)
            if not can_view_patient_data(user, patient):
                raise PermissionDenied("This patient is not assigned to you.")
            return FeedbackComment.objects.filter(
                patient_id=patient_id,
                parent__isnull=True
            ).select_related('author', 'patient', 'clinician').prefetch_related('replies__author')
        raise PermissionDenied("Admins cannot read patient feedback.")


class FeedbackReplyCreateView(generics.CreateAPIView):
    serializer_class = FeedbackCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        parent_id = request.data.get('parent')
        message = request.data.get('message')

        if not parent_id or not message:
            return Response({'detail': 'parent and message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parent_comment = FeedbackComment.objects.select_related('patient', 'clinician').get(id=parent_id)
        except FeedbackComment.DoesNotExist:
            return Response({'detail': 'Parent comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == 'patient' and parent_comment.patient != user:
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'clinician' and parent_comment.clinician != user:
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role not in ('patient', 'clinician'):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        reply = FeedbackComment.objects.create(
            patient=parent_comment.patient,
            clinician=parent_comment.clinician,
            author=user,
            role=user.role,
            message=message,
            parent=parent_comment
        )

        serializer = self.get_serializer(reply)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


   
class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]


class ComparisonHeatmapView(APIView):
    permission_classes = [IsClinicianOrPatient]

    def get_upload_queryset(self, request):
        patient = get_authorised_patient(request)
        return PressureRawUpload.objects.filter(patient=patient)

    def get_period_bounds(self, anchor, period):
        if period == "this_hour":
            start = anchor.replace(minute=0, second=0, microsecond=0)
            end = anchor.replace(minute=59, second=59, microsecond=999999)
        elif period == "last_hour":
            end = anchor.replace(minute=0, second=0, microsecond=0)
            start = end - timedelta(hours=1)
        elif period == "today":
            start = anchor.replace(hour=0, minute=0, second=0, microsecond=0)
            end = anchor.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif period == "yesterday":
            end = anchor.replace(hour=0, minute=0, second=0, microsecond=0)
            start = end - timedelta(days=1)
        else:
            return None, None

        return start, end

    def get(self, request):
        period = request.query_params.get("period")

        if period not in {"this_hour", "last_hour", "today", "yesterday"}:
            return Response({"detail": "Invalid period"}, status=400)

        qs = self.get_upload_queryset(request).order_by("-recorded_at", "-uploaded_at")

        # Collect the two most recent uploads that have a real file on disk
        uploads_with_file = []
        for u in qs:
            if u.file and os.path.exists(u.file.path):
                uploads_with_file.append(u)
            if len(uploads_with_file) == 2:
                break

        # "current" periods → latest upload; "reference" periods → second upload
        is_current_period = period in {"this_hour", "today"}
        if is_current_period:
            upload = uploads_with_file[0] if len(uploads_with_file) >= 1 else None
        else:
            upload = uploads_with_file[1] if len(uploads_with_file) >= 2 else None

        if not upload:
            return Response({
                "has_data": False,
                "period": period,
                "upload_id": None,
                "frame_index": None,
                "total_frames": 0,
                "frame": None,
                "recorded_at": None,
            })

        raw = np.loadtxt(upload.file.path, delimiter=",", dtype=np.int32)

        if raw.ndim != 2 or raw.shape[1] != 32:
            return Response(
                {"detail": f"Unexpected CSV shape {raw.shape}"},
                status=400,
            )

        if raw.shape[0] % 32 != 0:
            return Response(
                {"detail": "CSV rows not divisible by 32 (frame size)."},
                status=400,
            )

        n_frames = raw.shape[0] // 32
        frames = raw.reshape(n_frames, 32, 32)

        frame_index = n_frames - 1
        frame = frames[frame_index]

        return Response({
            "has_data": True,
            "period": period,
            "upload_id": upload.id,
            "frame_index": frame_index,
            "total_frames": n_frames,
            "frame": frame.tolist(),
            "recorded_at": upload.recorded_at,
        })

class PatientFeedbackCreateView(generics.CreateAPIView):
    serializer_class = FeedbackCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        message = request.data.get('message')

        if not message:
            return Response(
                {'detail': 'message is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role == 'patient':
            assignment = ClinicianPatientAssignment.objects.filter(
                patient=user,
                is_active=True
            ).first()

            if not assignment:
                return Response(
                    {'detail': 'You have no assigned clinician yet.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            clinician_id = assignment.clinician_id
            patient = user
        elif user.role == 'clinician':
            patient_id = request.data.get('patient')
            if not patient_id:
                return Response(
                    {'detail': 'patient is required for clinicians to send feedback.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                patient = User.objects.get(id=patient_id, role='patient')
            except User.DoesNotExist:
                return Response(
                    {'detail': 'Patient not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            if not is_assigned(user, patient):
                return Response({'detail': 'This patient is not assigned to you.'}, status=status.HTTP_403_FORBIDDEN)
            clinician_id = user.id
        else:
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        comment = FeedbackComment.objects.create(
            patient=patient,
            clinician_id=clinician_id,
            author=user,
            role=user.role,
            message=message,
            parent=None
        )

        serializer = self.get_serializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

def get_authorised_patient(request):
    """Return the patient whose clinical data is requested, or raise 403/404.

    Patients may omit ``patient_id`` (or pass their own); clinicians must pass the id of a patient
    assigned to them. Every clinical-data endpoint goes through this check.
    """
    patient_id = (
        request.query_params.get("patient_id")
        or request.query_params.get("patient")
    )
    user = request.user

    if patient_id:
        patient = _patient_or_none(patient_id)
        if patient is None:
            raise NotFound("Patient not found.")
    elif getattr(user, "role", None) == "patient":
        patient = user
    else:
        raise NotFound("patient_id is required.")

    if not can_view_patient_data(user, patient):
        raise PermissionDenied("You do not have access to this patient's data.")
    return patient


def _get_latest_upload_for_patient(patient):
    if patient is None:
        return None

    return (
        PressureRawUpload.objects
        .filter(patient=patient)
        .order_by("-recorded_at", "-uploaded_at")
        .first()
    )


def _build_alert_payload(window):
    risk_score = float(window.risk_score_contribution or 0)
    contact_area = float(window.contact_area_pct or 0)

    if risk_score >= 7:
        alert_type = "critical"
        title = "High Pressure Detected"
        message = (
            "Sustained pressure above recommended levels. "
            "Please adjust your position."
        )
    elif risk_score >= 5 or window.is_high_pressure:
        alert_type = "warning"
        title = "Moderate Pressure Alert"
        message = (
            "Some areas are experiencing elevated pressure. "
            "Consider changing position soon."
        )
    elif contact_area < 45:
        alert_type = "info"
        title = "Low Contact Area"
        message = (
            "Increasing contact area can help distribute pressure more evenly."
        )
    else:
        return None

    return {
        "id": f"window-{window.upload_id}-{window.window_index}",
        "type": alert_type,
        "title": title,
        "message": message,
        "timestamp": window.window_start_time,
        "window_index": window.window_index,
        "ppi_raw": window.ppi_raw,
        "contact_area_pct": round(contact_area, 2),
        "risk_score": round(risk_score, 2),
    }

class LatestHeatmapView(APIView):
    permission_classes = [IsClinicianOrPatient]

    def get(self, request):
        patient = get_authorised_patient(request)
        qs = PressureRawUpload.objects.filter(
            patient=patient
        ).order_by("-recorded_at", "-uploaded_at")

        upload = next((u for u in qs if u.file and os.path.exists(u.file.path)), None)

        if not upload:
            return Response({"detail": "No uploads found"}, status=404)

        raw = np.loadtxt(upload.file.path, delimiter=",", dtype=np.int32)

        if raw.ndim != 2 or raw.shape[1] != 32:
            return Response({"detail": f"Unexpected CSV shape {raw.shape}"}, status=400)
        if raw.shape[0] % 32 != 0:
            return Response({"detail": "CSV rows not divisible by 32 (frame size)."}, status=400)

        n_frames = raw.shape[0] // 32
        frames = raw.reshape(n_frames, 32, 32)

        try:
            frame_index = int(request.query_params.get("frame_index", n_frames - 1))
        except ValueError:
            return Response({"detail": "frame_index must be an integer"}, status=400)

        if not (0 <= frame_index < n_frames):
            return Response(
                {"detail": f"frame_index out of range (0 to {n_frames - 1})"},
                status=400,
            )
        frame = frames[frame_index]

        return Response({
            "upload_id": upload.id,
            "frame_index": frame_index,
            "total_frames": n_frames,
            "frame": frame.tolist(),
            "recorded_at": upload.recorded_at,
        })

class ClinicianHeatmapView(APIView):
    permission_classes = [IsClinicianOrPatient]

    def get(self, request):
        patient = get_authorised_patient(request)
        qs = PressureRawUpload.objects.filter(
            patient=patient
        ).order_by("-recorded_at", "-uploaded_at")

        upload = next((u for u in qs if u.file and os.path.exists(u.file.path)), None)
            
        if not upload:
            return Response({"detail": "No uploads found"}, status=404)

        raw = np.loadtxt(upload.file.path, delimiter=",", dtype=np.int32)

        if raw.ndim != 2 or raw.shape[1] != 32:
            return Response({"detail": f"Unexpected CSV shape {raw.shape}"}, status=400)
        if raw.shape[0] % 32 != 0:
            return Response({"detail": "CSV rows not divisible by 32 (frame size)."}, status=400)

        n_frames = raw.shape[0] // 32
        frames = raw.reshape(n_frames, 32, 32)

        try:
            frame_index = int(request.query_params.get("frame_index", n_frames - 1))
        except ValueError:
            return Response({"detail": "frame_index must be an integer"}, status=400)

        if not (0 <= frame_index < n_frames):
            return Response(
                {"detail": f"frame_index out of range (0 to {n_frames - 1})"},
                status=400,
            )
        frame = frames[frame_index]

        return Response({
            "upload_id": upload.id,
            "frame_index": frame_index,
            "total_frames": n_frames,
            "frame": frame.tolist(),
            "recorded_at": upload.recorded_at,
        })

class PressureAlertsView(APIView):
    permission_classes = [IsClinicianOrPatient]

    def get(self, request):
        patient = get_authorised_patient(request)

        upload = _get_latest_upload_for_patient(patient)
        if upload is None:
            return Response([], status=status.HTTP_200_OK)

        limit = request.query_params.get("limit", 5)
        try:
            limit = max(1, min(int(limit), 20))
        except ValueError:
            return Response(
                {"detail": "limit must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidate_windows = (
            SessionWindow.objects
            .filter(upload=upload)
            .order_by("-window_start_time")[: max(limit * 3, 10)]
        )

        alerts = []
        seen_titles = set()
        for window in candidate_windows:
            alert_payload = _build_alert_payload(window)
            if not alert_payload:
                continue

            dedupe_key = (alert_payload["title"], window.window_index)
            if dedupe_key in seen_titles:
                continue

            seen_titles.add(dedupe_key)
            alerts.append(alert_payload)

            if len(alerts) >= limit:
                break

        alerts.sort(key=lambda item: item["timestamp"], reverse=True)
        serializer = PressureAlertSerializer(alerts, many=True)
        return Response(serializer.data)

class PressureWindowSeriesView(generics.ListAPIView):
    serializer_class = SessionWindowPointSerializer
    permission_classes = [IsClinicianOrPatient]

    def get_queryset(self):
        range_key = self.request.query_params.get("range", "1h")
        patient = get_authorised_patient(self.request)
        delta = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "24h": timedelta(hours=24),
        }.get(range_key, timedelta(hours=1))

        latest_upload = (
            PressureRawUpload.objects
            .filter(patient=patient)
            .order_by("-recorded_at", "-uploaded_at")
            .first()
        )

        if not latest_upload:
            return SessionWindow.objects.none()

        # Anchor the time window to the upload's own recorded_at, not to now()
        anchor = latest_upload.recorded_at or latest_upload.uploaded_at
        since = anchor - delta

        return (
            SessionWindow.objects
            .filter(upload=latest_upload, window_start_time__gte=since)
            .order_by("window_start_time")
        )

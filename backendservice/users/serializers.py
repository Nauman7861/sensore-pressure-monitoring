from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from .models import PressureRawUpload, SessionWindow, ClinicianPatientAssignment
import numpy as np
from django.utils import timezone
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import FeedbackComment

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'role_display', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user

class AdminUserSerializer(UserSerializer):
    pass

class ClinicianSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email']

class ClinicianPatientsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name']


class SecureTokenSerializer(TokenObtainPairSerializer):
    username_field = 'email'
    role = serializers.CharField(write_only=True, required=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        return token

    def validate(self, attrs):
        selected_role = attrs.get('role')
        data = super().validate(attrs)

        if selected_role.lower() != self.user.role.lower():
            raise serializers.ValidationError({
                "role": "Selected role does not match your account role."
            })

        full_name = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'name': full_name,
            'role': self.user.role,
            'email': self.user.email
        }
        return data
    

class PressureRawUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = PressureRawUpload
        fields = ['id', 'patient', 'recorded_at', 'file', 'uploaded_at', 'original_name']
        read_only_fields = ['uploaded_at', 'original_name']

    def validate_patient(self, value):
        if value.role != 'patient':
            raise serializers.ValidationError(
                f"User {value.id} is not a patient (role='{value.role}')."
            )
        return value


class FeedbackReplySerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackComment
        fields = ['id', 'author', 'author_name', 'role', 'message', 'created_at']

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.username


class FeedbackCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    replies = FeedbackReplySerializer(many=True, read_only=True)

    class Meta:
        model = FeedbackComment
        fields = [
            'id',
            'patient',
            'clinician',
            'author',
            'author_name',
            'role',
            'message',
            'parent',
            'created_at',
            'replies',
        ]
        read_only_fields = ['author', 'role', 'created_at']

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.username





# services/windows.py
import csv
from datetime import timedelta
from django.utils import timezone


def calculate_risk_score(ppi_raw: int, contact_area_pct: float, is_high_pressure: bool) -> float:
    """
    Risk score 0-10 (higher = worse)
    """
    # Normalize peak pressure (0-200 → 0-5)
    pressure_score = min(ppi_raw / 40.0, 5.0)  
    
    # Low contact area = high risk (0-100% → 0-3)
    distribution_score = max((100 - contact_area_pct) / 33.3, 0)  # <33% = max risk
    
    # High pressure bonus (0-2)
    high_pressure_bonus = 2.0 if is_high_pressure else 0.0
    
    return min(pressure_score + distribution_score + high_pressure_bonus, 10.0)



LINES_PER_FRAME = 32
COLS = 32

def generate_windows_for_upload(upload, *, batch_size=1000, high_pressure_threshold=60,contact_threshold=10):
    fps = int(upload.fps or 14)
    frames_per_full_window = fps  # 1 second
    t0 = upload.recorded_at or timezone.now()

    windows = []
    window_index = 0

    lines_in_frame = 0
    frames_in_window = 0
    current_max = None


    active_cells_in_window = 0
    total_cells_in_window = 0

    def flush_window(frames_count: int):
        nonlocal window_index, frames_in_window, current_max, windows,active_cells_in_window, total_cells_in_window

        if frames_count <= 0:
            return

        start = t0 + timedelta(seconds=window_index)  # index-based timeline
        end = start + timedelta(seconds=frames_count / fps)

        ppi_raw = current_max if current_max is not None else 1
        contact_area_pct = (active_cells_in_window / total_cells_in_window) * 100 if total_cells_in_window > 0 else 0.0
        is_high_pressure = ppi_raw > high_pressure_threshold
        risk_score = calculate_risk_score(ppi_raw, contact_area_pct, is_high_pressure)
    
        windows.append(
            SessionWindow(
                upload=upload,
                window_index=window_index,
                window_start_time=start,
                window_end_time=end,
                ppi_raw=ppi_raw,
                is_high_pressure=(ppi_raw > high_pressure_threshold),
                contact_area_pct=contact_area_pct,
                risk_score_contribution=risk_score
            )
        )
        window_index += 1
        frames_in_window = 0
        current_max = None
        active_cells_in_window = 0
        total_cells_in_window = 0

        if len(windows) >= batch_size:
            SessionWindow.objects.bulk_create(windows, batch_size=batch_size)
            windows.clear()

    upload.file.open("r")
    try:
        reader = csv.reader(upload.file)
        for row in reader:
            if not row:
                continue
            if len(row) != COLS:
                raise ValueError(f"Expected {COLS} columns, got {len(row)}")

            # update running max
            for s in row:
                v = int(s)
                if current_max is None or v > current_max:
                    current_max = v

            for s in row:
                v = int(s)
                total_cells_in_window += 1
                if v > contact_threshold:  
                    active_cells_in_window += 1        

            lines_in_frame += 1

            if lines_in_frame == LINES_PER_FRAME:
                lines_in_frame = 0
                frames_in_window += 1

                if frames_in_window == frames_per_full_window:
                    flush_window(frames_in_window)

        
        flush_window(frames_in_window)

        if windows:
            SessionWindow.objects.bulk_create(windows, batch_size=batch_size)

    finally:
        upload.file.close()



class SessionWindowPointSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(source="window_start_time")
    risk_score = serializers.FloatField(source="risk_score_contribution")

    class Meta:
        model = SessionWindow
        fields = [
            "timestamp",
            "window_index",
            "ppi_raw",
            "contact_area_pct",
            "risk_score",
            "is_high_pressure",
        ]


class PressureAlertSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.ChoiceField(choices=["info", "warning", "critical"])
    title = serializers.CharField()
    message = serializers.CharField()
    timestamp = serializers.DateTimeField()
    window_index = serializers.IntegerField(required=False)
    ppi_raw = serializers.IntegerField(required=False)
    contact_area_pct = serializers.FloatField(required=False)
    risk_score = serializers.FloatField(required=False)




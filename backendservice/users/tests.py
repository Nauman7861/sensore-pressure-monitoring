"""Authentication and role-based access control tests.

Run with:  python manage.py test users --settings=backendservice.settings_test
"""
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ClinicianPatientAssignment, PatientProfile, PressureRawUpload, User

PASSWORD = "Str0ng-Passw0rd!"
TMP_MEDIA = tempfile.mkdtemp()


def make_user(role, n):
    return User.objects.create_user(
        email=f"{role}{n}@example.com", username=f"{role}{n}", password=PASSWORD,
        first_name=role.title(), last_name=str(n), role=role,
    )


def one_frame_csv():
    rows = "\n".join(",".join(["5"] * 32) for _ in range(32)) + "\n"
    return SimpleUploadedFile("frame.csv", rows.encode(), content_type="text/csv")


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class RBACTestBase(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP_MEDIA, ignore_errors=True)

    def setUp(self):
        self.admin = make_user("admin", 1)
        self.doc_a = make_user("clinician", 1)
        self.doc_b = make_user("clinician", 2)
        self.patient = make_user("patient", 1)
        self.other_patient = make_user("patient", 2)
        ClinicianPatientAssignment.objects.create(clinician=self.doc_a, patient=self.patient)
        ClinicianPatientAssignment.objects.create(clinician=self.doc_b, patient=self.other_patient)
        PressureRawUpload.objects.create(patient=self.patient, file=one_frame_csv())

    def login_as(self, user):
        self.client.force_authenticate(user=user)

    def assertDeniedAnonymous(self, res, msg=None):
        # 401 with JWT, 403 when SessionAuthentication answers first; both mean "no access"
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN), msg)


class AuthenticationTests(RBACTestBase):
    def login(self, email, password, role):
        return self.client.post("/api/token", {"email": email, "password": password, "role": role}, format="json")

    def test_login_with_correct_credentials_returns_tokens_and_role(self):
        res = self.login(self.patient.email, PASSWORD, "patient")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["role"], "patient")

    def test_login_with_wrong_password_is_rejected(self):
        res = self.login(self.patient.email, "wrong-password", "patient")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_wrong_role_is_rejected(self):
        res = self.login(self.patient.email, PASSWORD, "admin")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_blacklists_refresh_token(self):
        refresh = RefreshToken.for_user(self.patient)
        self.login_as(self.patient)
        res = self.client.post("/api/logout/", {"refresh": str(refresh)}, format="json")
        self.assertEqual(res.status_code, status.HTTP_205_RESET_CONTENT)

        self.client.force_authenticate(user=None)
        reuse = self.client.post("/api/token/refresh/", {"refresh": str(refresh)}, format="json")
        self.assertEqual(reuse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_requires_login(self):
        self.assertDeniedAnonymous(self.client.get("/api/user/"))
        self.assertDeniedAnonymous(self.client.get("/api/pressure/latest-heatmap/"))


class AccountManagementTests(RBACTestBase):
    new_patient = {
        "username": "newpatient", "first_name": "New", "last_name": "Patient",
        "email": "new.patient@example.com", "role": "patient", "password": PASSWORD,
    }

    def test_anonymous_users_cannot_create_accounts(self):
        for url in ("/api/user/register/", "/api/user/adminregister/"):
            res = self.client.post(url, {**self.new_patient, "role": "admin"}, format="json")
            self.assertDeniedAnonymous(res, url)
        self.assertFalse(User.objects.filter(email=self.new_patient["email"]).exists())

    def test_non_admins_cannot_create_accounts(self):
        self.login_as(self.doc_a)
        res = self.client.post("/api/user/adminregister/", self.new_patient, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_creates_patient_with_clinician_and_device(self):
        self.login_as(self.admin)
        payload = {**self.new_patient, "clinician": self.doc_a.id, "mat_device_id": "MAT-001"}
        res = self.client.post("/api/user/adminregister/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        user = User.objects.get(email=self.new_patient["email"])
        self.assertTrue(user.check_password(PASSWORD))
        self.assertTrue(ClinicianPatientAssignment.objects.filter(clinician=self.doc_a, patient=user).exists())
        self.assertEqual(PatientProfile.objects.get(user=user).mat_device_id, "MAT-001")

    def test_admin_creates_clinician_who_can_log_in(self):
        self.login_as(self.admin)
        payload = {**self.new_patient, "email": "dr.new@example.com", "username": "drnew", "role": "clinician"}
        self.assertEqual(self.client.post("/api/user/adminregister/", payload, format="json").status_code, 201)
        self.client.force_authenticate(user=None)
        res = self.client.post(
            "/api/token", {"email": "dr.new@example.com", "password": PASSWORD, "role": "clinician"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_admin_updates_user_and_password_is_hashed(self):
        self.login_as(self.admin)
        res = self.client.patch(
            f"/api/users/{self.patient.id}/", {"first_name": "Updated", "password": "N3w-Passw0rd!"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.first_name, "Updated")
        self.assertTrue(self.patient.check_password("N3w-Passw0rd!"))

    def test_only_admins_can_list_update_or_delete_users(self):
        self.client.force_authenticate(user=None)
        self.assertDeniedAnonymous(self.client.get("/api/users/"))
        for user in (self.patient, self.doc_a):
            self.login_as(user)
            self.assertEqual(self.client.get("/api/users/").status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(
                self.client.patch(f"/api/users/{self.admin.id}/", {"role": "patient"}, format="json").status_code,
                status.HTTP_403_FORBIDDEN,
            )
            self.assertEqual(
                self.client.delete(f"/api/users/{self.other_patient.id}/").status_code, status.HTTP_403_FORBIDDEN
            )
        self.login_as(self.admin)
        self.assertEqual(self.client.get("/api/users/").status_code, status.HTTP_200_OK)

    def test_only_admins_can_upload_pressure_data(self):
        self.login_as(self.patient)
        res = self.client.post(
            "/api/pressure/raw-uploads/", {"patient": self.patient.id, "file": one_frame_csv()}, format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class PatientAccessTests(RBACTestBase):
    def test_clinician_sees_only_assigned_patients(self):
        self.login_as(self.doc_a)
        res = self.client.get("/api/clinician/patients/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([p["id"] for p in res.data], [self.patient.id])

    def test_admin_sees_all_patients_for_uploads(self):
        self.login_as(self.admin)
        ids = {p["id"] for p in self.client.get("/api/clinician/patients/").data}
        self.assertEqual(ids, {self.patient.id, self.other_patient.id})

    def test_patient_cannot_list_patients(self):
        self.login_as(self.patient)
        self.assertEqual(self.client.get("/api/clinician/patients/").status_code, status.HTTP_403_FORBIDDEN)

    def test_assigned_clinician_can_view_patient_heatmap(self):
        self.login_as(self.doc_a)
        res = self.client.get("/api/pressure/clinician-heatmap/", {"patient_id": self.patient.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_frames"], 1)

    def test_unassigned_clinician_is_blocked_from_patient_data(self):
        self.login_as(self.doc_b)
        for url in (
            "/api/pressure/clinician-heatmap/",
            "/api/pressure/latest-heatmap/",
            "/api/pressure/windows/",
            "/api/pressure/alerts/",
        ):
            res = self.client.get(url, {"patient_id": self.patient.id})
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, url)
        res = self.client.get(f"/api/feedback/patient/{self.patient.id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_sees_own_data(self):
        self.login_as(self.patient)
        res = self.client.get("/api/pressure/latest-heatmap/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["frame"]), 32)

    def test_patient_cannot_fetch_another_patients_data(self):
        self.login_as(self.other_patient)
        res = self.client.get("/api/pressure/latest-heatmap/", {"patient_id": self.patient.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_read_clinical_data(self):
        self.login_as(self.admin)
        res = self.client.get("/api/pressure/latest-heatmap/", {"patient_id": self.patient.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_numeric_patient_id_is_rejected_cleanly(self):
        self.login_as(self.doc_a)
        self.assertEqual(self.client.get("/api/feedback/patient/me/").status_code, status.HTTP_403_FORBIDDEN)
        res = self.client.get("/api/pressure/latest-heatmap/", {"patient_id": "abc"})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_feedback_goes_to_assigned_clinician(self):
        self.login_as(self.patient)
        res = self.client.post("/api/feedback/", {"message": "Lower back discomfort"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["clinician"], self.doc_a.id)

    def test_clinician_cannot_message_unassigned_patient(self):
        self.login_as(self.doc_b)
        res = self.client.post("/api/feedback/", {"message": "Hi", "patient": self.patient.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

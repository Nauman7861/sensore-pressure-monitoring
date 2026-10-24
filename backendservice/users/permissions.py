"""Role-based access control for the Sensore API.

Roles live on ``User.role`` ('admin', 'clinician' or 'patient').

* Admins manage accounts and upload data, but do not read clinical data.
* Clinicians read data only for patients actively assigned to them.
* Patients read only their own data.
"""
from rest_framework.permissions import BasePermission

from .models import ClinicianPatientAssignment

ADMIN, CLINICIAN, PATIENT = "admin", "clinician", "patient"


def _role(user):
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "role", None)


class HasRole(BasePermission):
    """Base class: allow authenticated users whose role is in ``allowed_roles``."""

    allowed_roles: tuple = ()
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        return _role(request.user) in self.allowed_roles


class IsAdminRole(HasRole):
    allowed_roles = (ADMIN,)


class IsClinicianRole(HasRole):
    allowed_roles = (CLINICIAN,)


class IsPatientRole(HasRole):
    allowed_roles = (PATIENT,)


class IsAdminOrClinician(HasRole):
    allowed_roles = (ADMIN, CLINICIAN)


class IsClinicianOrPatient(HasRole):
    allowed_roles = (CLINICIAN, PATIENT)


def is_assigned(clinician, patient) -> bool:
    """True if the clinician has an active assignment to the patient."""
    return ClinicianPatientAssignment.objects.filter(
        clinician=clinician, patient=patient, is_active=True
    ).exists()


def can_view_patient_data(user, patient) -> bool:
    """Single rule for clinical data: patients see themselves, clinicians see assigned patients."""
    role = _role(user)
    if patient is None or role is None:
        return False
    if role == PATIENT:
        return patient.pk == user.pk
    if role == CLINICIAN:
        return is_assigned(user, patient)
    return False  # admins manage the system, not clinical records

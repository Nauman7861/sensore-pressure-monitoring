
# models.py
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import django.utils
from django.conf import settings


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields): 
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        # Pop conflicting fields AbstractUser sets automatically
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('is_active', True)
        
        # Create user instance
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin')  # so `createsuperuser` can use the admin dashboard
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('clinician', 'Clinician'),
        ('admin', 'Admin'),
    ]
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=30, default='')
    last_name = models.CharField(max_length=30, default='')
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='patient')

    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=django.utils.timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='user_set',  
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='user_set',  
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )
    
    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.username} ({self.role})"


class PatientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    mat_device_id = models.CharField(max_length=50, unique=True)
    contact_threshold_raw = models.IntegerField(default=80)
    ppi_alert_threshold_raw = models.IntegerField(default=300)
    risk_score_high_threshold = models.FloatField(default=6.0)
    created_at = models.DateTimeField(auto_now_add=True)

class ClinicianPatientAssignment(models.Model):
    clinician = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_patients')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_clinicians') 
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)  # Added
    
    class Meta:
        unique_together = ('clinician', 'patient')
        verbose_name_plural = "Clinician Patient Assignments"

       



class PressureRawUpload(models.Model):
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pressure_raw_uploads"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    recorded_at = models.DateTimeField(null=True, blank=True)
    fps = models.PositiveSmallIntegerField(default=14)

    rows = models.PositiveIntegerField(null=True, blank=True)  # e.g. 400000
    cols = models.PositiveSmallIntegerField(default=32)

    file = models.FileField(upload_to="pressure_raw/%Y/%m/%d/")
    original_name = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.patient_id} - {self.original_name or self.file.name}"
    



class SessionWindow(models.Model):
    upload = models.ForeignKey(
        PressureRawUpload, on_delete=models.CASCADE, related_name="windows"
    )
    window_index = models.PositiveIntegerField()
    window_start_time = models.DateTimeField()
    window_end_time = models.DateTimeField()

    ppi_raw = models.IntegerField()
    is_high_pressure = models.BooleanField()

    contact_area_pct = models.FloatField(default=0.0)
    risk_score_contribution = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["upload", "window_index"],
                name="uniq_upload_window_index",
            )
        ]   

class Alert(models.Model):
    session_window = models.ForeignKey(
        SessionWindow,
        on_delete=models.CASCADE,
        related_name="alerts"
    )
    patient = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.CharField(max_length=255)

    ppi_value = models.IntegerField()

    trigger_type = models.CharField(max_length=20)
    severity = models.CharField(max_length=10)
    risk_score = models.FloatField()

    is_active = models.BooleanField(default=True)

    # ✅ ADD THIS BACK
    resolved = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

# class Alert(models.Model):
#     SEVERITY_CHOICES = [
#         ('warning', 'Warning'),
#         ('critical', 'Critical'),
#     ]
#     TRIGGER_CHOICES = [
#         ('high_ppi', 'High Peak Pressure'),
#         ('sustained_risk', 'Sustained High Risk'),
#         ('rising_trend', 'Rising Risk Trend'),
#     ]
    
#     session_window = models.ForeignKey(SessionWindow, on_delete=models.CASCADE, null=True, blank=True)
#     session = models.ForeignKey(Session, on_delete=models.CASCADE)
#     patient = models.ForeignKey(User, on_delete=models.CASCADE)
#     trigger_type = models.CharField(max_length=20, choices=TRIGGER_CHOICES)
#     severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
#     ppi_at_trigger = models.IntegerField()
#     risk_score_at_trigger = models.FloatField()
#     message_plain = models.TextField()
#     created_at = models.DateTimeField(auto_now_add=True)
#     resolved = models.BooleanField(default=False)
#     resolved_at = models.DateTimeField(null=True, blank=True)

 
class FeedbackComment(models.Model):
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('clinician', 'Clinician'),
    ]

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_feedback_comments'
    )
    clinician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clinician_feedback_comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='authored_feedback_comments'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    message = models.TextField()
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.author.username} - {self.role}'
from django import views
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from users.views import ComparisonHeatmapView,UserDetailView, UserListView, UserListView
from users.views import AdminCreateUserView, ClinicianHeatmapView, ClinicianListView, ClinicianPatientsView, CreateUserView, LatestHeatmapView, PressureAlertsView, PressureRawUploadView, PressureWindowSeriesView, SecureTokenView, current_user, FeedbackCommentsView, FeedbackReplyCreateView
from users.views import PatientFeedbackCreateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/feedback/', PatientFeedbackCreateView.as_view(), name='patient-feedback-create'),
    path('api/feedback/patient/<str:patient_id>/', FeedbackCommentsView.as_view(), name='clinician-patient-comments'),
    path('api/feedback/reply/', FeedbackReplyCreateView.as_view(), name='clinician-feedback-reply'),
    path('api/user/register/', CreateUserView.as_view(), name='register'),
    path('api/user/adminregister/', AdminCreateUserView.as_view(), name='admin_register'),
    # path('api/token', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/users/clinicians/', ClinicianListView.as_view(), name='clinician-list'),
    path('api/token', SecureTokenView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/user/', current_user, name='current_user'),
    path('api-auth/', include('rest_framework.urls')),
    path('api/', include('users.urls')),
    path("api/pressure/raw-uploads/", PressureRawUploadView.as_view()),
    path('api/clinician/patients/', ClinicianPatientsView.as_view(), name='clinician-patients'),
    path("api/pressure/latest-heatmap/", LatestHeatmapView.as_view(), name="latest-heatmap"),
    path("api/pressure/clinician-heatmap/", ClinicianHeatmapView.as_view(), name="clinician-heatmap"),
    path("api/pressure/windows/", PressureWindowSeriesView.as_view(), name="pressure-windows"),
    path("api/pressure/alerts/", PressureAlertsView.as_view(), name="pressure-alerts"),
    path('api/pressure/comparison-heatmap/', ComparisonHeatmapView.as_view(), name='comparison-heatmap'),
    path('api/users/', UserListView.as_view()),
    path('api/users/<int:pk>/', UserDetailView.as_view()),
   

]





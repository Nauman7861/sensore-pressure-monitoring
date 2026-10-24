from django.urls import path
from . import views
from users.views import (
    LogoutView, 
    SecureTokenView, 
    FeedbackCommentsView, 
    FeedbackReplyCreateView,
    PressureRawUploadView, 
    UserDetailView,

)
from rest_framework_simplejwt.views import TokenRefreshView
path('api/feedback/patient/<int:patient_id>/', FeedbackCommentsView.as_view(), name='feedback-comments'),
path('api/feedback/reply/', FeedbackReplyCreateView.as_view(), name='feedback-reply'),
urlpatterns = [
    # --- Authentication ---
    # Login: React sends username/password here to get a Token
    path('login/', SecureTokenView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),

    # --- Password Reset ---
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),

    # --- Data & Operations ---
    # For the "Select Patient" dropdown in your UI
    path('api/users/<int:pk>/', UserDetailView.as_view()),
    
    # For the "Upload Pressure Data" button
    path('upload-pressure/', PressureRawUploadView.as_view(), name='pressure_upload'),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.views import GetAllStudents, RegisterView
from .views import UserViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('get-students/', GetAllStudents.as_view(), name='get_students'),
]
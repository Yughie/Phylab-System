from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.views import GetAllStudents, RegisterView, LoginView
from .views import UserViewSet, InventoryItemViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'inventory', InventoryItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('get-students/', GetAllStudents.as_view(), name='get_students'),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.views import GetAllStudents, RegisterView, LoginView
from .views import UserViewSet, InventoryItemViewSet, UserReviewViewSet
from .views import SupabaseConfigView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'inventory', InventoryItemViewSet)
router.register(r'reviews', UserReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('get-students/', GetAllStudents.as_view(), name='get_students'),
    path('supabase-config/', SupabaseConfigView.as_view(), name='supabase_config'),
]
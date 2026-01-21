from rest_framework import viewsets
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, InventoryItemSerializer
from .models import InventoryItem
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
import os

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('name')
    serializer_class = InventoryItemSerializer
    lookup_field = 'id'
    # Allow public GET/POST for now (frontend will post updates)
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_context(self):
        # Ensure serializer can build absolute image URLs
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context


class SupabaseConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        data = {
            'supabase_url': getattr(settings, 'SUPABASE_URL', '') or os.environ.get('SUPABASE_URL', ''),
            'supabase_anon_key': getattr(settings, 'SUPABASE_ANON_KEY', '') or os.environ.get('SUPABASE_ANON_KEY', ''),
            'storage_bucket': (
                getattr(settings, 'SUPABASE_BUCKET_NAME', '')
                or os.environ.get('SUPABASE_BUCKET_NAME', '')
                or os.environ.get('STORAGE_BUCKET', '')
                or os.environ.get('SUPABASE_STORAGE_BUCKET', '')
            )
        }
        return Response(data)
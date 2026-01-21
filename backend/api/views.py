from rest_framework import viewsets
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, InventoryItemSerializer
from .models import InventoryItem
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework import status
from django.conf import settings
import requests
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=True, methods=['post'])
    def set_stock(self, request, id=None):
        """Set the absolute stock for a specific inventory item by id.

        POST /api/inventory/{id}/set_stock/  { "stock": 3 }
        """
        item = self.get_object()
        stock = request.data.get('stock')
        if stock is None:
            return Response({'detail': 'stock required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            stock_val = int(stock)
        except (TypeError, ValueError):
            return Response({'detail': 'invalid stock'}, status=status.HTTP_400_BAD_REQUEST)
        item.stock = stock_val
        item.save()
        item.save()
        # attempt to sync to Supabase table if configured
        try:
            self._sync_item_to_supabase(item)
        except Exception:
            pass
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def set_stock_by_key(self, request):
        """Set the absolute stock for an item identified by `item_key`.

        POST /api/inventory/set_stock_by_key/  { "item_key": "resistor_1k", "stock": 5 }
        """
        item_key = request.data.get('item_key') or request.data.get('itemKey')
        stock = request.data.get('stock')
        if not item_key:
            return Response({'detail': 'item_key required'}, status=status.HTTP_400_BAD_REQUEST)
        if stock is None:
            return Response({'detail': 'stock required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            stock_val = int(stock)
        except (TypeError, ValueError):
            return Response({'detail': 'invalid stock'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = InventoryItem.objects.get(item_key=item_key)
        except InventoryItem.DoesNotExist:
            return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)
        item.stock = stock_val
        item.save()
        try:
            self._sync_item_to_supabase(item)
        except Exception:
            pass
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    def _sync_item_to_supabase(self, item, payload=None):
        """Patch the Supabase REST table row for this item using the service role key.

        Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from settings or env.
        Table name is taken from settings.SUPABASE_TABLE_NAME or defaults to 'inventory'.
        """
        supabase_url = getattr(settings, 'SUPABASE_URL', '') or os.environ.get('SUPABASE_URL')
        service_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        if not supabase_url or not service_key:
            return False
        table = getattr(settings, 'SUPABASE_TABLE_NAME', '') or os.environ.get('SUPABASE_TABLE_NAME', 'inventory')

        headers = {
            'Content-Type': 'application/json',
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Prefer': 'return=representation'
        }

        if payload is None:
            body = {
                'item_key': item.item_key,
                'name': item.name,
                'category': item.category,
                'stock': item.stock,
                'cabinet': item.cabinet,
                'description': item.description,
                'type': item.type,
                'use': item.use
            }
        else:
            body = payload

        # prefer match by id if available
        if getattr(item, 'id', None) is not None:
            url = f"{supabase_url.rstrip('/')}/rest/v1/{table}?id=eq.{item.id}"
        else:
            url = f"{supabase_url.rstrip('/')}/rest/v1/{table}?item_key=eq.{item.item_key}"

        resp = requests.patch(url, json=body, headers=headers, timeout=10)
        return resp.ok

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
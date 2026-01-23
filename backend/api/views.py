from rest_framework import viewsets
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, InventoryItemSerializer
from .serializers import UserReviewSerializer, BorrowRequestSerializer
from .models import InventoryItem, UserReview, BorrowRequest, BorrowRequestItem
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


class UserReviewViewSet(viewsets.ModelViewSet):
    """Endpoint for user-submitted reviews/feedback. Supports image upload."""
    queryset = UserReview.objects.filter(is_resolved=False).order_by('-created_at')
    serializer_class = UserReviewSerializer
    permission_classes = [AllowAny]
    # For development ease: disable default SessionAuthentication so CSRF isn't required
    # (In production, prefer token auth or ensure CSRF token is sent.)
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        # Let DRF handle validation including file upload
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark a review as resolved."""
        from django.utils import timezone
        review = self.get_object()
        review.is_resolved = True
        review.resolved_at = timezone.now()
        review.save()
        return Response({'status': 'resolved', 'id': review.id})

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context


class BorrowRequestViewSet(viewsets.ModelViewSet):
    """Endpoint for borrow requests. Students can create, admins can approve/reject."""
    queryset = BorrowRequest.objects.all().order_by('-created_at')
    serializer_class = BorrowRequestSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get_queryset(self):
        """Filter by status or student_id if provided."""
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status', None)
        student_id = self.request.query_params.get('student_id', None)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a borrow request and change status to 'borrowed'."""
        borrow_request = self.get_object()
        borrow_request.status = 'borrowed'
        borrow_request.save()
        return Response({'status': 'approved', 'request_id': borrow_request.request_id})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a borrow request."""
        borrow_request = self.get_object()
        borrow_request.status = 'rejected'
        
        # Optionally capture remark from admin
        remark = request.data.get('remark', '')
        remark_type = request.data.get('remark_type', '')
        if remark:
            borrow_request.admin_remark = remark
        if remark_type:
            borrow_request.remark_type = remark_type
        
        borrow_request.save()
        return Response({'status': 'rejected', 'request_id': borrow_request.request_id})
    
    @action(detail=True, methods=['post'])
    def mark_returned(self, request, pk=None):
        """Mark a borrowed item as returned."""
        borrow_request = self.get_object()
        borrow_request.status = 'returned'
        borrow_request.save()
        return Response({'status': 'returned', 'request_id': borrow_request.request_id})
    
    @action(detail=False, methods=['get'])
    def currently_borrowed(self, request):
        """Get all currently borrowed items (status='borrowed')."""
        borrowed_requests = BorrowRequest.objects.filter(status='borrowed').order_by('-created_at')
        serializer = self.get_serializer(borrowed_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_item_statuses(self, request, pk=None):
        """Update statuses of individual items within a borrow request.
        
        PATCH /api/borrow-requests/{id}/update_item_statuses/
        Body: { "items": [ { "id": 12, "status": "approved", "quantity": 2 }, ... ] }
        
        Updates only the items provided by id. Items not included remain unchanged.
        After updating, if all items are approved/rejected, the request status is updated accordingly.
        """
        borrow_request = self.get_object()
        items_data = request.data.get('items', [])
        
        if not items_data:
            return Response({'detail': 'items array required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update each item by id and collect approved items to create loan entries
        approved_items_to_create = []
        for item_update in items_data:
            item_id = item_update.get('id')
            if not item_id:
                continue
            try:
                item_obj = borrow_request.items.get(id=item_id)
                if 'status' in item_update:
                    item_obj.status = item_update['status']
                if 'quantity' in item_update:
                    item_obj.quantity = item_update['quantity']
                # support per-item admin remark fields
                if 'admin_remark' in item_update:
                    item_obj.admin_remark = item_update.get('admin_remark')
                if 'remark_type' in item_update:
                    item_obj.remark_type = item_update.get('remark_type')
                if 'remark_created_at' in item_update:
                    item_obj.remark_created_at = item_update.get('remark_created_at')

                item_obj.save()

                # If item was marked approved (or borrowed) create a loan entry for it
                if item_obj.status in ('approved', 'borrowed'):
                    approved_items_to_create.append(item_obj)
            except BorrowRequestItem.DoesNotExist:
                continue

        # For any approved items, create a new BorrowRequest representing the actual loan(s)
        # Group all approved items from this request into a single new BorrowRequest
        created_loans = []
        if approved_items_to_create:
            import uuid
            new_request_id = f"{borrow_request.request_id}-{uuid.uuid4().hex[:8]}"
            new_req = BorrowRequest.objects.create(
                request_id=new_request_id,
                student_name=borrow_request.student_name,
                student_id=borrow_request.student_id,
                email=borrow_request.email,
                teacher_name=borrow_request.teacher_name,
                purpose=borrow_request.purpose,
                borrow_date=borrow_request.borrow_date,
                return_date=borrow_request.return_date,
                status='borrowed',
            )
            for it in approved_items_to_create:
                BorrowRequestItem.objects.create(
                    borrow_request=new_req,
                    item_name=it.item_name,
                    item_key=it.item_key,
                    quantity=it.quantity,
                    status='borrowed',
                    item_image=it.item_image,
                )
            # serialize created loan to include in response
            created_loans.append(BorrowRequestSerializer(new_req, context={'request': request}).data)

        # Return updated original request and any created loan entries
        serializer = self.get_serializer(borrow_request)
        payload = {'original_request': serializer.data}
        if created_loans:
            payload['created_loans'] = created_loans
        return Response(payload)
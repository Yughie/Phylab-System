from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'id_number']


from .models import InventoryItem

from .models import UserReview
from .models import BorrowRequest, BorrowRequestItem


class InventoryItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = ['id', 'item_key', 'name', 'category', 'stock', 'cabinet', 'description', 'type', 'use', 'image', 'image_url']
        read_only_fields = ['image_url']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class UserReviewSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = UserReview
        fields = ['id', 'item_name', 'item_key', 'comment', 'image', 'image_url', 'submitted_by_name', 'submitted_by_email', 'created_at']
        read_only_fields = ['id', 'image_url', 'created_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class BorrowRequestItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BorrowRequestItem
        fields = ['id', 'item_name', 'item_key', 'quantity', 'item_image', 'status', 'admin_remark', 'remark_type', 'remark_created_at']
        read_only_fields = []


class BorrowRequestSerializer(serializers.ModelSerializer):
    items = BorrowRequestItemSerializer(many=True)
    
    class Meta:
        model = BorrowRequest
        fields = [
            'id', 'request_id', 'student_name', 'student_id', 'email',
            'teacher_name', 'purpose', 'borrow_date', 'return_date',
            'status', 'created_at', 'updated_at', 'admin_remark', 'remark_type',
            'items'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        borrow_request = BorrowRequest.objects.create(**validated_data)
        for item_data in items_data:
            BorrowRequestItem.objects.create(borrow_request=borrow_request, **item_data)
        return borrow_request
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update main request fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided (supports partial nested updates)
        if items_data is not None:
            # If items have 'id', update existing; otherwise replace all
            has_ids = any('id' in item for item in items_data)
            if has_ids:
                # Partial update: update existing items by id
                for item_data in items_data:
                    item_id = item_data.pop('id', None)
                    if item_id:
                        try:
                            item_obj = instance.items.get(id=item_id)
                            for key, val in item_data.items():
                                setattr(item_obj, key, val)
                            item_obj.save()
                        except BorrowRequestItem.DoesNotExist:
                            pass
            else:
                # Full replace: clear existing items and recreate
                instance.items.all().delete()
                for item_data in items_data:
                    BorrowRequestItem.objects.create(borrow_request=instance, **item_data)
        
        return instance
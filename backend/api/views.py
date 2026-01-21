from rest_framework import viewsets
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, InventoryItemSerializer
from .models import InventoryItem

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('name')
    serializer_class = InventoryItemSerializer
    lookup_field = 'id'
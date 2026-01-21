import os
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class AdminAccessKeyBackend(BaseBackend):
    def authenticate(self, request, access_key=None):
        # Check if the key matches the one in your .env
        if access_key == os.getenv('ADMIN_ACCESS_KEY'):
            # Return the first user who is marked as an admin
            return User.objects.filter(is_admin=True, is_superuser=True).first()
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
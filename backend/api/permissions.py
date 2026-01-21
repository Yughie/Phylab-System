import os
from rest_framework import permissions

class IsPhylabAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        # Check for the key in the header
        key = request.headers.get('X-Admin-Access-Key')
        return key == os.getenv('ADMIN_ACCESS_KEY')
from django.contrib import admin
from .models import User


@admin.register(User)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "id_number", "is_staff")
    search_fields = ("email", "full_name", "id_number")
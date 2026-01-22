from django.contrib import admin
from django.contrib import admin
from .models import InventoryItem

from .models import UserReview


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
	list_display = ('item_key', 'name', 'category', 'stock', 'cabinet')
	search_fields = ('item_key', 'name', 'cabinet')
	list_filter = ('category', 'cabinet')


@admin.register(UserReview)
class UserReviewAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'submitted_by_name', 'submitted_by_email', 'created_at')
    search_fields = ('item_name', 'submitted_by_name', 'submitted_by_email', 'comment')
    readonly_fields = ('created_at',)

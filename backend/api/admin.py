from django.contrib import admin
from django.contrib import admin
from .models import InventoryItem


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
	list_display = ('item_key', 'name', 'category', 'stock', 'cabinet')
	search_fields = ('item_key', 'name', 'cabinet')
	list_filter = ('category', 'cabinet')

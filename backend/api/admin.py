from django.contrib import admin
from django.contrib import admin
from .models import InventoryItem

from .models import UserReview
from .models import BorrowRequest, BorrowRequestItem


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
	list_display = ('item_key', 'name', 'category', 'stock', 'cabinet')
	search_fields = ('item_key', 'name', 'cabinet')
	list_filter = ('category', 'cabinet')


@admin.register(UserReview)
class UserReviewAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'submitted_by_name', 'submitted_by_email', 'created_at', 'is_resolved')
    search_fields = ('item_name', 'submitted_by_name', 'submitted_by_email', 'comment')
    list_filter = ('is_resolved', 'created_at')
    readonly_fields = ('created_at', 'resolved_at')


class BorrowRequestItemInline(admin.TabularInline):
    model = BorrowRequestItem
    extra = 0
    fields = ('item_name', 'item_key', 'quantity')


@admin.register(BorrowRequest)
class BorrowRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'student_name', 'student_id', 'status', 'borrow_date', 'return_date', 'created_at')
    search_fields = ('request_id', 'student_name', 'student_id', 'email', 'teacher_name')
    list_filter = ('status', 'borrow_date', 'return_date', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [BorrowRequestItemInline]
    fieldsets = (
        ('Student Information', {
            'fields': ('request_id', 'student_name', 'student_id', 'email')
        }),
        ('Request Details', {
            'fields': ('teacher_name', 'purpose', 'borrow_date', 'return_date', 'status')
        }),
        ('Admin Notes', {
            'fields': ('admin_remark', 'remark_type'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

from django.db import models

# Create your models here.


class InventoryItem(models.Model):
	item_key = models.CharField(max_length=100, unique=True)
	name = models.CharField(max_length=255)
	category = models.CharField(max_length=100, blank=True)
	stock = models.IntegerField(default=0)
	cabinet = models.CharField(max_length=100, blank=True)
	description = models.TextField(blank=True)
	type = models.CharField(max_length=100, blank=True)
	use = models.CharField(max_length=255, blank=True)
	image = models.ImageField(upload_to='inventory_images/', blank=True, null=True)

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"{self.name} ({self.item_key})"


class UserReview(models.Model):
	"""Stores user-submitted reviews/feedback about items."""
	item_name = models.CharField(max_length=255)
	item_key = models.CharField(max_length=150, blank=True, null=True)
	comment = models.TextField(blank=True)
	image = models.ImageField(upload_to='review_images/', blank=True, null=True)

	submitted_by_name = models.CharField(max_length=255, blank=True, null=True)
	submitted_by_email = models.CharField(max_length=255, blank=True, null=True)

	is_resolved = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	resolved_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f"Review {self.id} - {self.item_name} by {self.submitted_by_name or 'anonymous'}"


class BorrowRequest(models.Model):
	"""Stores borrowing requests from students."""
	STATUS_CHOICES = [
		('pending', 'Pending'),
		('approved', 'Approved'),
		('rejected', 'Rejected'),
		('borrowed', 'Borrowed'),
		('returned', 'Returned'),
	]
	
	request_id = models.CharField(max_length=50, unique=True, db_index=True)
	student_name = models.CharField(max_length=255)
	student_id = models.CharField(max_length=100)
	email = models.EmailField()
	teacher_name = models.CharField(max_length=255)
	purpose = models.TextField()
	borrow_date = models.DateField()
	return_date = models.DateField()
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
	
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	
	# Optional remark from admin when approving/rejecting
	admin_remark = models.TextField(blank=True, null=True)
	remark_type = models.CharField(max_length=50, blank=True, null=True)
	
	class Meta:
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['status', '-created_at']),
			models.Index(fields=['student_id', '-created_at']),
		]
	
	def __str__(self):
		return f"Request {self.request_id} - {self.student_name} ({self.status})"


class BorrowRequestItem(models.Model):
	"""Individual items in a borrow request."""
	STATUS_CHOICES = [
		('pending', 'Pending'),
		('approved', 'Approved'),
		('rejected', 'Rejected'),
		('borrowed', 'Borrowed'),
		('returned', 'Returned'),
	]
	
	borrow_request = models.ForeignKey(BorrowRequest, on_delete=models.CASCADE, related_name='items')
	item_name = models.CharField(max_length=255)
	item_key = models.CharField(max_length=150, blank=True, null=True)
	quantity = models.IntegerField(default=1)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
	
	# Track item image for display
	item_image = models.CharField(max_length=500, blank=True, null=True)

	# Admin remark specific to this item
	admin_remark = models.TextField(blank=True, null=True)
	remark_type = models.CharField(max_length=50, blank=True, null=True)
	remark_created_at = models.DateTimeField(null=True, blank=True)
	
	def __str__(self):
		return f"{self.item_name} x{self.quantity} ({self.status}) (Request {self.borrow_request.request_id})"

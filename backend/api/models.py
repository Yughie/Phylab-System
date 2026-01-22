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

	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f"Review {self.id} - {self.item_name} by {self.submitted_by_name or 'anonymous'}"

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

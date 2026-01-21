from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    full_name = models.CharField(max_length=255)
    id_number = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)

    is_admin = models.BooleanField(default=False)
    is_student = models.BooleanField(default=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]  # keep username if you want it; otherwise adjust

    def __str__(self):
        return self.email
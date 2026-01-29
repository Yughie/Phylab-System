"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connections


def health(request):
    """Simple health check endpoint.

    Returns JSON with overall status and database connectivity.
    """
    result = {"status": "ok"}
    try:
        conn = connections["default"]
        # simple lightweight check
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        result["database"] = "ok"
        status_code = 200
    except Exception as e:
        result["database"] = "error"
        result["database_error"] = str(e)
        result["status"] = "error"
        status_code = 500

    return JsonResponse(result, status=status_code)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('health/', health),
    
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

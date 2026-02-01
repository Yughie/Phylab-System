from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from accounts.models import User


# Serializer used for registration
class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['full_name', 'id_number', 'email', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        # Auto-generate username from email if not provided
        if not user.username:
            user.username = validated_data.get('email', '').split('@')[0]
        user.set_password(password)
        user.save()
        return user


# A quick way to turn User objects into JSON
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'id_number', 'email', 'is_student']


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # create token so client can auto-login
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'id': user.id,
                'email': user.email,
                'full_name': getattr(user, 'full_name', '') or user.get_full_name(),
                'id_number': getattr(user, 'id_number', ''),
                'token': token.key,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GetAllStudents(APIView):
    def get(self, request):
        students = User.objects.filter(is_student=True)
        serializer = UserSerializer(students, many=True)
        return Response(serializer.data)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')

        if not email or not password:
            return Response({'detail': 'Email and password required.'}, status=400)

        # Try authenticate using email as username (ModelBackend uses USERNAME_FIELD)
        user = authenticate(request, username=email, password=password)
        if user is None:
            # fallback: some backends accept email kwarg
            user = authenticate(request, email=email, password=password)

        if user is None:
            # fallback: try matching by id_number and verify password
            try:
                candidate = User.objects.filter(id_number__iexact=email).first()
                if candidate and candidate.check_password(password):
                    user = candidate
            except Exception:
                user = None

        if user is None:
            return Response({'detail': 'Invalid credentials.'}, status=400)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'id': user.id,
            'email': user.email,
            'full_name': getattr(user, 'full_name', '') or user.get_full_name(),
            'id_number': getattr(user, 'id_number', '')
        })
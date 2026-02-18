# Python imports
import secrets
from datetime import timedelta
from typing import Tuple

# Django imports
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.models import Group
from django.db.models import QuerySet
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils import timezone

# External imports
import jwt
from jwt import decode as jwt_decode
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND,
)
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

# App imports
from umaboy.constant import GET, POST, PUT
from umaboy.models import Organization, User, UserOrganizationPermission

# Local Imports
from user.constant import (
    FORGOT_EMAIL_SUBJECT,
    FORGOT_PASSWORD_TOKEN_EXPIRE_TIME,
    OTP_VERIFICATION_EMAIL_SUBJECT,
    WELCOME_EMAIL_SUBJECT,
)
from user.logger import UserLogger as Logger
from user.serializers import (
    AddUserInOrganizationSerializer,
    EditUserInOrganizationSerializer,
    LoginSerializer,
    OrganizationSerializer,
    OtpSerializer,
    RequestEmailSerializer,
    SetPasswordSerializer,
    SignupSerializer,
    UserProfileEditSerializer,
    UserProfileSerializer,
)
from user.typing import EmailData
from user.utils import send_email, send_google_chat_notification

# Local imports
from .permissions import AccountManager


class UserAuthViewset(ModelViewSet):
    permission_classes = [AllowAny]
    http_method_names = [POST, GET, PUT]
    serializer_class = SignupSerializer

    def register(self: "UserAuthViewset", request: Request) -> Response:
        """
        Handle user registration.
        """
        common_info_logger = {
            "function": "register",
        }
        groups = Group.objects.all().values_list("id", flat=True)
        group_names = Group.objects.all().values_list("name", flat=True)
        serializer = SignupSerializer(
            data=request.data,
            context={"request": request, "groups": groups, "group_names": group_names},
        )
        serializer.is_valid(raise_exception=True)
        user: User = serializer.save()

        refresh = RefreshToken.for_user(user)
        otp, expiration_time = self._generate_otp()
        self._set_user_otp(user, otp, expiration_time)
        Logger.info(
            {
                "message": "User registered",
                "user_id": user.id,
                "email": user.email,
            }
            | common_info_logger
        )
        self._send_otp_email(user, otp)
        registration_message = (
            "🟢 *New User Registered*\n"
            "----------------------------------\n"
            f"📧 *Email:* `{user.email}`\n"
            f"👤 *Username:* {user.username}\n"
            f"📅 *Joined:* {user.date_joined.strftime('%Y-%m-%d %H:%M')}\n"
            "----------------------------------"
        )
        send_google_chat_notification(
            webhook_url=settings.CUSTOMER_ALERT_WEBHOOK_URL,
            message=registration_message,
        )
        return Response(
            {
                "message": "User registered",
                "payload": {
                    "user_id": user.id,
                    "email": user.email,
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),  # type: ignore[attr-defined]
                },
            },
            status=HTTP_201_CREATED,
        )

    def verify_user(self: "UserAuthViewset", request: Request) -> Response:
        """
        Validate the OTP for the user.
        """
        common_info_logger = {
            "function": "verify_user",
        }
        email = request.data.get("email")
        data_check = User.objects.filter(email=email).first()
        if not data_check:
            Logger.info(
                {
                    "message": "User not found",
                    "email": email,
                }
                | common_info_logger
            )
            return Response({"error": "User not found."}, status=HTTP_404_NOT_FOUND)

        serializer = OtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        Logger.info(
            {"message": "User verified", "email": user.email} | common_info_logger
        )
        return Response({"message": "User verified"}, status=HTTP_200_OK)

    def login(self: "UserAuthViewset", request: Request) -> Response:
        """
        Handle user login.
        """
        common_info_logger = {
            "function": "login",
        }
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user: User = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        Logger.info(
            {
                "message": "Logged in",
                "user_email": user.email,
            }
            | common_info_logger
        )
        login_message = (
            "🔑 *User Login*\n"
            "----------------------------------\n"
            f"👤 *Name:* {user.get_full_name() or user.username}\n"
            f"📧 *User:* `{user.email}`\n"
            f"🆔 *ID:* `{user.id}`\n"
            "----------------------------------\n"
        )
        send_google_chat_notification(
            webhook_url=settings.CUSTOMER_ALERT_WEBHOOK_URL,
            message=login_message,
        )

        connected_organizations = [
            {"id": org.id, "name": org.name} for org in user.organizations.all()
        ]
        selected_organization = (
            {
                "id": user.selected_organization.id,
                "name": user.selected_organization.name,
            }
            if user.selected_organization
            else None
        )

        return Response(
            {
                "message": "Logged in",
                "payload": {
                    "id": user.id,
                    "username": user.username,
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),  # type: ignore[attr-defined]
                    "email": user.email,
                    "organization": connected_organizations,
                    "selected_organization": selected_organization,
                },
            },
            status=HTTP_200_OK,
        )

    def send_otp(self: "UserAuthViewset", request: Request) -> Response:
        """
        Send mail for forgot password.
        """
        common_info_logger = {
            "function": "send_otp",
        }
        serializer = RequestEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.validated_data
        otp, expiration_time = self._generate_otp()
        self._set_user_otp(user, otp, expiration_time)
        self._send_otp_email(user, otp)

        Logger.info(
            {
                "message": "mail Sent to {user.email} for otp.",
                "email": user.email,
            }
            | common_info_logger
        )
        return Response({"message": "Mail sent successfully"}, status=HTTP_200_OK)

    def send_forgot_password_mail(
        self: "UserAuthViewset", request: Request
    ) -> Response:
        """
        Send mail for forgot password.
        """
        common_info_logger = {
            "function": "send_forgot_password_mail",
        }
        serializer = RequestEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.validated_data
        token = AccessToken.for_user(user)
        token.set_exp(lifetime=timedelta(minutes=FORGOT_PASSWORD_TOKEN_EXPIRE_TIME))
        self._send_forgot_password_email(user, user.email, token)

        Logger.info(
            {
                "message": "mail Sent to {user.email} for forgot password.",
                "email": user.email,
            }
            | common_info_logger
        )
        return Response({"message": "Mail sent successfully"}, status=HTTP_200_OK)

    def set_password(self: "UserAuthViewset", request: Request, token: str) -> Response:
        """
        Set password for user using render and Django messages for errors.
        """
        common_info_logger = {
            "function": "set_password",
        }

        if request.method == "GET":
            Logger.info({"message": "Get request", "token": token} | common_info_logger)
            return render(
                request, "setpassword.html", {"token": token, "show_form": True}
            )

        try:
            decoded_token = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = decoded_token.get("user_id")
        except jwt.ExpiredSignatureError:
            Logger.error(
                {"message": "Expired token", "error": "Token has expired"}
                | common_info_logger
            )
            messages.error(request, "Token has expired.")
            return render(
                request, "setpassword.html", {"token": token, "show_form": False}
            )

        get_user = User.objects.filter(id=user_id).first()
        if not get_user:
            Logger.info(
                {"message": "User not found", "user_id": user_id} | common_info_logger
            )
            messages.error(request, "User not found.")
            return render(
                request, "setpassword.html", {"token": token, "show_form": False}
            )

        serializer = SetPasswordSerializer(
            data=request.data, context={"user": get_user}
        )
        if not serializer.is_valid():
            Logger.error(
                {
                    "message": "Validation error",
                    "error": serializer.errors,
                }
                | common_info_logger
            )
            for field in ["non_field_errors", "password", "confirm_password"]:
                if field in serializer.errors:
                    messages.error(request, serializer.errors[field][0])
            return render(
                request, "setpassword.html", {"token": token, "show_form": True}
            )

        user: User = serializer.save()

        Logger.info(
            {
                "message": "User password set successfully",
                "user_id": user.id,
                "email": user.email,
            }
        )
        return HttpResponseRedirect(settings.DASHBOARD_URL)

    def profile(self: "UserAuthViewset", request: Request) -> Response:
        """
        Get user profile.
        """
        user_details = User.objects.filter(id=request.user.id).first()
        serializer = UserProfileSerializer(user_details)
        Logger.info(
            {
                "message": "User profile retrieved",
                "user_id": request.user.id,
                "funcation": "User_profile",
            }
        )
        return Response(serializer.data, status=HTTP_200_OK)

    def edit_profile(self: "UserAuthViewset", request: Request) -> Response:
        """
        Edit user profile.
        """
        serializer = UserProfileEditSerializer(instance=request.user, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {"message": "profile updated successfully."}, status=HTTP_200_OK
        )

    def _generate_otp(self: "UserAuthViewset") -> Tuple[str, timezone]:
        """
        Generate a one-time password (OTP) and its expiration time.
        This method is private and should not be accessed directly from outside the class.
        """
        otp = str(secrets.randbelow(90000) + 10000)
        expiration_time = timezone.now() + timedelta(minutes=10)
        return otp, expiration_time

    def _send_otp_email(self: "UserAuthViewset", user: User, otp: str) -> None:
        """
        Private method to send OTP email.
        """
        context = {
            "user": user,
            "otp": otp,
        }
        email_content = render_to_string("otp.html", context)
        email_data = EmailData(
            sender_email=settings.SENDER_EMAIL,
            sender_password=settings.SENDER_PASSWORD,
            receiver_email=user.email,
            subject=OTP_VERIFICATION_EMAIL_SUBJECT,
            html=email_content,
        )

        return send_email(email_data)

    def _set_user_otp(
        self: "UserAuthViewset", user: User, otp: str, expiration_time: timezone
    ) -> None:
        """
        Set the OTP and its expiration time for the user.
        """
        user.otp = otp
        user.otp_expiration_time = expiration_time
        user.save()

    def _send_forgot_password_email(
        self: "UserAuthViewset", user: User, email: str, token: str
    ) -> None:
        """
        Private method to send forgot password email.
        """
        context = {
            "email": email,
            "token": token,
            "server_url": settings.SERVER_URL,
        }
        email_content = render_to_string("forgotpassword.html", context)
        email_data = EmailData(
            sender_email=settings.SENDER_EMAIL,
            sender_password=settings.SENDER_PASSWORD,
            receiver_email=user.email,
            subject=FORGOT_EMAIL_SUBJECT,
            html=email_content,
        )

        return send_email(email_data)


class AddUserInOrganizationViewset(ModelViewSet):
    permission_classes = [AccountManager]

    def add_organization_user(
        self: "AddUserInOrganizationViewset", request: Request
    ) -> Response:
        """
        Add user in organization.
        """
        common_info_logger = {
            "user": request.user,
            "function": "add_organization_user",
        }
        serializer = AddUserInOrganizationSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.save()

        Logger.info(
            {
                "message": "User added in organization",
                "user_id": user.id,
                "email": user.email,
            }
            | common_info_logger
        )
        token = AccessToken.for_user(user)
        token.set_exp(lifetime=timedelta(days=365 * 100))
        self._send_welcome_email(
            user, user.id, user.email, user.username, user.groups, token
        )
        return Response(
            {
                "message": "User invited in organization",
            },
            status=HTTP_201_CREATED,
        )

    def _send_welcome_email(
        self: "AddUserInOrganizationViewset",
        user: User,
        id: int,
        email: str,
        username: str,
        groups: QuerySet,
        token: str,
    ) -> None:
        """
        Private method to send Welcome email.
        """
        group_names = [group.name for group in groups.all()]
        if len(group_names) > 1:
            formatted_group_names = (
                ", ".join(group_names[:-1]) + " and " + group_names[-1]
            )
        elif group_names:
            formatted_group_names = group_names[0]
        else:
            formatted_group_names = "No groups"

        context = {
            "token": token,
            "user": user,
            "id": id,
            "email": email,
            "username": username,
            "group_names": formatted_group_names,
            "server_url": settings.SERVER_URL,
        }
        email_content = render_to_string("welcome.html", context)
        email_data = EmailData(
            sender_email=settings.SENDER_EMAIL,
            sender_password=settings.SENDER_PASSWORD,
            receiver_email=user.email,
            subject=WELCOME_EMAIL_SUBJECT,
            html=email_content,
        )

        return send_email(email_data)

    def edit_organization_user_permission(
        self: "AddUserInOrganizationViewset", request: Request, user_id: int
    ) -> Response:
        """
        Edit user in organization.
        """
        user = User.objects.filter(pk=user_id).first()
        if user is None:
            return Response({"error": "User not found."}, status=HTTP_404_NOT_FOUND)

        user_permission = UserOrganizationPermission.objects.filter(
            user=user, organization=request.user.selected_organization
        ).first()
        if user_permission is None:
            return Response(
                {"error": "User not found in the organization."},
                status=HTTP_404_NOT_FOUND,
            )

        serializer = EditUserInOrganizationSerializer(
            instance=user,
            data=request.data,
            context={"user_permission": user_permission},
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response({"message": "User updated successfully."}, status=HTTP_200_OK)

    def remove_user_from_organization(
        self: "AddUserInOrganizationViewset", request: Request, user_id: str
    ) -> Response:
        """
        Remove a user from the organization.
        """
        user_to_remove = User.objects.filter(id=user_id).first()
        if not user_to_remove:
            return Response({"message": "User not Found"}, status=HTTP_404_NOT_FOUND)

        if not request.user.selected_organization.user.filter(id=user_id).exists():
            return Response(
                {"error": "User not found in the organization."},
                status=HTTP_404_NOT_FOUND,
            )

        request.user.selected_organization.user.remove(user_to_remove)
        UserOrganizationPermission.objects.filter(user=user_id).update(is_deleted=True)
        user_to_remove.is_verified = False
        user_to_remove.save()

        return Response(
            {"message": "User removed from organization successfully."},
            status=HTTP_200_OK,
        )

    def show_organization_users(
        self: "AddUserInOrganizationViewset", request: Request
    ) -> Response:
        organization_user = request.user
        organization = Organization.objects.filter(user=organization_user).first()
        if not organization:
            return Response(
                {"error": "Organization not found."}, status=HTTP_404_NOT_FOUND
            )
        organization_all_users = UserOrganizationPermission.objects.filter(
            organization=organization
        ).select_related("user")
        users_data = [
            {
                "id": permission.user.id,
                "email": permission.user.email,
                "username": permission.user.username,
                "name": permission.user.name,
                "is_invited": permission.is_invited,
                "groups": [group.name for group in permission.groups.all()],
            }
            for permission in organization_all_users
        ]

        return Response(
            {
                "message": "Organization users retrieved",
                "users": users_data,
            },
            status=HTTP_200_OK,
        )

    def update_organization_details(
        self: "AddUserInOrganizationViewset", request: Request
    ) -> Response:
        """
        Update organization details.
        """
        organization = Organization.objects.filter(user=request.user).first()

        serializer = OrganizationSerializer(
            instance=organization, data=request.data, partial=True
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {"message": "Organization details updated successfully."},
            status=HTTP_200_OK,
        )

    def get_organization_details(
        self: "AddUserInOrganizationViewset", request: Request
    ) -> Response:
        """Fetch a single organization for the logged-in user."""
        organization = Organization.objects.filter(user=request.user).first()
        serializer = OrganizationSerializer(organization)
        return Response(serializer.data, status=HTTP_200_OK)

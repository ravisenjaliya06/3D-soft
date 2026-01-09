# Python imports
import secrets
from datetime import timedelta
from typing import Tuple

# Django imports
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.models import Group
from django.db.models import QuerySet
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

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
    HTTP_403_FORBIDDEN,
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
from user.utils import send_email

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
        # common_info_logger = {
        #     "function": "register",
        # }
        groups = Group.objects.all().values_list("id", flat=True)
        group_names = Group.objects.all().values_list("name", flat=True)
        serializer = SignupSerializer(
            data=request.data,
            context={"request": request, "groups": groups, "group_names": group_names},
        )
        serializer.is_valid(raise_exception=True)
        user: User = serializer.save()

        # refresh = RefreshToken.for_user(user)
        user.is_verified = False
        user.save()

        # generate admin approval token
        # approval_token = self._generate_approval_token(user)

        # send approval mail to admin
        # self._send_admin_approval_email(user, approval_token)

        Logger.info(
            {
                "message": "User registered, waiting for admin approval",
                "user_id": user.id,
                "email": user.email,
            }
        )

        return Response(
            {
                "message": "User Registration Is Successful. Wait For Admin Approval.",
                "payload": {
                    "user_id": user.id,
                    "email": user.email,
                    # "refresh": str(refresh),
                    # "access": str(refresh.access_token),  # type: ignore[attr-defined]
                },
            },
            status=HTTP_201_CREATED,
        )

    # @action(detail=False, methods=["GET"], url_path="approveuser")
    # def approve_user(self: "UserAuthViewset", request: Request) -> Response:
    #     token = request.query_params.get("token")

    #     if not token:
    #         return Response({"error": "Token missing"}, status=400)

    #     try:
    #         decoded = AccessToken(token)
    #         if not decoded.get("approval"):
    #             return Response({"error": "Invalid token"}, status=400)

    #         user_id = decoded["user_id"]
    #     except Exception:
    #         return Response({"error": "Invalid or expired token"}, status=400)

    #     user = User.objects.filter(id=user_id).first()
    #     if not user:
    #         return Response({"error": "User not found"}, status=404)

    #     user.is_verified = True
    #     user.save()

    #     return Response(
    #         {"message": "User approved successfully"},
    #         status=HTTP_200_OK,
    #     )

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

        # Block Login Untill Verified by Admin
        if not user.is_verified:
            return Response(
                {"error": "Your account is pending admin approval."},
                status=HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        Logger.info(
            {
                "message": "Logged in",
                "user_email": user.email,
            }
            | common_info_logger
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

    def _generate_approval_token(self: "UserAuthViewset", user: User) -> str:
        token = AccessToken.for_user(user)
        token["approval"] = True
        return str(token)

    # def _send_admin_approval_email(self, user: User, token: str) -> None:
    #     approval_url = f"{settings.SERVER_URL}/api/auth/approveuser/?token={token}"

    #     context = {
    #         "user": user,
    #         "approval_url": approval_url,
    #     }

    #     email_content = render_to_string("admin_approval.html", context)

    #     email_data = EmailData(
    #         sender_email=settings.SENDER_EMAIL,
    #         sender_password=settings.SENDER_PASSWORD,
    #         receiver_email=settings.ADMIN_EMAIL,  # Admin email
    #         subject="New User Registration Approval",
    #         html=email_content,
    #     )

    #     send_email(email_data)

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


# Admin Dashboard Views
# class AdminDashboardViewSet(ModelViewSet):
#     permission_classes = [AccountManager]

#     @action(detail=False, methods=["get", "post"], url_path="login")
#     def login_view(
#         self: "AdminDashboardViewSet", request: Request
#     ):
#         context = {
#             "log_entries": [],
#         }
#         return render(request, "admin/index.html")

#     def get_dashboard(request):
#         pending_users = User.objects.filter(is_verified=False, is_superuser=False)
#         return render(request, "admin/dashboard.html", {"pending_users": pending_users})

#     def get_users(request):
#         approved_users = User.objects.filter(is_verified=True, is_superuser=False).order_by('-date_joined')
#         return render(request, "admin/users.html", {"approved_users": approved_users})

#     @csrf_exempt
#     def approve_user(request, user_id):
#         if request.method == "POST":
#             user = User.objects.filter(id=user_id).first()
#             if user:
#                 user.is_verified = True
#                 user.save()
#                 return JsonResponse({"message": "User approved"}, status=200)
#             return JsonResponse({"error": "User not found"}, status=404)
#         return JsonResponse({"error": "Method not allowed"}, status=405)

#     def reject_user(request, user_id):
#         if request.method == "POST":
#             user = User.objects.filter(id=user_id).first()
#             if user:
#                 user.delete()
#                 return JsonResponse({"message": "User rejected"}, status=200)
#             return JsonResponse({"error": "User not found"}, status=404)
#         return JsonResponse({"error": "Method not allowed"}, status=405)


# Django imports
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.utils.decorators import method_decorator
from django.views import View


class AdminRequiredMixin(UserPassesTestMixin):
    def test_func(self: "AdminRequiredMixin") -> bool:
        return self.request.user.is_staff or self.request.user.is_superuser


class AdminLoginView(View):
    def get(self: "AdminLoginView", request: Request) -> render:
        return render(request, "custom_admin/index.html")


class AdminDashboardView(LoginRequiredMixin, AdminRequiredMixin, View):
    def get(self: "AdminDashboardView", request: Request) -> render:
        pending_users = User.objects.filter(is_verified=False, is_superuser=False)
        return render(
            request,
            "custom_admin/dashboard.html",
            {"pending_users": pending_users},
        )


class AdminUsersView(LoginRequiredMixin, AdminRequiredMixin, View):
    def get(self: "AdminUsersView", request: Request) -> render:
        approved_users = User.objects.filter(
            is_verified=True, is_superuser=False
        ).order_by("-date_joined")

        return render(
            request,
            "custom_admin/users.html",
            {"approved_users": approved_users},
        )


@method_decorator(csrf_exempt, name="dispatch")
class ApproveUserView(LoginRequiredMixin, AdminRequiredMixin, View):
    def post(self: "ApproveUserView", request: Request, user_id: str) -> JsonResponse:
        user = User.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=404)

        user.is_verified = True
        user.save()
        return JsonResponse({"message": "User approved"})


@method_decorator(csrf_exempt, name="dispatch")
class RejectUserView(LoginRequiredMixin, AdminRequiredMixin, View):
    def post(self: "RejectUserView", request: Request, user_id: str) -> JsonResponse:
        user = User.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=404)

        user.delete()
        return JsonResponse({"message": "User rejected"})

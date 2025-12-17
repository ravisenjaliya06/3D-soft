# Python imports
import secrets
import string
from typing import Any, Dict, List, Optional

# Django imports
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import (
    validate_password as django_validate_password,
)
from django.core import exceptions
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _

# External imports
from rest_framework import serializers
from rest_framework.request import Request

# App imports
from design.constant import NESTING_SHEET_HEIGHT, NESTING_SHEET_WIDTH
from design.models import DesignSetting
from umaboy.models import Organization, User, UserOrganizationPermission
from user.constant import MOBILE_NUMBER_LENGTH
from user.utils import (
    add_user_to_organization,
    verify_otp,
)


class PhoneValidationSerializer(serializers.Serializer):
    def validate_phone(self: "PhoneValidationSerializer", value: str) -> str:
        """
        Validate the phone number.
        """
        if not value.isdigit() or len(value) != MOBILE_NUMBER_LENGTH:
            raise serializers.ValidationError(
                f"Phone number must be {MOBILE_NUMBER_LENGTH} digits long and contain only numbers."
            )
        return value


class GroupValidationSerializer(serializers.Serializer):
    def validate_groups(
        self: "GroupValidationSerializer", value: List[str]
    ) -> List[int]:
        """
        Validate and convert group names to their corresponding primary keys.
        """
        if not value:
            raise serializers.ValidationError("At least one group must be provided.")

        group_names = value
        groups = Group.objects.filter(name__in=group_names)
        if len(groups) != len(group_names):
            raise serializers.ValidationError("One or more group names are invalid.")
        return list(groups.values_list("pk", flat=True))


class SignupSerializer(PhoneValidationSerializer):
    """
    Serializer for User signup
    """

    email = serializers.EmailField()
    username = serializers.CharField()
    name = serializers.CharField(required=True)
    phone = serializers.CharField(required=True)
    password = serializers.CharField(style={"input_type": "password"}, write_only=True)
    confirm_password = serializers.CharField(
        style={"input_type": "password"}, write_only=True
    )

    def validate_email(self: "SignupSerializer", value: str) -> str:
        """
        Validate that the email address is in lowercase.
        """
        return value.lower()

    def validate_password(self: "SignupSerializer", value: str) -> str:
        """
        Validate the password.
        """
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters long."
            )
        return value

    def validate(self: "SignupSerializer", data: Dict[str, str]) -> Dict[str, str]:
        password = data.get("password")
        confirm_password = data.get("confirm_password")
        if password != confirm_password:
            raise serializers.ValidationError("Passwords do not match.")
        try:
            django_validate_password(password)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)

        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError(
                {"username": "A user with this username already exists."}
            )
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError(
                {"email": "A user with this email already exists."}
            )

        return data

    def create(self: "SignupSerializer", validated_data: Dict[str, str]) -> User:
        """
        Create and return a new User instance.
        """
        validated_data.pop("confirm_password", None)

        group_names = self.context.get("group_names")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        organization, _ = Organization.objects.get_or_create(
            name=f"{user.username}'s Organization"
        )
        organization.user.add(user)
        organization.save()

        user.selected_organization = organization
        user.save()
        add_user_to_organization(user, organization, group_names)

        DesignSetting.objects.get_or_create(
            organization=organization,
            defaults={
                "sheet_width": NESTING_SHEET_WIDTH,
                "sheet_height": NESTING_SHEET_HEIGHT,
            },
        )

        return user


class LoginSerializer(serializers.Serializer):
    """
    LoginSerializer Serializer for validating email and password for login
    used in : LoginViewSet
    """

    email = serializers.CharField()
    password = serializers.CharField(style={"input_type": "password"}, write_only=True)

    def validate(self: "LoginSerializer", data: Dict[str, str]) -> Dict[str, str]:
        email = data.get("email")
        password = data.get("password")

        user = (
            User.objects.filter(email=email).first()
            or User.objects.filter(username=email).first()
        )
        if not user:
            raise exceptions.ValidationError(
                _("Invalid user email address or username.")
            )

        if not user.check_password(password):
            raise exceptions.ValidationError(
                _("Unable to log in with provided credentials. Please try again.")
            )

        if not user.is_verified:
            raise exceptions.ValidationError(
                _("Account is not verified. Please verify account with the OTP.")
            )
        user.otp = None
        user.otp_expiration_time = None

        data["user"] = user
        return data


class OtpSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.IntegerField(required=True)

    def validate(self: "OtpSerializer", data: Dict[str, str]) -> Dict[str, str]:
        email = data.get("email")
        otp = data.get("otp")
        user = verify_otp(email, otp)
        data["user"] = user
        return data

    def save(self: "OtpSerializer") -> User:
        """
        Save the user as verified after OTP validation.
        """
        user = self.validated_data["user"]
        user.is_verified = True
        user.save()

        return user


class RequestEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self: "RequestEmailSerializer", data: Dict[str, str]) -> User:
        email = data.get("email")

        user = User.objects.filter(email=email).first()
        if not user:
            raise exceptions.ValidationError(
                _("User not found. Please enter correct email address")
            )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True)
    selected_organization_name = serializers.SerializerMethodField()
    user_groups = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = User
        fields = [
            "username",
            "name",
            "email",
            "phone",
            "selected_organization_name",
            "user_groups",
            "profile_picture",
        ]

    def get_selected_organization_name(
        self: "UserProfileSerializer", obj: User
    ) -> Optional[str]:
        if obj.selected_organization:
            return obj.selected_organization.name
        return None


class UserProfileEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["name", "phone", "profile_picture"]

    def validate_phone(self: "UserProfileEditSerializer", value: str) -> str:
        """
        Validate the phone number.
        """
        if not value.isdigit() or len(value) != MOBILE_NUMBER_LENGTH:
            raise serializers.ValidationError(
                f"Phone number must be {MOBILE_NUMBER_LENGTH} digits long and contain only numbers."
            )
        return value


class AddUserInOrganizationSerializer(GroupValidationSerializer):
    username = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    groups = serializers.ListField(child=serializers.CharField(), required=True)

    def validate_email(self: "AddUserInOrganizationSerializer", value: str) -> str:
        """
        Validate that the email address is in lowercase.
        """
        return value.lower()

    def generate_random_string(self: "AddUserInOrganizationSerializer") -> str:
        """
        Generate a secure random password.
        """
        return "".join(secrets.choice(string.ascii_letters) for _ in range(12))

    def validate(
        self: "AddUserInOrganizationSerializer", attrs: Dict[str, str]
    ) -> Dict[str, str]:
        attrs = super().validate(attrs)
        if (
            User.objects.exclude(email=attrs["email"])
            .filter(username=attrs["username"])
            .exists()
        ):
            raise serializers.ValidationError(
                {"username": "A user with this username already exists."}
            )
        return attrs

    def create(
        self: "AddUserInOrganizationSerializer", validated_data: Dict[str, str]
    ) -> User:
        """
        Create and return a new User instance.
        """
        request: Request = self.context.get("request")
        if not request:
            raise serializers.ValidationError({"error": "Request context is required."})

        user_organization = request.user
        groups = validated_data.pop("groups")
        selected_organization_check = User.objects.filter(
            id=user_organization.id
        ).first()
        user = User.objects.filter(email=validated_data["email"]).first()

        organization = Organization.objects.filter(
            id=selected_organization_check.selected_organization.id
        ).first()
        if user:
            if not organization.user.filter(id=user.id).exists():
                organization.user.add(user)
            user.save()

            add_user_to_organization(
                user=user, organization=organization, groups=groups
            )
            return user

        password = self.generate_random_string()
        user = User(
            email=validated_data["email"],
            username=validated_data["username"],
            password=password,
        )
        user.selected_organization = selected_organization_check.selected_organization
        user.set_password(password)
        user.save()

        organization.user.add(user)
        user.groups.set(groups)
        organization.save()
        add_user_to_organization(user, organization, groups)

        return user


class EditUserInOrganizationSerializer(GroupValidationSerializer):
    groups = serializers.ListField(child=serializers.CharField(), required=True)

    def update(
        self: "EditUserInOrganizationSerializer", user: User, validated_data: dict
    ) -> User:
        user_permission = self.context.get("user_permission")
        groups = validated_data.pop("groups", None)
        if groups is not None:
            user_permission.groups.set(groups)

        user.save()
        return user


class SetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(
        style={"input_type": "password"}, write_only=True, required=True
    )
    confirm_password = serializers.CharField(
        style={"input_type": "password"}, required=True
    )

    def validate(self: "SetPasswordSerializer", data: Dict[str, str]) -> Dict[str, str]:
        """
        Validate the password and confirm password.
        """
        password = data.get("password")
        confirm_password = data.get("confirm_password")

        if password != confirm_password:
            raise serializers.ValidationError("Passwords mismatched.")

        try:
            django_validate_password(password)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)

        return data

    def save(self: "SetPasswordSerializer") -> User:
        """
        Save the user with the new password.
        """
        user: User = self.context.get("user")
        if not user:
            raise serializers.ValidationError({"error": "Request context is required."})

        password = self.validated_data["password"]

        try:
            django_validate_password(password)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        user = User.objects.get(email=user.email)
        user.set_password(password)
        user.is_verified = True
        user.save()

        user_permission = UserOrganizationPermission.objects.filter(user=user).first()
        user_permission.is_invited = False

        return user


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "display_name", "logo"]

    def update(
        self: "OrganizationSerializer",
        instance: Organization,
        validated_data: Dict[str, Any],
    ) -> Organization:
        instance.display_name = validated_data.get(
            "display_name", instance.display_name
        )
        instance.logo = validated_data.get("logo", instance.logo)
        instance.save()
        return instance

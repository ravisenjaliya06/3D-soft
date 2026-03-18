# Python imports
from typing import TYPE_CHECKING

# External imports
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

if TYPE_CHECKING:
    # App imports
    from umaboy.models import User


class CustomAccessToken(AccessToken):
    """
    Custom AccessToken that includes username in the JWT payload.
    """

    @classmethod
    def for_user(cls: type["CustomAccessToken"], user: "User") -> "CustomAccessToken":
        token = super().for_user(user)
        token.payload["username"] = str(user.username)

        if hasattr(token, "_encoded"):
            delattr(token, "_encoded")
        for attr_name in ["_token", "_cached_token", "_str"]:
            if hasattr(token, attr_name):
                delattr(token, attr_name)

        return token


class CustomRefreshToken(RefreshToken):
    """
    Custom RefreshToken that includes username in the access token payload.
    """

    access_token_class = CustomAccessToken

    @classmethod
    def for_user(cls: type["CustomRefreshToken"], user: "User") -> "CustomRefreshToken":
        return super().for_user(user)

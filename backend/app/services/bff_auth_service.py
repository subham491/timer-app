"""BFF authentication via MSAL confidential client."""

import msal
from fastapi import HTTPException, status

from app.config import settings

_SCOPES = ["User.Read"]
_AUTHORITY = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}"


def _msal_app() -> msal.ConfidentialClientApplication:
    if not settings.MICROSOFT_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Microsoft client secret is not configured.",
        )
    return msal.ConfidentialClientApplication(
        client_id=settings.MICROSOFT_CLIENT_ID,
        authority=_AUTHORITY,
        client_credential=settings.MICROSOFT_CLIENT_SECRET,
    )


def build_auth_code_flow() -> dict:
    return _msal_app().initiate_auth_code_flow(
        scopes=_SCOPES,
        redirect_uri=settings.OAUTH_REDIRECT_URI,
    )


def redeem_auth_code(flow: dict, auth_response: dict) -> dict:
    result = _msal_app().acquire_token_by_auth_code_flow(flow, auth_response)
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.get("error_description", "Microsoft sign-in failed."),
        )
    claims = result.get("id_token_claims")
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Microsoft sign-in returned no identity claims.",
        )
    return claims
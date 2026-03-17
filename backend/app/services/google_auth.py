from google.auth.transport import requests
from google.oauth2 import id_token


class GoogleAuthError(Exception):
    """Raised when Google token verification fails."""


def verify_google_id_token(token: str, client_id: str) -> dict:
    """Validate a Google ID token and return its claims."""
    if not client_id:
        raise GoogleAuthError("GOOGLE_CLIENT_ID is not configured")

    try:
        claims = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            audience=client_id,
        )
    except Exception as exc:
        raise GoogleAuthError("Invalid Google token") from exc

    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise GoogleAuthError("Invalid token issuer")

    if not claims.get("email"):
        raise GoogleAuthError("Google account email is missing")

    return claims

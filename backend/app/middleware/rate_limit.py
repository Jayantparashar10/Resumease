"""
Rate limiting middleware using slowapi.

Provides a single `limiter` instance that routers import and apply
via the @limiter.limit() decorator. The limiter uses the real client
IP address (respects X-Forwarded-For when trusted, falls back to
REMOTE_ADDR).

Usage in a router:
    from app.middleware.rate_limit import limiter
    from fastapi import Request

    @router.post("/google")
    @limiter.limit("10/minute")
    async def google_login(request: Request, payload: GoogleLoginRequest):
        ...
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],  # No global limit; apply per-route.
)

"""Limits on Gemini calls that run on the server's own GEMINI_API_KEY.

Visitors who paste their own key in Settings are not limited. Visitors without one fall back
to the server key, so each client gets a small hourly allowance and the whole site a daily
cap. Only real Gemini calls count; cached explanations and memos are free.
"""
import os
import threading
import time
from collections import deque
from typing import Callable, Optional

SERVER_MODEL = "gemini-2.5-flash"
PER_CLIENT_PER_HOUR = int(os.environ.get("AI_PER_CLIENT_PER_HOUR", "20"))
SITE_PER_DAY = int(os.environ.get("AI_SITE_PER_DAY", "400"))

_lock = threading.Lock()
_by_client: dict[str, deque] = {}
_site: deque = deque()


def client_id(request) -> str:
    # Render sits behind a proxy; the first X-Forwarded-For entry is the visitor.
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _take(client: str) -> Optional[str]:
    now = time.time()
    with _lock:
        while _site and now - _site[0] > 86400:
            _site.popleft()
        calls = _by_client.setdefault(client, deque())
        while calls and now - calls[0] > 3600:
            calls.popleft()
        if len(_site) >= SITE_PER_DAY:
            return "The site's shared AI allowance is used up for today. Add your own Gemini key in Settings to keep going."
        if len(calls) >= PER_CLIENT_PER_HOUR:
            return "You've reached the hourly limit for AI explanations on the shared key. Try again later, or add your own Gemini key in Settings."
        calls.append(now)
        _site.append(now)
        return None


def resolve(request) -> tuple[Optional[str], str, Optional[Callable[[], Optional[str]]]]:
    """Return (api_key, model, before_call) for a request.

    before_call is None for a visitor's own key. For the server key it must be called right
    before each Gemini request and returns an error message when the limit is reached.
    """
    own_key = request.headers.get("X-Gemini-API-Key")
    if own_key:
        return own_key, request.headers.get("X-Gemini-Model") or SERVER_MODEL, None
    server_key = os.environ.get("GEMINI_API_KEY")
    client = client_id(request)
    # On the shared key, always use the cheapest model regardless of the requested one.
    return server_key, SERVER_MODEL, (lambda: _take(client))

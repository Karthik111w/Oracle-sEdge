import threading
import time
from typing import Any, Callable

_MISSING = object()


class TTLCache:
    """Thread-safe in-memory TTL cache with de-duplication of concurrent loads."""

    def __init__(self):
        self._data: dict = {}
        self._lock = threading.Lock()
        self._inflight: dict = {}

    def get(self, key, default=None):
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return default
            expires, value = entry
            if expires <= time.monotonic():
                del self._data[key]
                return default
            return value

    def set(self, key, value, ttl: float) -> None:
        with self._lock:
            self._data[key] = (time.monotonic() + ttl, value)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def cached(self, key, ttl: float | Callable[[Any], float], loader: Callable[[], Any]):
        """Return the cached value for key, or call loader once even if several threads ask at the same time.

        ttl may be a number or a function of the loaded value (to cache failures briefly).
        If the loader raises, nothing is cached and waiting threads retry on their own.
        """
        value = self.get(key, _MISSING)
        if value is not _MISSING:
            return value

        with self._lock:
            event = self._inflight.get(key)
            leader = event is None
            if leader:
                event = self._inflight[key] = threading.Event()

        if not leader:
            event.wait()
            value = self.get(key, _MISSING)
            if value is not _MISSING:
                return value
            return self.cached(key, ttl, loader)

        try:
            value = loader()
            self.set(key, value, ttl(value) if callable(ttl) else ttl)
            return value
        finally:
            with self._lock:
                self._inflight.pop(key, None)
            event.set()


_default = TTLCache()


def get(key, default=None):
    return _default.get(key, default)


def set(key, value, ttl: float) -> None:  # noqa: A001
    _default.set(key, value, ttl)


def cached(key, ttl, loader):
    return _default.cached(key, ttl, loader)

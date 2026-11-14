import threading
import time
from typing import Any, Callable

_MISSING = object()
DEFAULT_MAX_ENTRIES = 2000


class _Flight:
    """One in-progress load that concurrent callers wait on and share the outcome of."""

    def __init__(self):
        self.event = threading.Event()
        self.value = _MISSING
        self.error: BaseException | None = None


class TTLCache:
    """Thread-safe in-memory TTL cache with de-duplication of concurrent loads."""

    def __init__(self, max_entries: int = DEFAULT_MAX_ENTRIES):
        self._max_entries = max_entries
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
        now = time.monotonic()
        with self._lock:
            for stale in [k for k, (expires, _) in self._data.items() if expires <= now]:
                del self._data[stale]
            self._data.pop(key, None)
            self._data[key] = (now + ttl, value)
            while len(self._data) > self._max_entries:
                del self._data[next(iter(self._data))]  # dicts keep insertion order: oldest first

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def cached(self, key, ttl: float | Callable[[Any], float], loader: Callable[[], Any]):
        """Return the cached value for key, or call loader once even if several threads ask at the same time.

        ttl may be a number or a function of the loaded value (to cache failures briefly).
        If the loader raises, nothing is cached and every thread waiting on that load gets the same exception.
        """
        value = self.get(key, _MISSING)
        if value is not _MISSING:
            return value

        with self._lock:
            flight = self._inflight.get(key)
            leader = flight is None
            if leader:
                flight = self._inflight[key] = _Flight()

        if not leader:
            flight.event.wait()
            if flight.error is not None:
                raise flight.error
            return flight.value

        try:
            value = loader()
            self.set(key, value, ttl(value) if callable(ttl) else ttl)
            flight.value = value
            return value
        except BaseException as exc:
            flight.error = exc
            raise
        finally:
            with self._lock:
                self._inflight.pop(key, None)
            flight.event.set()


_default = TTLCache()


def get(key, default=None):
    return _default.get(key, default)


def set(key, value, ttl: float) -> None:  # noqa: A001
    _default.set(key, value, ttl)


def cached(key, ttl, loader):
    return _default.cached(key, ttl, loader)

"""Checks the Latte-Signature header on a webhook delivery.

Written by hand; the rest of this package is generated (sdks/README.md).
The header is ``t=<unix seconds>,v1=<hex HMAC-SHA256>``, keyed with the
endpoint's whole ``whsec_`` secret over ``"<t>.<raw body>"``.
"""

import hashlib
import hmac
import time
from typing import Optional

TOLERANCE_SECONDS = 300


def verify_webhook_signature(
    secret: str,
    header: Optional[str],
    body: bytes,
    tolerance: int = TOLERANCE_SECONDS,
    now: Optional[float] = None,
) -> bool:
    """Return True when ``header`` signs the raw ``body`` with ``secret`` and is recent.

    Pass the body bytes exactly as received, never re-serialised JSON.
    """
    if not header:
        return False
    parts = dict(p.strip().split("=", 1) for p in header.split(",") if "=" in p)
    try:
        timestamp = int(parts["t"])
    except (KeyError, ValueError):
        return False
    current = time.time() if now is None else now
    if abs(current - timestamp) > tolerance:
        return False
    expected = hmac.new(
        secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, parts.get("v1", ""))

"""List the latest scored calls and the ones QA should look at.

    LATTE_URL=https://your-latte-domain LATTE_API_KEY=latte_... python examples/scored_calls.py

Scope: calls:read. Webhook check: see receive_webhook below.
"""

import os

import latte_sdk
from latte_sdk.webhook import verify_webhook_signature


def scored_calls(client: latte_sdk.ApiClient, limit: int = 20):
    """The newest scored calls, as (file, score, needs review)."""
    calls = latte_sdk.CallsApi(client).list_calls(status="scored", limit=limit)
    return [(c.original_filename, c.overall_score, c.needs_review) for c in calls.items]


def receive_webhook(secret: str, headers: dict, raw_body: bytes) -> bool:
    """What a web handler does first: check Latte-Signature on the raw bytes."""
    return verify_webhook_signature(secret, headers.get("Latte-Signature"), raw_body)


if __name__ == "__main__":
    config = latte_sdk.Configuration(
        host=os.environ["LATTE_URL"], access_token=os.environ["LATTE_API_KEY"]
    )
    with latte_sdk.ApiClient(config) as api:
        for name, score, review in scored_calls(api):
            print(f"{name}: {score}{'  needs review' if review else ''}")

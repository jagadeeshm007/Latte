# latte-sdk for Python

A Python client for the Latte API, generated from its OpenAPI document by OpenAPI Generator (see [../README.md](../README.md)). Python 3.10 or later.

## Install

Pinned, for production (the version is the release's):

```bash
pip install "git+https://github.com/jagadeeshm007/Latte@sdk-v0.3.0#subdirectory=sdks/python"
```

The newest release:

```bash
pip install "git+https://github.com/jagadeeshm007/Latte@sdk-latest#subdirectory=sdks/python"
```

Each GitHub release also carries the wheel, `latte_sdk-<version>-py3-none-any.whl`.

## Use

```python
import os

import latte_sdk

config = latte_sdk.Configuration(
    host="https://your-latte-domain",
    access_token=os.environ["LATTE_API_KEY"],
)
with latte_sdk.ApiClient(config) as client:
    calls = latte_sdk.CallsApi(client).list_calls(status="scored", limit=20)
    for call in calls.items:
        print(call.id, call.overall_score)
```

Every endpoint is a method on `AccountApi`, `CallsApi`, `UploadsApi`, `BatchesApi`, `ExportsApi`, `AnalyticsApi` or `WebhooksApi`, named by its `operationId` in snake case. Each is documented in [docs/](docs/), with every model.

## Webhooks

```python
from latte_sdk.webhook import verify_webhook_signature

ok = verify_webhook_signature(
    secret=os.environ["LATTE_WEBHOOK_SECRET"],
    header=request.headers.get("Latte-Signature"),
    body=request.get_data(),  # the raw bytes, not parsed JSON
)
```

The guides, error codes and webhook payloads are at `/docs` on your Latte domain.

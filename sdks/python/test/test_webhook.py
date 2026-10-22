"""The webhook check against the vector every SDK shares (sdks/webhook-test-vector.json)."""

import json
import pathlib
import unittest

from latte_sdk.webhook import verify_webhook_signature

VECTOR = json.loads(
    (pathlib.Path(__file__).resolve().parents[2] / "webhook-test-vector.json").read_text()
)
SECRET = VECTOR["secret"]
HEADER = VECTOR["header"]
BODY = VECTOR["body"].encode()
NOW = VECTOR["timestamp"] + 10


class VerifyWebhookSignatureTest(unittest.TestCase):
    def test_accepts_the_signed_body(self):
        self.assertTrue(verify_webhook_signature(SECRET, HEADER, BODY, now=NOW))

    def test_refuses_another_secret(self):
        self.assertFalse(verify_webhook_signature("whsec_other", HEADER, BODY, now=NOW))

    def test_refuses_a_changed_body(self):
        self.assertFalse(verify_webhook_signature(SECRET, HEADER, BODY + b" ", now=NOW))

    def test_refuses_an_old_delivery(self):
        self.assertFalse(
            verify_webhook_signature(SECRET, HEADER, BODY, now=VECTOR["timestamp"] + 301)
        )

    def test_refuses_a_missing_or_malformed_header(self):
        self.assertFalse(verify_webhook_signature(SECRET, None, BODY, now=NOW))
        self.assertFalse(verify_webhook_signature(SECRET, "v1=abc", BODY, now=NOW))
        self.assertFalse(verify_webhook_signature(SECRET, "t=x,v1=abc", BODY, now=NOW))


if __name__ == "__main__":
    unittest.main()

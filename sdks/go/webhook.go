// Written by hand; the rest of this package is generated (sdks/README.md).

package latte

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

// WebhookTolerance is how far a delivery's timestamp may be from now.
const WebhookTolerance = 5 * time.Minute

// VerifyWebhookSignature reports whether header (the Latte-Signature value,
// "t=<unix seconds>,v1=<hex HMAC-SHA256>") signs the raw request body with
// the endpoint's whole whsec_ secret, and is within WebhookTolerance of now.
// Pass the body bytes exactly as received.
func VerifyWebhookSignature(secret, header string, body []byte, now time.Time) bool {
	var timestamp int64
	var given string
	for _, part := range strings.Split(header, ",") {
		key, value, _ := strings.Cut(strings.TrimSpace(part), "=")
		switch key {
		case "t":
			timestamp, _ = strconv.ParseInt(value, 10, 64)
		case "v1":
			given = value
		}
	}
	if timestamp == 0 {
		return false
	}
	if age := now.Sub(time.Unix(timestamp, 0)); age > WebhookTolerance || age < -WebhookTolerance {
		return false
	}
	signature, err := hex.DecodeString(given)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(strconv.FormatInt(timestamp, 10) + "."))
	mac.Write(body)
	return hmac.Equal(mac.Sum(nil), signature)
}

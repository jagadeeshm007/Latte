package latte

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

// The webhook check against the vector every SDK shares (sdks/webhook-test-vector.json).
type vector struct {
	Secret    string `json:"secret"`
	Timestamp int64  `json:"timestamp"`
	Body      string `json:"body"`
	Header    string `json:"header"`
}

func loadVector(t *testing.T) vector {
	t.Helper()
	raw, err := os.ReadFile("../webhook-test-vector.json")
	if err != nil {
		t.Fatal(err)
	}
	var v vector
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestVerifyWebhookSignature(t *testing.T) {
	v := loadVector(t)
	now := time.Unix(v.Timestamp+10, 0)
	body := []byte(v.Body)
	cases := []struct {
		name   string
		secret string
		header string
		body   []byte
		now    time.Time
		want   bool
	}{
		{"accepts the signed body", v.Secret, v.Header, body, now, true},
		{"refuses another secret", "whsec_other", v.Header, body, now, false},
		{"refuses a changed body", v.Secret, v.Header, append([]byte(v.Body), ' '), now, false},
		{"refuses an old delivery", v.Secret, v.Header, body, time.Unix(v.Timestamp+301, 0), false},
		{"refuses a missing header", v.Secret, "", body, now, false},
		{"refuses a malformed signature", v.Secret, "t=1,v1=zz", body, time.Unix(1, 0), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := VerifyWebhookSignature(c.secret, c.header, c.body, c.now); got != c.want {
				t.Fatalf("got %v, want %v", got, c.want)
			}
		})
	}
}

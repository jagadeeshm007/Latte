// Lists the latest scored calls and the ones QA should look at.
//
//	LATTE_URL=https://your-latte-domain LATTE_API_KEY=latte_... go run ./examples/scored-calls
//
// Scope: calls:read. receiveWebhook shows the signature check a handler does first.
package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	latte "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	cfg := latte.NewConfiguration()
	cfg.Servers = latte.ServerConfigurations{{URL: os.Getenv("LATTE_URL")}}
	client := latte.NewAPIClient(cfg)
	ctx := context.WithValue(context.Background(), latte.ContextAccessToken, os.Getenv("LATTE_API_KEY"))

	calls, _, err := client.CallsAPI.ListCalls(ctx).Status("scored").Limit(20).Execute()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	for _, call := range calls.GetItems() {
		review := ""
		if call.GetNeedsReview() {
			review = "  needs review"
		}
		fmt.Printf("%s: %v%s\n", call.GetOriginalFilename(), call.GetOverallScore(), review)
	}
}

// receiveWebhook is an http.HandlerFunc for Latte deliveries.
func receiveWebhook(secret string, handle func([]byte)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil || !latte.VerifyWebhookSignature(secret, r.Header.Get("Latte-Signature"), body, time.Now()) {
			http.Error(w, "bad signature", http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		go handle(body)
	}
}

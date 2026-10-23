# Latte SDK for Go

A Go client for the Latte API, generated from its OpenAPI document by OpenAPI Generator (see [../README.md](../README.md)).

## Install

The newest release:

```bash
go get github.com/jagadeeshm007/Latte/sdks/go@latest
```

Pinned, for production:

```bash
go get github.com/jagadeeshm007/Latte/sdks/go@v0.3.0
```

## Use

```go
package main

import (
	"context"
	"fmt"
	"os"

	latte "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	cfg := latte.NewConfiguration()
	cfg.Servers = latte.ServerConfigurations{{URL: "https://your-latte-domain"}}
	client := latte.NewAPIClient(cfg)
	ctx := context.WithValue(context.Background(), latte.ContextAccessToken, os.Getenv("LATTE_API_KEY"))

	calls, _, err := client.CallsAPI.ListCalls(ctx).Status("scored").Limit(20).Execute()
	if err != nil {
		panic(err)
	}
	for _, call := range calls.GetItems() {
		fmt.Println(call.GetId(), call.GetOverallScore())
	}
}
```

Every endpoint is a method on `AccountAPI`, `CallsAPI`, `UploadsAPI`, `BatchesAPI`, `ExportsAPI`, `AnalyticsAPI` or `WebhooksAPI`, named by its `operationId`. Each is documented in [docs/](docs/), with every model.

## Webhooks

```go
body, _ := io.ReadAll(r.Body) // the raw bytes, not parsed JSON
if !latte.VerifyWebhookSignature(os.Getenv("LATTE_WEBHOOK_SECRET"), r.Header.Get("Latte-Signature"), body, time.Now()) {
	http.Error(w, "bad signature", http.StatusBadRequest)
	return
}
```

The guides, error codes and webhook payloads are at `/docs` on your Latte domain.

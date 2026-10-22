# Latte SDK for Java

A Java 11+ client for the Latte API using `java.net.http` and Jackson, generated from its OpenAPI document by OpenAPI Generator (see [../README.md](../README.md)). Maven coordinates: `io.github.jagadeeshm007:latte-sdk`.

## Install

Each GitHub release carries the jar and its pom. Install them into your local Maven repository, pinned:

```bash
curl -LO https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.3.0/latte-sdk-0.3.0.jar
curl -LO https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.3.0/latte-sdk-0.3.0.pom
mvn install:install-file -Dfile=latte-sdk-0.3.0.jar -DpomFile=latte-sdk-0.3.0.pom
```

The newest release is always at `https://github.com/jagadeeshm007/Latte/releases/latest/download/latte-sdk.jar` (and `latte-sdk.pom`). Or build from source: `mvn install` in this directory.

```xml
<dependency>
  <groupId>io.github.jagadeeshm007</groupId>
  <artifactId>latte-sdk</artifactId>
  <version>0.3.0</version>
</dependency>
```

## Use

```java
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.model.CallList;

ApiClient client = new ApiClient();
client.updateBaseUri("https://your-latte-domain");
client.setRequestInterceptor(r -> r.header("Authorization", "Bearer " + System.getenv("LATTE_API_KEY")));

CallList calls = new CallsApi(client).listCalls(
    CallsApi.APIListCallsRequest.newBuilder().status("scored").limit(20).build());
calls.getItems().forEach(c -> System.out.println(c.getId() + " " + c.getOverallScore()));
```

Every endpoint is a method on `AccountApi`, `CallsApi`, `UploadsApi`, `BatchesApi`, `ExportsApi`, `AnalyticsApi` or `WebhooksApi`, named by its `operationId`. Each is documented in [docs/](docs/), with every model.

## Webhooks

```java
import io.github.jagadeeshm007.latte.Webhook;

boolean ok = Webhook.verifySignature(
    System.getenv("LATTE_WEBHOOK_SECRET"), request.getHeader("Latte-Signature"), rawBody);
```

Pass the raw body bytes, not parsed JSON. The guides, error codes and webhook payloads are at `/docs` on your Latte domain.

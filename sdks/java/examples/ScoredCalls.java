// Lists the latest scored calls and the ones QA should look at.
//
//   LATTE_URL=https://your-latte-domain LATTE_API_KEY=latte_... java -cp <sdk and its dependencies> ScoredCalls.java
//
// Scope: calls:read. isGenuine shows the webhook check a handler does first.
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.Webhook;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.model.CallList;
import io.github.jagadeeshm007.latte.model.CallSummary;

public class ScoredCalls {
  public static void main(String[] args) throws Exception {
    ApiClient client = new ApiClient();
    client.updateBaseUri(System.getenv("LATTE_URL"));
    client.setRequestInterceptor(r -> r.header("Authorization", "Bearer " + System.getenv("LATTE_API_KEY")));

    CallList calls = new CallsApi(client).listCalls(
        CallsApi.APIListCallsRequest.newBuilder().status("scored").limit(20).build());
    for (CallSummary call : calls.getItems()) {
      String review = Boolean.TRUE.equals(call.getNeedsReview()) ? "  needs review" : "";
      System.out.println(call.getOriginalFilename() + ": " + call.getOverallScore() + review);
    }
  }

  /** What a web handler does first: check Latte-Signature on the raw body bytes. */
  static boolean isGenuine(String secret, String signatureHeader, byte[] rawBody) {
    return Webhook.verifySignature(secret, signatureHeader, rawBody);
  }
}

package io.github.jagadeeshm007.latte;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** The webhook check against the vector every SDK shares (sdks/webhook-test-vector.json). */
class WebhookTest {
  private static final String VECTOR = read();
  private static final String SECRET = field("secret");
  private static final String HEADER = field("header");
  private static final byte[] BODY =
      field("body").replace("\\\"", "\"").getBytes(StandardCharsets.UTF_8);
  private static final long TIMESTAMP = Long.parseLong(field("timestamp"));
  private static final Instant NOW = Instant.ofEpochSecond(TIMESTAMP + 10);

  private static String read() {
    try {
      return Files.readString(Path.of("../webhook-test-vector.json"));
    } catch (java.io.IOException e) {
      throw new IllegalStateException(e);
    }
  }

  /** A top-level field of the vector; the vector is flat, so no JSON library is needed. */
  private static String field(String name) {
    Matcher m =
        Pattern.compile("\"" + name + "\":\\s*(?:\"((?:[^\"\\\\]|\\\\.)*)\"|(\\d+))").matcher(VECTOR);
    if (!m.find()) throw new IllegalStateException("no " + name + " in the vector");
    return m.group(1) != null ? m.group(1) : m.group(2);
  }

  @Test
  void acceptsTheSignedBody() {
    assertTrue(Webhook.verifySignature(SECRET, HEADER, BODY, NOW));
  }

  @Test
  void refusesAnotherSecret() {
    assertFalse(Webhook.verifySignature("whsec_other", HEADER, BODY, NOW));
  }

  @Test
  void refusesAChangedBody() {
    byte[] changed = (new String(BODY, StandardCharsets.UTF_8) + " ").getBytes(StandardCharsets.UTF_8);
    assertFalse(Webhook.verifySignature(SECRET, HEADER, changed, NOW));
  }

  @Test
  void refusesAnOldDelivery() {
    assertFalse(Webhook.verifySignature(SECRET, HEADER, BODY, Instant.ofEpochSecond(TIMESTAMP + 301)));
  }

  @Test
  void refusesAMissingOrMalformedHeader() {
    assertFalse(Webhook.verifySignature(SECRET, null, BODY, NOW));
    assertFalse(Webhook.verifySignature(SECRET, "v1=abc", BODY, NOW));
    assertFalse(Webhook.verifySignature(SECRET, "t=x,v1=abc", BODY, NOW));
  }
}

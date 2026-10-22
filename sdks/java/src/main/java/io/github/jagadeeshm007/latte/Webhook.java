// Written by hand; the rest of this package is generated (sdks/README.md).
package io.github.jagadeeshm007.latte;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Checks the Latte-Signature header on a webhook delivery. */
public final class Webhook {
  /** How far a delivery's timestamp may be from now. */
  public static final Duration TOLERANCE = Duration.ofMinutes(5);

  private Webhook() {}

  /** Checks the header against the raw body bytes, as received, at the current time. */
  public static boolean verifySignature(String secret, String header, byte[] body) {
    return verifySignature(secret, header, body, Instant.now());
  }

  /**
   * Returns true when header ("t=&lt;unix seconds&gt;,v1=&lt;hex HMAC-SHA256&gt;") signs the
   * raw body with the endpoint's whole whsec_ secret and is within {@link #TOLERANCE} of now.
   */
  public static boolean verifySignature(String secret, String header, byte[] body, Instant now) {
    if (header == null) return false;
    long timestamp = 0;
    String given = "";
    for (String part : header.split(",")) {
      String[] kv = part.trim().split("=", 2);
      if (kv.length != 2) continue;
      if (kv[0].equals("t")) {
        try {
          timestamp = Long.parseLong(kv[1]);
        } catch (NumberFormatException e) {
          return false;
        }
      } else if (kv[0].equals("v1")) {
        given = kv[1];
      }
    }
    if (timestamp == 0) return false;
    if (Math.abs(now.getEpochSecond() - timestamp) > TOLERANCE.getSeconds()) return false;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
      byte[] expected = hex(mac.doFinal(body)).getBytes(StandardCharsets.UTF_8);
      return MessageDigest.isEqual(expected, given.getBytes(StandardCharsets.UTF_8));
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException("HmacSHA256 is not available", e);
    }
  }

  private static String hex(byte[] bytes) {
    StringBuilder out = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) out.append(String.format("%02x", b));
    return out.toString();
  }
}

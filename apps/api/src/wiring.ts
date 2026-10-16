import path from "node:path";

import { createGateway, type Gateway } from "@scc/gateway";

import type { Config } from "./config.ts";
import type { Queryable } from "./db/pool.ts";
import { PgUsageStore } from "./repo/reference.ts";

/** buildGateway turns configuration into the one model gateway, with its ledger in model_calls. */
export function buildGateway(config: Config, db: Queryable): Gateway {
  return createGateway(
    {
      mode: config.MODEL_MODE,
      budgetUsd: config.LLM_BUDGET_USD,
      cassetteDir: path.resolve(import.meta.dirname, "..", config.CASSETTE_DIR),
      apiKeys: {
        ...(config.GROQ_API_KEY ? { groq: config.GROQ_API_KEY } : {}),
        ...(config.OPENROUTER_API_KEY ? { openrouter: config.OPENROUTER_API_KEY } : {}),
        ...(config.GEMINI_API_KEY ? { gemini: config.GEMINI_API_KEY } : {}),
        ...(config.SARVAM_API_KEY ? { sarvam: config.SARVAM_API_KEY } : {}),
      },
      routes: {
        chat: { provider: config.LLM_PROVIDER, model: config.LLM_MODEL },
        stt: { provider: "groq", model: config.STT_MODEL },
        tts: { provider: "groq", model: config.TTS_MODEL },
        sttRegional: { provider: "sarvam", model: config.STT_REGIONAL_MODEL },
        translate: { provider: "sarvam", model: config.TRANSLATE_MODEL },
      },
      limits: {
        [config.LLM_MODEL]: { rpm: config.LIMIT_LLM_RPM, tpm: config.LIMIT_LLM_TPM },
        [config.STT_MODEL]: {
          rpm: config.LIMIT_STT_RPM,
          audioSecondsPerHour: config.LIMIT_STT_AUDIO_SECONDS_PER_HOUR,
        },
        [config.STT_REGIONAL_MODEL]: { rpm: config.LIMIT_SARVAM_RPM },
        [config.TRANSLATE_MODEL]: { rpm: config.LIMIT_SARVAM_RPM },
      },
    },
    new PgUsageStore(db),
  );
}

import { createClient } from "@supabase/supabase-js";

import type { Config } from "./config.ts";

// Recordings live in a private Supabase Storage bucket. The browser uploads
// to a signed URL issued per file and plays from a signed URL that expires in
// minutes; nothing is ever public (US-02-003).

export interface Storage {
  signUpload(path: string): Promise<{ signedUrl: string; token: string }>;
  signDownload(path: string, expiresInSeconds: number): Promise<string>;
  exists(path: string): Promise<boolean>;
  download(path: string): Promise<Uint8Array>;
  remove(paths: string[]): Promise<void>;
  list(prefix: string): Promise<{ name: string; createdAt: string | null }[]>;
  ensureBucket(): Promise<void>;
}

export class StorageError extends Error {}

export function createStorage(
  config: Pick<Config, "SUPABASE_URL" | "SUPABASE_SECRET_KEY" | "RECORDINGS_BUCKET">,
): Storage {
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = () => client.storage.from(config.RECORDINGS_BUCKET);
  const fail = (what: string, error: { message: string }) =>
    new StorageError(`${what}: ${error.message}`);

  return {
    async signUpload(path) {
      const { data, error } = await bucket().createSignedUploadUrl(path);
      if (error) throw fail("sign upload", error);
      return { signedUrl: data.signedUrl, token: data.token };
    },
    async signDownload(path, expiresInSeconds) {
      const { data, error } = await bucket().createSignedUrl(path, expiresInSeconds);
      if (error) throw fail("sign download", error);
      return data.signedUrl;
    },
    async exists(path) {
      const { data, error } = await bucket().exists(path);
      if (error) throw fail("exists", error);
      return data;
    },
    async download(path) {
      const { data, error } = await bucket().download(path);
      if (error) throw fail("download", error);
      return new Uint8Array(await data.arrayBuffer());
    },
    async remove(paths) {
      if (paths.length === 0) return;
      const { error } = await bucket().remove(paths);
      if (error) throw fail("remove", error);
    },
    async list(prefix) {
      const { data, error } = await bucket().list(prefix, { limit: 1000 });
      if (error) throw fail("list", error);
      return data.map((o) => ({ name: o.name, createdAt: o.created_at }));
    },
    async ensureBucket() {
      const existing = await client.storage.getBucket(config.RECORDINGS_BUCKET);
      if (existing.data) {
        if (existing.data.public)
          throw new StorageError(`bucket ${config.RECORDINGS_BUCKET} is public; make it private`);
        return;
      }
      const { error } = await client.storage.createBucket(config.RECORDINGS_BUCKET, {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024,
        allowedMimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg"],
      });
      if (error) throw fail("create bucket", error);
    },
  };
}

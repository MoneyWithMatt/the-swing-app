import "server-only";
import { requirePilotEnv } from "./pilot-env";

type RequestOptions = RequestInit & { prefer?: string };

export async function supabaseRest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const env = requirePilotEnv();
  const headers = new Headers(options.headers);
  headers.set("apikey", env.supabaseServiceKey);
  headers.set("Authorization", `Bearer ${env.supabaseServiceKey}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.prefer) {
    headers.set("Prefer", options.prefer);
  }

  const response = await fetch(`${env.supabaseUrl}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.text();
  if (!body) {
    return undefined as T;
  }
  return JSON.parse(body) as T;
}

export async function createSignedUpload(path: string, upsert = false) {
  const env = requirePilotEnv();
  const result = await supabaseRest<{ url?: string; token?: string }>(
    `/storage/v1/object/upload/sign/${env.videoBucket}/${path}`,
    {
      method: "POST",
      headers: upsert ? { "x-upsert": "true" } : undefined,
      body: JSON.stringify({})
    }
  );

  const token = result.token ?? result.url?.split("token=")[1];
  if (!token) {
    throw new Error("Supabase did not return a signed upload token.");
  }

  return {
    token,
    url: `${env.supabaseUrl}/storage/v1/object/upload/sign/${env.videoBucket}/${path}?token=${encodeURIComponent(token)}`
  };
}

export async function createSignedDownload(path: string, expiresIn = 3600) {
  const env = requirePilotEnv();
  const result = await supabaseRest<{ signedURL?: string; signedUrl?: string }>(
    `/storage/v1/object/sign/${env.videoBucket}/${path}`,
    { method: "POST", body: JSON.stringify({ expiresIn }) }
  );
  const signedPath = result.signedURL ?? result.signedUrl;
  if (!signedPath) {
    return undefined;
  }
  return signedPath.startsWith("http") ? signedPath : `${env.supabaseUrl}/storage/v1${signedPath}`;
}

export async function deleteStoredObjects(paths: string[]) {
  const env = requirePilotEnv();
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (!uniquePaths.length) return [];
  return supabaseRest<Array<{ name?: string }>>(`/storage/v1/object/${env.videoBucket}`, {
    method: "DELETE",
    body: JSON.stringify({ prefixes: uniquePaths })
  });
}

export async function uploadCoachPhoto(path: string, file: File) {
  const env = requirePilotEnv();
  const response = await fetch(`${env.supabaseUrl}/storage/v1/object/coach-photos/${path}`, {
    method: "POST",
    headers: {
      apikey: env.supabaseServiceKey,
      Authorization: `Bearer ${env.supabaseServiceKey}`,
      "Content-Type": file.type,
      "Cache-Control": "3600",
      "x-upsert": "true"
    },
    body: await file.arrayBuffer()
  });
  if (!response.ok) throw new Error("Profile photo could not be uploaded.");
}

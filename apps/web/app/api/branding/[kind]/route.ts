import { NextRequest } from "next/server";
import {
  readBrandingCache,
  writeBrandingCache,
  type BrandingKind
} from "../../../../lib/branding-cache";
import { getApiUrl } from "../../../../lib/api";

function fallbackPath(kind: BrandingKind) {
  return kind === "logo-dark"
    ? "/brand-terceiro-andar-dark.svg"
    : "/brand-terceiro-andar.svg";
}

function fallbackResponse(kind: BrandingKind) {
  return new Response(null, {
    status: 307,
    headers: {
      location: fallbackPath(kind),
      "cache-control": "no-store, max-age=0"
    }
  });
}

function cachedResponse(
  body: Uint8Array,
  contentType: string,
  updatedAt?: string
) {
  const headers = new Headers({
    "content-type": contentType,
    "content-length": String(body.byteLength),
    "cache-control": "no-store, max-age=0",
    "x-branding-source": "local-cache"
  });

  if (updatedAt) {
    headers.set("last-modified", new Date(updatedAt).toUTCString());
  }

  return new Response(body, { status: 200, headers });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const normalizedKind: BrandingKind =
    kind === "favicon" ? "favicon" : kind === "logo-dark" ? "logo-dark" : "logo";

  const range = request.headers.get("range");

  if (!range) {
    const cached = await readBrandingCache(normalizedKind);

    if (cached) {
      return cachedResponse(
        new Uint8Array(cached.body),
        cached.contentType,
        cached.updatedAt
      );
    }
  }

  const endpoint = new URL(
    `/api/public/branding/${normalizedKind}`,
    getApiUrl()
  );

  let response: Response;

  try {
    response = await fetch(endpoint, {
      headers: {
        ...(range ? { range } : {})
      },
      cache: "no-store"
    });
  } catch (error) {
    console.error(
      `[branding] Falha ao consultar ${normalizedKind} na API.`,
      error
    );
    return fallbackResponse(normalizedKind);
  }

  if (!response.ok) {
    return fallbackResponse(normalizedKind);
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";

  if (!range && response.status === 200 && contentType.startsWith("image/")) {
    const body = new Uint8Array(await response.arrayBuffer());

    try {
      await writeBrandingCache(normalizedKind, body, contentType);
    } catch (error) {
      console.error(
        `[branding] Falha ao gravar cache local de ${normalizedKind}.`,
        error
      );
    }

    return cachedResponse(body, contentType);
  }

  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified"
  ]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("cache-control", "no-store, max-age=0");

  return new Response(response.body, {
    status: response.status,
    headers
  });
}

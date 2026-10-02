import { NextRequest } from "next/server";
import { getApiUrl } from "../../../../lib/api";

function fallbackPath(kind: "logo" | "logo-dark" | "favicon") {
  return kind === "logo-dark"
    ? "/brand-terceiro-andar-dark.svg"
    : "/brand-terceiro-andar.svg";
}

function fallbackResponse(kind: "logo" | "logo-dark" | "favicon") {
  return new Response(null, {
    status: 307,
    headers: {
      // Keep this relative. In production the Next app can be behind a reverse
      // proxy, and building the redirect from request.url may expose the
      // internal localhost host/port to the browser.
      location: fallbackPath(kind),
      "cache-control": "no-store, max-age=0"
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const normalizedKind: "logo" | "logo-dark" | "favicon" =
    kind === "favicon" ? "favicon" : kind === "logo-dark" ? "logo-dark" : "logo";
  const endpoint = new URL(
    `/api/public/branding/${normalizedKind}`,
    getApiUrl()
  );

  const range = request.headers.get("range");

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

import { NextRequest } from "next/server";
import { getApiUrl } from "../../../../lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const normalizedKind = kind === "favicon" ? "favicon" : "logo";
  const endpoint = new URL(
    `/api/public/branding/${normalizedKind}`,
    getApiUrl()
  );

  const range = request.headers.get("range");
  const response = await fetch(endpoint, {
    headers: {
      ...(range ? { range } : {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return Response.redirect(
      new URL(
        normalizedKind === "favicon"
          ? "/brand-terceiro-andar.svg"
          : request.nextUrl.searchParams.get("tone") === "dark"
            ? "/brand-terceiro-andar-dark.svg"
            : "/brand-terceiro-andar.svg",
        request.url
      ),
      307
    );
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
  headers.set("cache-control", "public, max-age=300");

  return new Response(response.body, {
    status: response.status,
    headers
  });
}

import { NextRequest } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/auth";
import { CLIENT_SESSION_COOKIE } from "../../../../lib/client-auth";
import { getApiUrl } from "../../../../lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const designerToken = request.cookies.get(SESSION_COOKIE)?.value;
  const clientToken = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;

  if (!designerToken && !clientToken) {
    return new Response("Sessão não encontrada.", { status: 401 });
  }

  const internal = Boolean(designerToken);
  const endpoint = internal
    ? `${getApiUrl()}/api/admin/assets/${encodeURIComponent(assetId)}/file`
    : `${getApiUrl()}/api/public/assets/${encodeURIComponent(assetId)}/file`;
  const range = request.headers.get("range");

  const response = await fetch(endpoint, {
    headers: {
      ...(internal
        ? {
            "x-admin-key": process.env.API_ADMIN_KEY ?? "",
            authorization: `Bearer ${designerToken}`
          }
        : {
            authorization: `Bearer ${clientToken}`
          }),
      ...(range ? { range } : {})
    },
    cache: "no-store"
  });

  const headers = new Headers();

  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
    "content-disposition"
  ]) {
    const value = response.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers
  });
}

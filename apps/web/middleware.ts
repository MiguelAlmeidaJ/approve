import { NextRequest, NextResponse } from "next/server";

const DESIGNER_SESSION_COOKIE = "ta_designer_session";
const CLIENT_SESSION_COOKIE = "ta_client_session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicAsset =
    /\.(?:svg|png|jpe?g|webp|gif|ico|avif|woff2?)$/i.test(pathname);

  if (
    isPublicAsset ||
    pathname === "/login" ||
    pathname === "/esqueci-senha" ||
    pathname === "/cliente/login" ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/media/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (
    pathname === "/cliente" ||
    pathname.startsWith("/cliente/")
  ) {
    if (!request.cookies.get(CLIENT_SESSION_COOKIE)?.value) {
      const loginUrl = new URL("/cliente/login", request.url);
      loginUrl.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (!request.cookies.get(DESIGNER_SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};

import { NextRequest, NextResponse } from "next/server";

const DESIGNER_SESSION_COOKIE = "ta_designer_session";
const CLIENT_SESSION_COOKIE = "ta_client_session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/login" ||
    pathname === "/cliente/login" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (
    pathname === "/cliente" ||
    pathname.startsWith("/cliente/") ||
    pathname.startsWith("/p/")
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

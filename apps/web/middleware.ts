import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/p/") ||
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const expectedUser = process.env.DASHBOARD_USER;
  const expectedPassword = process.env.DASHBOARD_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = atob(authorization.slice(6));
      const separator = decoded.indexOf(":");
      const user = decoded.slice(0, separator);
      const password = decoded.slice(separator + 1);

      if (user === expectedUser && password === expectedPassword) {
        return NextResponse.next();
      }
    } catch {
      // Cai no 401 abaixo.
    }
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: {
      // Headers da Fetch API usam ByteString. Mantenha o challenge em ASCII
      // para evitar TypeError com caracteres como travessão (U+2014).
      "WWW-Authenticate": 'Basic realm="Terceiro Andar - Aprovacao"'
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};

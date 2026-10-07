import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authConfigured, verifySessionToken } from "@/lib/auth";

const PUBLIC = ["/login", "/api/login", "/api/status"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  if (!authConfigured()) {
    // Sem senha configurada nada que gaste IA ou toque no banco fica exposto.
    return isApi
      ? NextResponse.json({ error: { message: "APP_PASSWORD não configurada na Vercel." } }, { status: 503 })
      : NextResponse.redirect(new URL("/login", req.url));
  }

  if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return isApi
    ? NextResponse.json({ error: { message: "Sessão expirada. Entre novamente." } }, { status: 401 })
    : NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

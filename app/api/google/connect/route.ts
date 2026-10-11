import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { fail } from "@/lib/http";
import { authUrl, oauthConfigured } from "@/lib/gbpApi";

export const dynamic = "force-dynamic";

/** Começa o login no Google da conta da agência (Gerente dos perfis dos clientes). Só administrador. */
export async function GET(req: Request) {
  const me = await currentUser();
  if (me?.role !== "admin") return fail(403, "Só o administrador conecta a conta Google.");
  if (!oauthConfigured()) return fail(503, "Configure GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET na Vercel.");
  const state = randomBytes(18).toString("base64url");
  const res = NextResponse.redirect(authUrl(new URL(req.url).origin, state));
  res.cookies.set("gbp_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/google", maxAge: 600 });
  return res;
}

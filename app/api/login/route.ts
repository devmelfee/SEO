import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, authConfigured, createSessionToken, passwordMatches } from "@/lib/auth";

export async function POST(req: Request) {
  if (!authConfigured()) return NextResponse.json({ error: { message: "APP_PASSWORD não configurada." } }, { status: 503 });
  const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await passwordMatches(parsed.data.password))) {
    await new Promise((r) => setTimeout(r, 600)); // freia tentativa por força bruta
    return NextResponse.json({ error: { message: "Senha incorreta." } }, { status: 401 });
  }
  const { value, maxAge } = await createSessionToken();
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(SESSION_COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge });
  return res;
}

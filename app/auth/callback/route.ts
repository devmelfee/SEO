import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authClient } from "@/lib/auth";

/** Destino dos links de e-mail (confirmação de cadastro e recuperação de senha). */
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const next = u.searchParams.get("next")?.startsWith("/") ? u.searchParams.get("next")! : "/";
  const code = u.searchParams.get("code");
  const tokenHash = u.searchParams.get("token_hash");
  const type = u.searchParams.get("type") as EmailOtpType | null;

  const res = NextResponse.redirect(new URL(next, req.url));
  const supabase = authClient({
    getAll: () => req.cookies.getAll(),
    setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
  });

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Link incompleto") };

  if (error) {
    const msg = /expired|invalid/i.test(error.message) ? "O link expirou ou já foi usado. Peça um novo." : "Não foi possível validar o link. Abra-o no mesmo navegador em que você se cadastrou, ou peça um novo.";
    return NextResponse.redirect(new URL(`/login?erro=${encodeURIComponent(msg)}`, req.url));
  }
  return res;
}

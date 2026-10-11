import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/session";
import { saveConnection } from "@/lib/gbpApi";

export const dynamic = "force-dynamic";

/** Volta do Google: confere o state, guarda a conexão cifrada e devolve a pessoa ao app com o resultado. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/?google=${q}`, u.origin));
    res.cookies.set("gbp_oauth_state", "", { path: "/api/google", maxAge: 0 });
    return res;
  };
  const me = await currentUser();
  if (me?.role !== "admin") return back("sem_permissao");
  const expected = cookies().get("gbp_oauth_state")?.value;
  if (!expected || u.searchParams.get("state") !== expected) return back("expirou");
  if (u.searchParams.get("error")) return back("cancelado");
  const code = u.searchParams.get("code");
  if (!code) return back("erro");
  try {
    await saveConnection(code, u.origin, me.email);
    return back("ok");
  } catch (e) {
    console.error("Google OAuth:", e instanceof Error ? e.message : e);
    return back("erro");
  }
}

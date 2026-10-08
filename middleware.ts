import { NextResponse, type NextRequest } from "next/server";
import { authClient, authConfigured, membership } from "@/lib/auth";

// Páginas e rotas que não exigem login.
const PUBLIC = ["/login", "/cadastro", "/recuperar", "/auth/callback", "/api/status"];
// Sites de prévia (/s/nome-da-empresa) são públicos: é o link que vai para o prospect.
const isPublic = (p: string) => PUBLIC.includes(p) || /^\/s\/[a-z0-9-]+$/.test(p);
// Exigem login, mas não fazer parte da equipe (trocar senha, aviso de acesso pendente).
const LOGGED_ONLY = ["/nova-senha", "/sem-acesso", "/api/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const deny = (status: number, message: string, to: string) =>
    isApi ? NextResponse.json({ error: { message } }, { status }) : NextResponse.redirect(new URL(to, req.url));

  if (!authConfigured()) {
    if (isPublic(pathname)) return NextResponse.next();
    return deny(503, "Login não configurado (SUPABASE_URL / SUPABASE_ANON_KEY).", "/login");
  }

  // Padrão @supabase/ssr: renova a sessão e repassa os cookies atualizados.
  let res = NextResponse.next({ request: req });
  const supabase = authClient({
    getAll: () => req.cookies.getAll(),
    setAll: (list) => {
      list.forEach(({ name, value }) => req.cookies.set(name, value));
      res = NextResponse.next({ request: req });
      list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  if (isPublic(pathname)) return res;
  if (!user) return deny(401, "Sessão expirada. Entre novamente.", `/login?next=${encodeURIComponent(pathname)}`);
  if (LOGGED_ONLY.includes(pathname)) return res;

  const role = await membership(user.email, user.user_metadata?.phone).catch(() => null);
  if (!role) return deny(403, "Seu e-mail ainda não foi liberado pelo administrador.", "/sem-acesso");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

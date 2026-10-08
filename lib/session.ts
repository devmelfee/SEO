import "server-only";
import { cookies } from "next/headers";
import { authClient, membership, type Role } from "./auth";

/** Usuário logado e papel na equipe, para rotas de API e páginas do servidor. */
export async function currentUser(): Promise<{ email: string; role: Role } | null> {
  const store = cookies();
  const supabase = authClient({
    getAll: () => store.getAll(),
    setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* chamado de Server Component: ignora */ } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const role = await membership(user.email);
  return role ? { email: user.email, role } : null;
}

import { C } from "@/components/styles";
import { LogoutButton } from "@/components/LogoutButton";
import { cookies } from "next/headers";
import { authClient } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** E-mail da sessão atual — mostrado para o usuário notar erro de digitação no cadastro ou na liberação. */
async function loggedEmail(): Promise<string> {
  try {
    const store = cookies();
    const supabase = authClient({ getAll: () => store.getAll(), setAll: () => {} });
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email ?? "";
  } catch { return ""; }
}

export default async function SemAcesso() {
  const email = await loggedEmail();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 420, background: C.panel, border: `1px solid ${C.borderBlue}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 28 }}>⏳</div>
        <h1 style={{ fontSize: 20, margin: "8px 0" }}>Acesso pendente</h1>
        <p style={{ color: C.body, fontSize: 14, lineHeight: 1.6 }}>
          Sua conta foi criada, mas o seu e-mail ainda não foi liberado. Peça ao administrador da agência para incluí-lo em
          <strong> Configurações → Equipe</strong>. Depois é só entrar de novo.
        </p>
        {email && (
          <p style={{ color: C.body, fontSize: 14, background: C.panel2, borderRadius: 10, padding: "10px 12px" }}>
            Você entrou como <strong style={{ wordBreak: "break-all" }}>{email}</strong>. O administrador precisa liberar exatamente este e-mail.
          </p>
        )}
        <LogoutButton />
      </div>
    </div>
  );
}

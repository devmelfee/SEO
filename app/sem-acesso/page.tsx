import { C } from "@/components/styles";
import { LogoutButton } from "@/components/LogoutButton";

export default function SemAcesso() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 420, background: C.panel, border: `1px solid ${C.borderBlue}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 28 }}>⏳</div>
        <h1 style={{ fontSize: 20, margin: "8px 0" }}>Acesso pendente</h1>
        <p style={{ color: C.body, fontSize: 14, lineHeight: 1.6 }}>
          Sua conta foi criada, mas o seu e-mail ainda não foi liberado. Peça ao administrador da agência para incluí-lo em
          <strong> Configurações → Equipe</strong>. Depois é só entrar de novo.
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}

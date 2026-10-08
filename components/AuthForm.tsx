"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { C, btn, input, primary } from "./styles";

type Mode = "login" | "cadastro" | "recuperar" | "nova-senha";

const TITLES: Record<Mode, string> = {
  login: "Entrar", cadastro: "Criar conta", recuperar: "Recuperar senha", "nova-senha": "Definir nova senha",
};

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada (e no spam).";
  if (/already registered|already been registered/i.test(msg)) return "Este e-mail já tem conta. Entre ou recupere a senha.";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  if (/same password|different from the old/i.test(msg)) return "A nova senha precisa ser diferente da anterior.";
  return msg;
}

export function AuthForm({ mode, url, anonKey, next = "/", initialError = "" }: {
  mode: Mode; url: string; anonKey: string; next?: string; initialError?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(initialError);
  const [done, setDone] = useState("");

  if (!url || !anonKey) {
    return (
      <Card title="Login não configurado">
        <p style={{ color: "#FCD34D", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          Na Vercel, em <strong>Settings → Environment Variables</strong>, cadastre <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code>
          {" "}(Supabase → Project Settings → API → chave <em>anon / publishable</em>) e faça <strong>Redeploy</strong>.
        </p>
      </Card>
    );
  }

  const supabase = createBrowserClient(url, anonKey);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(""); setDone("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = next;
        return;
      }
      if (mode === "cadastro") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (password !== password2) throw new Error("As senhas não conferem.");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback?next=/` } });
        if (error) throw error;
        // Supabase devolve usuário sem identidades quando o e-mail já existe (não revela por segurança).
        if (data.user && data.user.identities?.length === 0) throw new Error("already registered");
        setDone(`Enviamos um link de confirmação para ${email}. Abra o e-mail (confira o spam) neste mesmo navegador para ativar a conta.`);
      }
      if (mode === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/nova-senha` });
        if (error) throw error;
        setDone(`Se ${email} tiver conta, você vai receber um link para criar uma nova senha. Confira também o spam.`);
      }
      if (mode === "nova-senha") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (password !== password2) throw new Error("As senhas não conferem.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setDone("Senha alterada! Redirecionando…");
        setTimeout(() => (window.location.href = "/"), 1200);
      }
    } catch (e) { setErr(translate((e as Error).message)); }
    setBusy(false);
  };

  const showEmail = mode !== "nova-senha";
  const showPassword = mode !== "recuperar";
  const showConfirm = mode === "cadastro" || mode === "nova-senha";

  return (
    <Card title={TITLES[mode]}>
      {done ? (
        <p role="status" style={{ color: "#6EE7B7", fontSize: 14, lineHeight: 1.6 }}>✓ {done}</p>
      ) : (
        <form onSubmit={submit}>
          {showEmail && <Field id="email" label="E-mail">
            <input id="email" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
          </Field>}
          {showPassword && <Field id="pw" label={mode === "nova-senha" ? "Nova senha (mín. 8 caracteres)" : mode === "cadastro" ? "Senha (mín. 8 caracteres)" : "Senha"}>
            <input id="pw" type="password" required autoFocus={!showEmail} autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
          </Field>}
          {showConfirm && <Field id="pw2" label="Repita a senha">
            <input id="pw2" type="password" required autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} style={input} />
          </Field>}
          {err && <p role="alert" style={{ color: C.red, fontSize: 13, margin: "4px 0 0" }}>{err}</p>}
          <button type="submit" disabled={busy} style={btn(primary, "#fff", { width: "100%", marginTop: 16, padding: "12px 0", fontSize: 14 })}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "cadastro" ? "Criar conta" : mode === "recuperar" ? "Enviar link" : "Salvar nova senha"}
          </button>
        </form>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 18, fontSize: 13, flexWrap: "wrap" }}>
        {mode === "login" ? (
          <>
            <a href="/recuperar" style={{ color: C.blue }}>Esqueci minha senha</a>
            <a href="/cadastro" style={{ color: C.blue }}>Criar conta</a>
          </>
        ) : mode !== "nova-senha" && <a href="/login" style={{ color: C.blue }}>← Voltar para entrar</a>}
      </div>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400, background: C.panel, border: `1px solid ${C.borderBlue}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>📍</div>
        <div style={{ color: C.muted, fontSize: 12 }}>SEO Local Agency</div>
        <h1 style={{ margin: "2px 0 18px", fontSize: 20 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

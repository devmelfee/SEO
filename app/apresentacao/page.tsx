import type { Metadata } from "next";
import { db, supabaseConfigured } from "@/lib/supabase";
import { whatsappNumber } from "@/lib/site";

// Página pública de apresentação do produto. Sem JavaScript no navegador: só HTML e CSS.
export const revalidate = 300;

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

async function agency(): Promise<{ name: string; whatsapp: string }> {
  if (!supabaseConfigured()) return { name: "", whatsapp: "" };
  try {
    const { data } = await db().from("agency_settings").select("name,whatsapp").eq("id", SETTINGS_ID).maybeSingle();
    return { name: data?.name ?? "", whatsapp: data?.whatsapp ?? "" };
  } catch { return { name: "", whatsapp: "" }; }
}

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await agency();
  const brand = name || "SEO Local";
  return {
    title: `${brand} — encontre, aborde e feche clientes de SEO local`,
    description: "Ache empresas que estão perdendo clientes no Google, chame no WhatsApp com a mensagem pronta e envie site de prévia e proposta com o nome da empresa.",
    robots: { index: true, follow: true },
    openGraph: { images: ["/apresentacao/tela-buscar.png"] },
  };
}

const STEPS = [
  { n: "1", t: "Buscar", d: "Digite o nicho e a cidade. O sistema traz as empresas do Google Maps e dá uma nota de oportunidade: sem site, poucas avaliações, perfil incompleto.", img: "tela-buscar.png", alt: "Tela de busca com empresas ordenadas pela nota de oportunidade" },
  { n: "2", t: "Abordar", d: "A mensagem já vem escrita com o problema daquela empresa. Um toque abre o WhatsApp; os lembretes do 2º e do 5º dia ficam agendados.", img: "tela-abordagem.png", alt: "Tela de abordagem com a mensagem pronta e o botão Enviar no WhatsApp" },
  { n: "3", t: "Propor", d: "Gere um site de prévia e a proposta com o nome da empresa, os concorrentes reais e o seu preço. O cliente aceita pelo link.", img: "tela-proposta.png", alt: "Tela da proposta com o nome da empresa" },
  { n: "4", t: "Entregar", d: "Depois do sim: descrição, serviços, perguntas, respostas a avaliações, calendário de posts e diretórios — prontos para colar no Google.", img: "tela-entrega.png", alt: "Etapa de entrega com os textos para o Perfil do Google" },
];

const PROFILES = [
  { t: "Para quem é prático", d: "Abre o app, vê quem chamar hoje e envia. Um botão por ação, sem planilha.", items: ["Fila do dia com novos e lembretes", "Mensagem pronta e editável", "Envio um a um, com intervalo seguro"] },
  { t: "Para quem analisa", d: "Decide onde vale prospectar antes de gastar tempo e dinheiro.", items: ["Compara cidades pelo índice de oportunidade", "Projetos com funil por etapa", "Custo de cada busca e de cada texto de IA"] },
  { t: "Para quem executa", d: "Sai da venda direto para a entrega, com tudo no mesmo cliente.", items: ["4 etapas: Cliente, Diagnóstico, Proposta, Entrega", "Textos do Perfil do Google gerados com IA", "Relatório para o cliente"] },
];

const FAQ = [
  { q: "Preciso entender de SEO?", a: "Não. O sistema aponta o que falta em cada empresa em linguagem simples e já sugere a mensagem e a proposta. Você revisa e envia." },
  { q: "Ele dispara mensagens em massa?", a: "Não, de propósito. Cada mensagem sai do seu WhatsApp com um clique seu, com intervalo entre envios — disparo em massa é o que faz o número ser bloqueado." },
  { q: "Funciona no celular?", a: "Sim. Foi desenhado primeiro para o celular: busca, abordagem e proposta cabem na palma da mão." },
  { q: "Como controlo os gastos da equipe?", a: "Cada consulta ao Google e cada texto de IA fica registrado, com custo. O administrador define limites por pessoa e escolhe o modelo de IA (rápido, equilibrado ou premium)." },
  { q: "O cliente final precisa instalar algo?", a: "Não. Ele recebe links: o site de prévia e a proposta, que abre no celular e pode ser salva em PDF. Para aceitar, é um botão." },
];

export default async function Apresentacao() {
  const { name, whatsapp } = await agency();
  const brand = name || "SEO Local";
  const wa = whatsappNumber(whatsapp);
  const cta = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Olá! Vi a apresentação do ${brand} e quero conhecer o sistema.`)}` : "/login";
  const ctaLabel = wa ? "Quero conhecer" : "Entrar";

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="lp-top">
        <div className="lp-wrap lp-top-in">
          <a href="#inicio" className="lp-brand"><span className="lp-mark" aria-hidden>{brand.charAt(0).toUpperCase()}</span>{brand}</a>
          <nav className="lp-links" aria-label="Seções">
            <a href="#como-funciona">Como funciona</a><a href="#perfis">Para quem</a><a href="#perguntas">Perguntas</a>
          </nav>
          <div className="lp-top-cta"><a href="/login" className="lp-btn lp-btn-ghost">Entrar</a>{wa && <a href={cta} className="lp-btn lp-btn-main" target="_blank" rel="noopener">Quero conhecer</a>}</div>
        </div>
      </header>

      <main id="inicio">
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-in">
            <div>
              <p className="lp-eyebrow">Prospecção de SEO local, do Google Maps ao contrato</p>
              <h1>Encontre empresas perdendo clientes no Google. Feche pelo WhatsApp.</h1>
              <p className="lp-lead">O sistema acha quem está mal posicionado na sua cidade, escreve a mensagem certa para cada um e monta o site de prévia e a proposta com o nome da empresa.</p>
              <div className="lp-cta-row">
                <a href={cta} className="lp-btn lp-btn-main lp-btn-lg" target={wa ? "_blank" : undefined} rel="noopener">{ctaLabel}</a>
                <a href="#como-funciona" className="lp-btn lp-btn-ghost lp-btn-lg">Ver como funciona</a>
              </div>
              <ul className="lp-proof">
                <li>Funciona no celular</li><li>Sem disparo em massa</li><li>Custos sob controle</li>
              </ul>
            </div>
            <figure className="lp-phone lp-phone-hero"><img src="/apresentacao/tela-buscar.png" alt="Tela de busca do sistema no celular" width={390} height={780} /></figure>
          </div>
        </section>

        <section className="lp-band">
          <div className="lp-wrap lp-band-in">
            <p><strong>O problema:</strong> boa parte das empresas de bairro aparece mal no Google — sem site, com poucas avaliações, com o perfil pela metade.</p>
            <p><strong>A oportunidade:</strong> elas não sabem disso. Quem chega com o diagnóstico pronto e o nome delas na proposta, fecha.</p>
          </div>
        </section>

        <section id="como-funciona" className="lp-sec">
          <div className="lp-wrap">
            <h2>Como funciona</h2>
            <p className="lp-sub">Quatro passos, na ordem em que a venda acontece.</p>
            <div className="lp-steps">
              {STEPS.map((s) => (
                <article key={s.n} className="lp-step">
                  <figure className="lp-phone"><img src={`/apresentacao/${s.img}`} alt={s.alt} width={390} height={780} loading="lazy" /></figure>
                  <div><span className="lp-num">{s.n}</span><h3>{s.t}</h3><p>{s.d}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec lp-soft">
          <div className="lp-wrap lp-two">
            <div>
              <h2>O que o seu cliente recebe</h2>
              <p className="lp-sub">Dois links que vendem por você.</p>
              <ul className="lp-check">
                <li><strong>Site de prévia</strong> com o nome, o telefone, o endereço e o horário da empresa — e botão de WhatsApp.</li>
                <li><strong>Proposta com o nome da empresa</strong>, os problemas encontrados, a comparação com os concorrentes do Google e o seu preço.</li>
                <li><strong>Botão “Aceitar proposta”</strong>: o lead vira fechado e você é avisado no WhatsApp.</li>
              </ul>
            </div>
            <div className="lp-pair">
              <figure className="lp-phone"><img src="/apresentacao/site-previa.png" alt="Site de prévia de uma empresa local" width={390} height={780} loading="lazy" /></figure>
              <figure className="lp-phone"><img src="/apresentacao/proposta-cliente.png" alt="Proposta com o nome da empresa" width={390} height={780} loading="lazy" /></figure>
            </div>
          </div>
        </section>

        <section id="perfis" className="lp-sec">
          <div className="lp-wrap">
            <h2>Cada pessoa da equipe vai direto ao que importa</h2>
            <div className="lp-cards">
              {PROFILES.map((p) => (
                <article key={p.t} className="lp-card">
                  <h3>{p.t}</h3><p>{p.d}</p>
                  <ul className="lp-check lp-check-sm">{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec lp-soft">
          <div className="lp-wrap lp-two">
            <div>
              <h2>Gastos visíveis, limites por pessoa</h2>
              <p className="lp-sub">Você sabe quanto custa cada busca e cada texto antes de a fatura chegar.</p>
              <ul className="lp-check">
                <li>Registro de cada consulta ao Google e de cada geração de IA, por pessoa</li>
                <li>Limites por janela de horas e por semana; pedido de mais buscas pelo WhatsApp</li>
                <li>Escolha do modelo de IA com o comparativo de custo de cada um</li>
              </ul>
            </div>
            <div className="lp-cost">
              <div><span>Busca no Google (20 empresas)</span><strong>≈ R$ 0,20</strong></div>
              <div><span>Texto com IA (modelo rápido)</span><strong>≈ R$ 0,01</strong></div>
              <div><span>Site com IA (modelo premium)</span><strong>≈ R$ 1,20</strong></div>
              <p>Estimativas pela tabela de preços do Google e da Anthropic; o valor real de cada uso aparece no painel.</p>
            </div>
          </div>
        </section>

        <section id="perguntas" className="lp-sec">
          <div className="lp-wrap lp-narrow">
            <h2>Perguntas frequentes</h2>
            {FAQ.map((f) => (
              <details key={f.q} className="lp-faq"><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-wrap lp-narrow">
            <h2>Comece pela sua cidade hoje.</h2>
            <p>Escolha um nicho, veja quem está perdendo clientes e mande a primeira mensagem em minutos.</p>
            <a href={cta} className="lp-btn lp-btn-light lp-btn-lg" target={wa ? "_blank" : undefined} rel="noopener">{wa ? "Falar no WhatsApp" : "Entrar"}</a>
          </div>
        </section>
      </main>

      <footer className="lp-foot"><div className="lp-wrap">{brand} · Prospecção e SEO local</div></footer>
    </div>
  );
}

const CSS = `
.lp{background:#fff;color:#0f172a;font-size:16px;line-height:1.6}
.lp a{color:inherit;text-decoration:none}
.lp-wrap{max-width:1120px;margin:0 auto;padding:0 20px}.lp-narrow{max-width:760px}
.lp-top{position:sticky;top:0;z-index:20;background:#ffffffee;backdrop-filter:blur(8px);border-bottom:1px solid #e2e8f0}
.lp-top-in{display:flex;align-items:center;justify-content:space-between;gap:16px;height:64px}
.lp-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px}
.lp-mark{width:30px;height:30px;border-radius:8px;background:#0f766e;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}
.lp-links{display:flex;gap:24px;font-size:14.5px;color:#475569}.lp-links a:hover{color:#0f172a}
.lp-top-cta{display:flex;gap:8px}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;padding:10px 16px;font-weight:600;font-size:14.5px;white-space:nowrap}
.lp-btn-lg{padding:14px 22px;font-size:16px}
.lp-btn-main{background:#0f766e;color:#fff !important}.lp-btn-main:hover{background:#115e59}
.lp-btn-ghost{border:1px solid #cbd5e1;color:#0f172a}.lp-btn-ghost:hover{background:#f8fafc}
.lp-btn-light{background:#fff;color:#0f766e !important}
.lp-hero{background:linear-gradient(#f0fdfa,#fff);padding:64px 0 56px}
.lp-hero-in{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center}
.lp-eyebrow{margin:0 0 12px;color:#0f766e;font-weight:600;font-size:14px}
.lp h1{font-size:clamp(32px,5vw,52px);line-height:1.08;letter-spacing:-.02em;margin:0 0 18px}
.lp-lead{font-size:clamp(17px,2vw,19px);color:#475569;margin:0 0 26px;max-width:560px}
.lp-cta-row{display:flex;gap:10px;flex-wrap:wrap}
.lp-proof{display:flex;gap:18px;flex-wrap:wrap;list-style:none;padding:0;margin:22px 0 0;color:#475569;font-size:14px}
.lp-proof li:before{content:"✓";color:#0f766e;font-weight:700;margin-right:6px}
.lp-phone{margin:0;border-radius:28px;border:8px solid #0f172a;overflow:hidden;background:#0f172a;box-shadow:0 24px 60px #0f172a26;max-width:300px;width:100%}
.lp-phone img{display:block;width:100%;height:auto}
.lp-phone-hero{justify-self:center;max-width:320px}
.lp-band{background:#0f172a;color:#e2e8f0;padding:28px 0}
.lp-band-in{display:grid;grid-template-columns:1fr 1fr;gap:24px}.lp-band p{margin:0;font-size:16.5px}.lp-band strong{color:#fff}
.lp-sec{padding:72px 0}.lp-soft{background:#f8fafc;border-top:1px solid #eef2f6;border-bottom:1px solid #eef2f6}
.lp h2{font-size:clamp(26px,3.4vw,36px);line-height:1.15;letter-spacing:-.015em;margin:0 0 10px}
.lp-sub{color:#64748b;font-size:17px;margin:0 0 32px}
.lp-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:28px}
.lp-step{display:flex;flex-direction:column;gap:18px}.lp-step .lp-phone{max-width:240px;align-self:center}
.lp-step h3{margin:6px 0 6px;font-size:19px}.lp-step p{margin:0;color:#475569;font-size:15px}
.lp-num{display:inline-flex;width:28px;height:28px;border-radius:50%;background:#0f766e;color:#fff;font-weight:700;font-size:14px;align-items:center;justify-content:center}
.lp-two{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.lp-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.lp-pair .lp-phone{max-width:240px;justify-self:center}
.lp-check{list-style:none;padding:0;margin:0;display:grid;gap:14px}
.lp-check li{position:relative;padding-left:30px;color:#334155}.lp-check li:before{content:"✓";position:absolute;left:0;top:0;width:20px;height:20px;border-radius:50%;background:#ccfbf1;color:#0f766e;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:3px}
.lp-check-sm{gap:8px;margin-top:14px}.lp-check-sm li{font-size:15px}
.lp-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}
.lp-card{border:1px solid #e2e8f0;border-radius:14px;padding:24px}.lp-card h3{margin:0 0 6px;font-size:19px}.lp-card>p{margin:0;color:#475569}
.lp-cost{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:8px 20px 16px}
.lp-cost div{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #f1f5f9}.lp-cost span{color:#475569}.lp-cost strong{white-space:nowrap}
.lp-cost p{margin:12px 0 0;color:#94a3b8;font-size:13px}
.lp-faq{border-bottom:1px solid #e2e8f0;padding:16px 0}.lp-faq summary{cursor:pointer;font-weight:600;font-size:17px;list-style:none;display:flex;justify-content:space-between;gap:12px}
.lp-faq summary:after{content:"+";color:#0f766e;font-size:22px;line-height:1}.lp-faq[open] summary:after{content:"–"}.lp-faq p{margin:10px 0 0;color:#475569}
.lp-final{background:#0f766e;color:#fff;text-align:center;padding:72px 0}.lp-final h2{color:#fff}.lp-final p{color:#ccfbf1;font-size:18px;margin:0 0 26px}
.lp-foot{padding:28px 0;color:#94a3b8;font-size:14px;text-align:center}
@media(max-width:960px){.lp-steps{grid-template-columns:1fr 1fr;row-gap:44px}.lp-cards{grid-template-columns:1fr}}
@media(max-width:820px){
 .lp-links{display:none}.lp-top-cta .lp-btn-ghost{display:none}
 .lp-hero{padding:36px 0 40px}.lp-hero-in{grid-template-columns:1fr;gap:32px}.lp-phone-hero{max-width:260px}
 .lp-band-in,.lp-two{grid-template-columns:1fr;gap:28px}.lp-sec{padding:52px 0}
 .lp-cta-row .lp-btn{flex:1 1 100%}
}
@media(max-width:560px){.lp-steps{grid-template-columns:1fr}.lp-step{flex-direction:row;align-items:flex-start;gap:16px}.lp-step .lp-phone{max-width:130px;border-width:5px;border-radius:18px;flex-shrink:0}
 .lp-pair .lp-phone{border-width:5px;border-radius:18px}}
`;

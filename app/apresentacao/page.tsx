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
    title: `${brand}: ache, aborde e feche clientes de SEO local pelo WhatsApp`,
    description: "Para consultores e agências de SEO local: ache na sua cidade as empresas que estão perdendo clientes no Google, chame no WhatsApp com a mensagem pronta e envie site de prévia e proposta com o nome da empresa.",
    robots: { index: true, follow: true },
    openGraph: { images: ["/apresentacao/tela-buscar.png"] },
  };
}

// Preço público: fica DESLIGADO até o dono aprovar os valores de docs/oferta-e-preco.md.
// Ligar = trocar para true. Os números vivem só aqui.
const PRICING_PUBLISHED = false;
const PLANS = [
  { name: "Solo", price: "R$ 197", who: "Para o consultor que prospecta sozinho", items: ["1 pessoa", "100 buscas por mês (2.000 empresas)", "Abordagem, site de prévia e proposta ilimitados"] },
  { name: "Agência", price: "R$ 397", who: "Para quem tem vendedor e quem entrega", items: ["Até 5 pessoas", "300 buscas por mês (6.000 empresas)", "Limites e gastos por pessoa", "API e planilha para o seu CRM"], featured: true },
  { name: "Rede", price: "R$ 897", who: "Para várias equipes ou cidades", items: ["Até 15 pessoas", "1.000 buscas por mês (20.000 empresas)", "Tudo do plano Agência"] },
];

const STEPS = [
  { n: "1", t: "Buscar", d: "Digite o nicho e a cidade. Cada empresa do Google Maps volta com uma nota de 0 a 100 e o motivo: sem site, poucas avaliações, perfil pela metade.", img: "tela-buscar.png", alt: "Tela de busca com empresas ordenadas pela nota de oportunidade" },
  { n: "2", t: "Abordar", d: "A mensagem já cita o problema daquela empresa. Um toque abre o seu WhatsApp, e os lembretes do 2º e do 5º dia ficam agendados.", img: "tela-abordagem.png", alt: "Tela de abordagem com a mensagem pronta e o botão Enviar no WhatsApp" },
  { n: "3", t: "Propor", d: "Site de prévia e proposta com o nome da empresa, os concorrentes que aparecem na frente e o seu preço. O cliente aceita por um link.", img: "tela-proposta.png", alt: "Tela da proposta com o nome da empresa" },
  { n: "4", t: "Entregar", d: "Depois do sim, os textos do Perfil do Google saem prontos para colar: descrição, serviços, perguntas, respostas a avaliações e posts.", img: "tela-entrega.png", alt: "Etapa de entrega com os textos para o Perfil do Google" },
];

const PROFILES = [
  { t: "Quem vende", d: "Abre o app e vê quem chamar hoje, com a mensagem escrita.", items: ["Fila do dia com novos contatos e lembretes", "Envio um por um, com intervalo seguro", "Contato inválido sai da fila"] },
  { t: "Quem decide onde prospectar", d: "Compara cidades antes de gastar tempo e dinheiro.", items: ["Ranking de cidades por oportunidade no seu nicho", "Projetos com funil por etapa", "Custo de cada busca e de cada texto"] },
  { t: "Quem entrega", d: "Sai da venda para a entrega sem reabrir planilha.", items: ["Cliente, diagnóstico, proposta e entrega no mesmo lugar", "Textos do Perfil do Google com IA", "Relatório para o cliente"] },
];

const FAQ = [
  { q: "Preciso entender de SEO?", a: "Não. O sistema mostra o que falta em cada empresa em português simples e sugere a mensagem e a proposta. Você revisa e envia." },
  { q: "Meu WhatsApp corre risco de bloqueio?", a: "O app não dispara mensagens. Cada uma sai do seu WhatsApp com um toque seu, com 45 a 90 segundos entre uma e outra, que é o ritmo de uma pessoa." },
  { q: "Os contatos do Google não são desatualizados?", a: "Alguns são. Por isso dá para conferir o site, consultar o CNPJ na Receita (situação e quadro de sócios) e marcar o contato como inválido, o que o tira da fila." },
  { q: "Funciona no celular?", a: "Foi desenhado primeiro para o celular. Busca, abordagem e proposta cabem numa mão." },
  { q: "Já uso um CRM. Preciso trocar?", a: "Não. Os leads saem por planilha ou por API para o CRM que você já usa. O app faz o que o CRM não faz: o diagnóstico, a mensagem e a proposta." },
  { q: "O cliente final precisa instalar algo?", a: "Ele recebe dois links: o site de prévia e a proposta. A proposta abre no celular, pode ser salva em PDF e tem o botão de aceitar." },
];

export default async function Apresentacao() {
  const { name, whatsapp } = await agency();
  const brand = name || "SEO Local";
  const wa = whatsappNumber(whatsapp);
  const msg = (t: string) => (wa ? `https://wa.me/${wa}?text=${encodeURIComponent(t)}` : "/login");
  const cta = msg(`Olá! Vi a apresentação do ${brand} e quero testar na minha cidade.`);
  const ctaLabel = wa ? "Quero testar na minha cidade" : "Entrar";
  const ext = wa ? { target: "_blank", rel: "noopener" } : {};

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="lp-top">
        <div className="lp-wrap lp-top-in">
          <a href="#inicio" className="lp-brand"><span className="lp-mark" aria-hidden>{brand.charAt(0).toUpperCase()}</span>{brand}</a>
          <nav className="lp-links" aria-label="Seções">
            <a href="#como-funciona">Como funciona</a><a href="#para-quem">Para quem</a>{PRICING_PUBLISHED && <a href="#planos">Planos</a>}<a href="#perguntas">Perguntas</a>
          </nav>
          <div className="lp-top-cta"><a href="/login" className="lp-btn lp-btn-ghost">Entrar</a>{wa && <a href={cta} className="lp-btn lp-btn-main" {...ext}>Quero testar</a>}</div>
        </div>
      </header>

      <main id="inicio">
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-in">
            <div>
              <h1>Ache na sua cidade quem está perdendo clientes no Google. Feche pelo WhatsApp.</h1>
              <p className="lp-lead">Escolha um nicho e uma cidade. Em minutos você vê quem não tem site, tem poucas avaliações ou deixou o perfil pela metade, com a mensagem de WhatsApp pronta para cada empresa.</p>
              <div className="lp-cta-row">
                <a href={cta} className="lp-btn lp-btn-main lp-btn-lg" {...ext}>{ctaLabel}</a>
                <a href="#como-funciona" className="lp-btn lp-btn-ghost lp-btn-lg">Ver como funciona</a>
              </div>
              <p className="lp-note">Você fala com uma pessoa, não com um robô. Respondemos no mesmo dia.</p>
            </div>
            <figure className="lp-phone lp-phone-hero"><img src="/apresentacao/tela-buscar.png" alt="Tela de busca do sistema no celular" width={390} height={780} /></figure>
          </div>
        </section>

        <section className="lp-band" aria-label="O tamanho da oportunidade">
          <div className="lp-wrap lp-band-in">
            <p className="lp-stat"><strong>438 de 684</strong> empresas que analisamos em Jundiaí não tinham site próprio.</p>
            <p>Os donos quase nunca sabem disso. Quem chega com o problema apontado e o nome da empresa na proposta sai na frente do concorrente que só manda “trabalho com marketing digital”.</p>
          </div>
        </section>

        <section id="como-funciona" className="lp-sec">
          <div className="lp-wrap">
            <h2>Do Google Maps ao contrato, na ordem em que a venda acontece</h2>
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
              <h2>O dono da empresa vê o site dele antes de pagar</h2>
              <p className="lp-sub">Você manda dois links, e eles fazem a maior parte da venda.</p>
              <ul className="lp-check">
                <li><strong>Site de prévia</strong> com nome, telefone, endereço, horário e botão de WhatsApp da empresa.</li>
                <li><strong>Proposta com o nome da empresa</strong>, os problemas encontrados, a comparação com os concorrentes do Google, a garantia e o seu preço.</li>
                <li><strong>Botão “Aceitar proposta”</strong>, que marca o cliente como fechado e abre o seu WhatsApp para combinar o início.</li>
              </ul>
            </div>
            <div className="lp-pair">
              <figure className="lp-phone"><img src="/apresentacao/site-previa.png" alt="Site de prévia de uma empresa local" width={390} height={780} loading="lazy" /></figure>
              <figure className="lp-phone"><img src="/apresentacao/proposta-cliente.png" alt="Proposta com o nome da empresa" width={390} height={780} loading="lazy" /></figure>
            </div>
          </div>
        </section>

        <section id="para-quem" className="lp-sec">
          <div className="lp-wrap">
            <h2>Feito para consultores e pequenas agências de marketing local</h2>
            <p className="lp-sub">Cada pessoa da equipe abre o app e cai direto no que precisa fazer.</p>
            <div className="lp-cols">
              {PROFILES.map((p) => (
                <div key={p.t} className="lp-col">
                  <h3>{p.t}</h3><p>{p.d}</p>
                  <ul className="lp-check lp-check-sm">{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {PRICING_PUBLISHED && (
          <section id="planos" className="lp-sec lp-soft">
            <div className="lp-wrap">
              <h2>Um cliente fechado paga o mês inteiro</h2>
              <p className="lp-sub">Um cliente de SEO local costuma pagar de R$ 500 a R$ 1.500 por mês. Escolha pelo tamanho da equipe.</p>
              <div className="lp-plans">
                {PLANS.map((p) => (
                  <div key={p.name} className={`lp-plan${p.featured ? " lp-plan-on" : ""}`}>
                    {p.featured && <span className="lp-tag">Mais escolhido</span>}
                    <h3>{p.name}</h3>
                    <p className="lp-price"><strong>{p.price}</strong> por mês</p>
                    <p className="lp-who">{p.who}</p>
                    <ul className="lp-check lp-check-sm">{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
                    <a href={msg(`Olá! Quero o plano ${p.name} do ${brand}.`)} className={`lp-btn ${p.featured ? "lp-btn-main" : "lp-btn-ghost"}`} {...ext}>Quero o plano {p.name}</a>
                  </div>
                ))}
              </div>
              <p className="lp-guar"><strong>Garantia da primeira proposta:</strong> se em 7 dias você não tiver mandado ao menos uma proposta usando o app, devolvemos o primeiro mês.</p>
            </div>
          </section>
        )}

        <section className="lp-sec">
          <div className="lp-wrap lp-two">
            <div>
              <h2>Você sabe quanto cada busca custou</h2>
              <p className="lp-sub">Cada consulta ao Google e cada texto de IA fica registrado por pessoa, com o custo. O dono define limites e escolhe o modelo de IA.</p>
            </div>
            <div className="lp-cost">
              <div><span>Busca no Google (20 empresas)</span><strong>≈ R$ 0,20</strong></div>
              <div><span>Texto com IA (modelo rápido)</span><strong>≈ R$ 0,01</strong></div>
              <div><span>Site com IA (modelo premium)</span><strong>≈ R$ 1,20</strong></div>
              <p>Estimativas pela tabela de preços do Google e da Anthropic. O valor real de cada uso aparece no painel.</p>
            </div>
          </div>
        </section>

        <section id="perguntas" className="lp-sec lp-soft">
          <div className="lp-wrap lp-narrow">
            <h2>Perguntas frequentes</h2>
            {FAQ.map((f) => (
              <details key={f.q} className="lp-faq"><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-wrap lp-narrow">
            <h2>Escolha um nicho e uma cidade. Mande a primeira mensagem hoje.</h2>
            <p>Mostramos o sistema funcionando na sua cidade, com empresas de verdade.</p>
            <a href={cta} className="lp-btn lp-btn-light lp-btn-lg" {...ext}>{ctaLabel}</a>
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
.lp h1{font-size:clamp(32px,5vw,52px);line-height:1.08;letter-spacing:-.02em;margin:0 0 18px}
.lp-lead{font-size:clamp(17px,2vw,19px);color:#475569;margin:0 0 26px;max-width:560px}
.lp-cta-row{display:flex;gap:10px;flex-wrap:wrap}
.lp-note{margin:16px 0 0;color:#64748b;font-size:14.5px}
.lp-phone{margin:0;border-radius:28px;border:8px solid #0f172a;overflow:hidden;background:#0f172a;box-shadow:0 24px 60px #0f172a26;max-width:300px;width:100%}
.lp-phone img{display:block;width:100%;height:auto}
.lp-phone-hero{justify-self:center;max-width:320px}
.lp-band{background:#0f172a;color:#e2e8f0;padding:28px 0}
.lp-band-in{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center}.lp-band p{margin:0;font-size:16.5px}.lp-band strong{color:#fff}
.lp-band .lp-stat{font-size:clamp(20px,2.4vw,26px);line-height:1.3;color:#cbd5e1}.lp-stat strong{display:block;font-size:clamp(34px,4.5vw,48px);line-height:1.05;letter-spacing:-.02em}
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
.lp-check li{position:relative;padding-left:30px;color:#334155}.lp-check li:before{content:"";position:absolute;left:0;top:3px;width:20px;height:20px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='10' fill='%23ccfbf1'/%3E%3Cpath d='M6 10.5l2.6 2.6L14 7.6' fill='none' stroke='%230f766e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center/20px 20px}
.lp-check-sm{gap:8px;margin-top:14px}.lp-check-sm li{font-size:15px}
.lp-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}
.lp-col{border-top:2px solid #0f172a;padding-top:18px}.lp-col h3{margin:0 0 6px;font-size:19px}.lp-col>p{margin:0;color:#475569}
.lp-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}
.lp-plan{position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:6px}
.lp-plan h3{margin:0;font-size:19px}.lp-plan .lp-btn{margin-top:18px}
.lp-plan-on{border:2px solid #0f766e;padding:23px}
.lp-tag{position:absolute;top:-12px;left:22px;background:#0f766e;color:#fff;font-size:12.5px;font-weight:600;border-radius:999px;padding:2px 10px}
.lp-price{margin:4px 0 0;color:#64748b}.lp-price strong{font-size:32px;color:#0f172a;letter-spacing:-.02em;margin-right:4px}
.lp-who{margin:0;color:#475569;font-size:15px}
.lp-guar{margin:28px 0 0;padding:16px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;color:#334155;max-width:760px}
.lp-cost{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:8px 20px 16px}
.lp-cost div{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #f1f5f9}.lp-cost span{color:#475569}.lp-cost strong{white-space:nowrap}
.lp-cost p{margin:12px 0 0;color:#94a3b8;font-size:13px}
.lp-faq{border-bottom:1px solid #e2e8f0;padding:16px 0}.lp-faq summary{cursor:pointer;font-weight:600;font-size:17px;list-style:none;display:flex;justify-content:space-between;gap:12px}
.lp-faq summary:after{content:"+";color:#0f766e;font-size:22px;line-height:1}.lp-faq[open] summary:after{content:"–"}.lp-faq p{margin:10px 0 0;color:#475569}
.lp-final{background:#0f766e;color:#fff;text-align:center;padding:72px 0}.lp-final h2{color:#fff}.lp-final p{color:#ccfbf1;font-size:18px;margin:0 0 26px}
.lp-foot{padding:28px 0;color:#94a3b8;font-size:14px;text-align:center}
@media(max-width:960px){.lp-steps{grid-template-columns:1fr 1fr;row-gap:44px}.lp-cols,.lp-plans{grid-template-columns:1fr;gap:28px}}
@media(max-width:820px){
 .lp-links{display:none}.lp-top-cta .lp-btn-ghost{display:none}
 .lp-hero{padding:36px 0 40px}.lp-hero-in{grid-template-columns:1fr;gap:32px}.lp-phone-hero{max-width:260px}
 .lp-band-in,.lp-two{grid-template-columns:1fr;gap:28px}.lp-sec{padding:52px 0}
 .lp-cta-row .lp-btn{flex:1 1 100%}
}
@media(max-width:560px){.lp-steps{grid-template-columns:1fr}.lp-step{flex-direction:row;align-items:flex-start;gap:16px}.lp-step .lp-phone{max-width:130px;border-width:5px;border-radius:18px;flex-shrink:0}
 .lp-pair .lp-phone{border-width:5px;border-radius:18px}}
`;

import { brl, JUNDIAI, JUNDIAI_PCT } from "@/lib/landing";
import { Icon } from "./Icon";

export type Cta = { href: string; label: string };
export const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {});

export function Header({ brand, cta, links, login = true }: { brand: string; cta: Cta | null; links: [string, string][]; login?: boolean }) {
  return (
    <header className="lp-top">
      <div className="lp-wrap lp-top-in">
        <a href="#inicio" className="lp-brand"><span className="lp-mark" aria-hidden>{brand.charAt(0).toUpperCase()}</span>{brand}</a>
        <nav className="lp-links" aria-label="Seções">{links.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</nav>
        <div className="lp-top-cta">
          {login && <a href="/login" className="lp-btn lp-btn-ghost lp-hide-sm">Entrar</a>}
          {cta && <a href={cta.href} className="lp-btn lp-btn-main" {...ext(cta.href)}>{cta.label}</a>}
        </div>
      </div>
    </header>
  );
}

export function Footer({ brand, also }: { brand: string; also: [string, string][] }) {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap lp-foot-in">
        <span>{brand} · prospecção e SEO local pelo WhatsApp</span>
        <nav aria-label="Outras páginas">{also.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</nav>
      </div>
    </footer>
  );
}

/** O dado real que sustenta a página inteira. */
export function ProofBand() {
  return (
    <section className="lp-band" aria-label="O tamanho da oportunidade">
      <div className="lp-wrap lp-band-in">
        <p className="lp-stat"><strong>{JUNDIAI.semSite} de {JUNDIAI.analisadas}</strong> empresas que analisamos em Jundiaí não tinham site próprio.</p>
        <div className="lp-band-bar" role="img" aria-label={`${JUNDIAI_PCT}% sem site`}>
          {Array.from({ length: 50 }).map((_, i) => <i key={i} data-on={i < Math.round(JUNDIAI_PCT / 2)} />)}
        </div>
        <p>Os donos quase nunca sabem disso. Quem chega com o problema apontado e o nome da empresa na proposta sai na frente de quem manda “trabalho com marketing digital”.</p>
      </div>
    </section>
  );
}

const LOSSES: [string, string][] = [
  ["Empresas boas que você nunca viu, porque estavam na segunda página do Maps.", "A busca analisa até 20 por consulta e ordena pela nota de oportunidade."],
  ["Respostas que não vieram porque o segundo contato ficou para depois.", "Os lembretes do 2º e do 5º dia entram na fila do dia, com um argumento novo."],
  ["Mensagens para o número da recepção, ou para um número que não existe mais.", "A validação consulta a Receita, acha o sócio que decide e tira o inválido da fila."],
  ["Propostas que esfriaram enquanto você montava o site na mão.", "Site de prévia e proposta com o nome da empresa saem no mesmo dia da conversa."],
  ["Clientes que cancelam porque não viram resultado.", "O relatório do mês mostra ligações, rotas e o que foi feito, no WhatsApp deles."],
];

/** Aversão à perda: o que fica na mesa sem o sistema, e o módulo que resolve cada perda. */
export function LossList({ title = "O que fica na mesa quando a prospecção é feita na mão" }: { title?: string }) {
  return (
    <section className="lp-sec" id="perdas">
      <div className="lp-wrap">
        <h2>{title}</h2>
        <ol className="lp-loss">
          {LOSSES.map(([l, f]) => (
            <li key={l}>
              <p className="lp-loss-l"><Icon name="x" size={18} />{l}</p>
              <p className="lp-loss-f"><Icon name="check" size={18} />{f}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FUNNEL: [string, number][] = [["Empresas analisadas", 240], ["Abordadas no WhatsApp", 60], ["Responderam", 14], ["Receberam proposta", 6], ["Fecharam", 2]];

/** Resultado de exemplo: um mês de um consultor. Rotulado como ilustrativo, sempre. */
export function ExampleFunnel({ mensalidade = 997 }: { mensalidade?: number }) {
  const max = FUNNEL[0][1];
  return (
    <section className="lp-sec lp-soft" id="exemplo">
      <div className="lp-wrap lp-two">
        <div>
          <h2>Um mês de prospecção, do mapa ao contrato</h2>
          <p className="lp-sub">Um consultor sozinho, um nicho e duas cidades. Cada etapa é uma tela do sistema, e o funil inteiro fica registrado nos projetos.</p>
          <p className="lp-result"><strong>{brl(2 * mensalidade)}</strong> por mês em contratos recorrentes, com <strong>{brl(24 * 0.2 + 30 * 0.05)}</strong> gastos em buscas e textos de IA.</p>
          <p className="lp-flag">Exemplo ilustrativo, não é resultado de cliente.</p>
        </div>
        <ol className="lp-funnel" aria-label="Funil de exemplo">
          {FUNNEL.map(([l, n]) => (
            <li key={l}><span className="lp-funnel-bar" style={{ width: `${Math.max(10, (n / max) * 100)}%` }}><b>{n}</b></span><span>{l}</span></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** A página que o consultor manda para o dono: vira argumento de venda do app. */
export function OwnerTeaser() {
  return (
    <section className="lp-sec">
      <div className="lp-wrap lp-two lp-two-rev">
        <div>
          <h2>Uma página pronta para o dono entender o que está perdendo</h2>
          <p className="lp-sub">Muitos donos nem sabem que existe o Perfil da Empresa no Google. Mande o link com o nome da empresa dele: ele responde 8 perguntas, vê a nota do perfil, a conta do que perde por mês e pede o diagnóstico no seu WhatsApp.</p>
          <a className="lp-link" href="/aparecer-no-google?empresa=Pet%20Feliz&nicho=pet%20shop&cidade=Jundia%C3%AD">Ver a página do dono <Icon name="arrow" size={18} /></a>
        </div>
        <a className="lp-owner-shot" href="/aparecer-no-google?empresa=Pet%20Feliz&nicho=pet%20shop&cidade=Jundia%C3%AD" aria-label="Abrir a página do dono">
          <span className="lp-owner-q">Pet Feliz aparece quando alguém procura pet shop em Jundiaí?</span>
          <span className="lp-owner-score"><b>40</b>/100</span>
          <span className="lp-owner-loss">≈ {brl(800)} por mês indo para o concorrente</span>
        </a>
      </div>
    </section>
  );
}

const PLANS = [
  { name: "Solo", price: "R$ 197", who: "Para o consultor que prospecta sozinho", items: ["1 pessoa", "100 buscas por mês (2.000 empresas)", "Abordagem, site de prévia e proposta ilimitados"] },
  { name: "Agência", price: "R$ 397", who: "Para quem tem vendedor e quem entrega", items: ["Até 5 pessoas", "300 buscas por mês (6.000 empresas)", "Limites e gastos por pessoa", "Perfil do Google pela API e relatório do mês"], featured: true },
  { name: "Rede", price: "R$ 897", who: "Para várias equipes ou cidades", items: ["Até 15 pessoas", "1.000 buscas por mês (20.000 empresas)", "Tudo do plano Agência"] },
];

/** Preços: só aparecem quando o dono aprovar (PRICING_PUBLISHED nas páginas). */
export function Pricing({ msg }: { msg: (t: string) => string }) {
  return (
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
              <ul className="lp-check">{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <a href={msg(`Olá! Quero o plano ${p.name}.`)} className={`lp-btn ${p.featured ? "lp-btn-main" : "lp-btn-ghost"}`} {...ext(msg(""))}>Quero o plano {p.name}</a>
            </div>
          ))}
        </div>
        <p className="lp-guar"><Icon name="shield" /> <span><strong>Garantia da primeira proposta:</strong> se em 7 dias você não tiver mandado ao menos uma proposta usando o app, devolvemos o primeiro mês.</span></p>
      </div>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section id="perguntas" className="lp-sec lp-soft">
      <div className="lp-wrap lp-narrow">
        <h2>Perguntas frequentes</h2>
        {items.map((f) => <details key={f.q} className="lp-faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
      </div>
    </section>
  );
}

export function FinalCta({ title, text, cta }: { title: string; text: string; cta: Cta }) {
  return (
    <section className="lp-final">
      <div className="lp-wrap lp-narrow">
        <h2>{title}</h2>
        <p>{text}</p>
        <a href={cta.href} className="lp-btn lp-btn-light lp-btn-lg" {...ext(cta.href)}>{cta.label}</a>
        <p className="lp-final-note">Você fala com uma pessoa, não com um robô. Respondemos no mesmo dia.</p>
      </div>
    </section>
  );
}

export const CONSULTANT_FAQ = [
  { q: "Preciso entender de SEO?", a: "Não. O sistema mostra o que falta em cada empresa em português simples e sugere a mensagem, o site e a proposta. Você revisa e envia." },
  { q: "Meu WhatsApp corre risco de bloqueio?", a: "O app não dispara mensagens. Cada uma sai do seu WhatsApp com um toque seu, com 45 a 90 segundos entre uma e outra, que é o ritmo de uma pessoa." },
  { q: "Os contatos do Google não são desatualizados?", a: "Alguns são. Por isso dá para conferir o link, consultar o CNPJ na Receita (situação e quadro de sócios) e marcar o contato como inválido, o que o tira da fila." },
  { q: "Já faço os sites em outra ferramenta. Posso usar?", a: "Pode. Cole o link do site na opção Link externo: ele entra na proposta, nas mensagens da Abordagem e no Perfil do Google do cliente." },
  { q: "Dá para mudar o Perfil do Google sem copiar e colar?", a: "Sim, com a sua conta Google como Gerente do perfil do cliente: descrição, serviços, site, posts agendados e respostas a avaliações são aplicados pela API. Sem esse acesso, o app copia o texto e abre o Google no lugar certo." },
  { q: "Já uso um CRM. Preciso trocar?", a: "Não. Os leads saem por planilha ou pela API para o CRM que você já usa. O app faz o que o CRM não faz: o diagnóstico, a mensagem, o site e a proposta." },
  { q: "Vocês garantem primeiro lugar no Google para os meus clientes?", a: "Não, e ninguém pode garantir. O que o sistema garante é a entrega: perfil completo, site no ar, posts publicados e o relatório do mês com os números do próprio Google." },
];

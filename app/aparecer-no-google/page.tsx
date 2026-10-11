import type { Metadata } from "next";
import "@/components/landing/lp.css";
import { fontVars } from "@/components/landing/fonts";
import { agency, waHref } from "@/components/landing/server";
import { OwnerLoss, OwnerQuiz } from "@/components/landing/Owner";
import { CityMap } from "@/components/landing/CityMap";
import { Icon } from "@/components/landing/Icon";
import { Faq, Footer, Header, ext } from "@/components/landing/Sections";
import { cleanParam, JUNDIAI, JUNDIAI_PCT } from "@/lib/landing";

// Página para o DONO da empresa local, que ainda não sabe o que perde no Google Maps.
// É da marca da agência (Ajustes) e pode ser personalizada pelo link: ?empresa=&nicho=&cidade=
export const dynamic = "force-dynamic";

type Props = { searchParams: Record<string, string | string[] | undefined> };
const read = (sp: Props["searchParams"]) => ({
  empresa: cleanParam(sp.empresa), nicho: cleanParam(sp.nicho, 40).toLowerCase(), cidade: cleanParam(sp.cidade, 40),
});

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const w = read(searchParams);
  return {
    title: `${w.empresa || "Sua empresa"} aparece no Google Maps? Faça o autodiagnóstico em 2 minutos`,
    description: "Responda 8 perguntas, veja a nota do seu perfil no Google e quanto você deixa de faturar por mês quando não aparece entre os primeiros.",
    robots: { index: true, follow: true },
  };
}

const FAKE = (n: string) => [
  { nome: `${cap(n)} Central`, nota: "4,8", av: 312, info: "Aberto · fecha às 19h · site · rotas" },
  { nome: `${cap(n)} da Praça`, nota: "4,6", av: 187, info: "Aberto · fecha às 18h · site · rotas" },
  { nome: `Bom Preço ${cap(n)}`, nota: "4,7", av: 96, info: "Aberto · fecha às 20h · rotas" },
];
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

const OWNER_FAQ = [
  { q: "Quanto custa?", a: "Depende do que falta no seu perfil. O diagnóstico é grátis e mostra o que precisa ser feito, com o preço, antes de qualquer compromisso." },
  { q: "Vocês garantem o primeiro lugar no Google?", a: "Não, e desconfie de quem garante: ninguém controla a posição no Google. O que se garante é a entrega: perfil completo, site no ar, publicações e um relatório todo mês com os números do próprio Google." },
  { q: "Já tenho Instagram. Não basta?", a: "Quem procura no Google ou no Maps quer o endereço, o horário, as avaliações e um jeito rápido de ligar ou chamar. O Instagram não aparece nessa lista; o Perfil da Empresa aparece." },
  { q: "Preciso entender de internet?", a: "Não. Você aprova os textos e o site antes de irem ao ar. O resto é feito por quem te mandou esta página." },
  { q: "Em quanto tempo vejo diferença?", a: "As mudanças entram no perfil em poucos dias. O efeito nas buscas varia de negócio para negócio, por isso o acompanhamento é mensal, com o relatório no seu WhatsApp." },
];

export default async function AparecerNoGoogle({ searchParams }: Props) {
  const a = await agency();
  const w = read(searchParams);
  const nicho = w.nicho || "o seu serviço";
  const busca = `${w.nicho || "pet shop"} perto de mim`;
  const ask = waHref(a.wa, `Olá! Vi a página sobre aparecer no Google${w.empresa ? ` e queria entender a situação da ${w.empresa}` : ""}. Pode fazer o diagnóstico grátis?`);
  const cta = ask ? { href: ask, label: "Quero o diagnóstico grátis" } : null;

  return (
    <div className={`lp lp-owner ${cta ? "lp-has-sticky" : ""} ${fontVars}`}>
      <Header login={false} brand={a.brand} cta={cta ? { href: cta.href, label: "Diagnóstico grátis" } : null} links={[["#diagnostico", "Autodiagnóstico"], ["#perda", "Quanto você perde"], ["#busca", "A busca"], ["#perguntas", "Perguntas"]]} />
      <main id="inicio">
        <section className="lp-hero" id="diagnostico">
          <div className="lp-wrap lp-hero-in">
            <div style={{ paddingBottom: 32 }}>
              <h1>{w.empresa || "Sua empresa"} aparece quando alguém procura {nicho}{w.cidade ? ` em ${w.cidade}` : " na sua cidade"}?</h1>
              <p className="lp-lead">Todo dia, gente perto de você pega o celular e procura exatamente o que você vende. O Google mostra três empresas primeiro. Responda 8 perguntas e descubra se uma delas é a sua.</p>
            </div>
            <OwnerQuiz who={w} waBase={a.wa} />
          </div>
        </section>

        <section className="lp-sec" id="perda">
          <div className="lp-wrap">
            <h2>Quanto custa não aparecer, todo mês</h2>
            <p className="lp-sub">Quem procura no Google já decidiu comprar. A dúvida é só de quem. Ajuste os números para o seu negócio.</p>
            <OwnerLoss who={w} />
          </div>
        </section>

        <section className="lp-sec lp-soft" id="busca">
          <div className="lp-wrap lp-two">
            <div>
              <h2>A busca em que você some</h2>
              <p className="lp-sub">Quando alguém procura “{busca}”, o Google mostra um mapa e três empresas. Para ver as outras, a pessoa precisa tocar em “Mais empresas”, e a maioria liga para uma das três antes disso.</p>
              <ul className="lp-check">
                <li>As três primeiras têm avaliações, fotos e horário em dia</li>
                <li>Têm site, então o Google entende o que elas fazem</li>
                <li>Respondem as avaliações, e o cliente lê essas respostas</li>
              </ul>
              <p className="lp-flag">Exemplo ilustrativo: nomes e números fictícios.</p>
            </div>
            <div className="lp-serp" role="img" aria-label={`Simulação da busca ${busca}: três concorrentes aparecem e a sua empresa não`}>
              <div className="lp-serp-bar"><Icon name="search" size={18} /> {busca}</div>
              <div className="lp-serp-map"><CityMap label="" /></div>
              <ol className="lp-serp-list">
                {FAKE(w.nicho || "pet shop").map((x) => (
                  <li key={x.nome}><b>{x.nome}</b><span><span className="lp-serp-stars">{x.nota} ★★★★★</span> ({x.av})</span><span>{x.info}</span></li>
                ))}
              </ol>
              <span className="lp-serp-more">Mais empresas</span>
              <p className="lp-serp-you"><b>{w.empresa || "Sua empresa"}</b>só aparece depois daqui, para quem continuar procurando.</p>
            </div>
          </div>
        </section>

        <section className="lp-sec">
          <div className="lp-wrap lp-two">
            <div>
              <h2>Como o Google escolhe quem aparece</h2>
              <p className="lp-sub">O próprio Google diz que olha três coisas. Duas delas dá para melhorar.</p>
            </div>
            <ol className="lp-factors">
              <li><h3>Relevância</h3><p>O perfil diz com clareza o que você faz? <em>Descrição, categorias, serviços e site resolvem.</em></p></li>
              <li><h3>Distância</h3><p>O quanto você está perto de quem procura. Isso não muda, e é por isso que o resto importa.</p></li>
              <li><h3>Proeminência</h3><p>O quanto a empresa é conhecida e bem avaliada. <em>Avaliações, respostas, fotos e publicações resolvem.</em></p></li>
            </ol>
          </div>
        </section>

        <section className="lp-band" aria-label="Você não está sozinho">
          <div className="lp-wrap lp-band-in">
            <p className="lp-stat"><strong>{JUNDIAI.semSite} de {JUNDIAI.analisadas}</strong> empresas que analisamos em Jundiaí não tinham site próprio.</p>
            <div className="lp-band-bar" role="img" aria-label={`${JUNDIAI_PCT}% sem site`}>{Array.from({ length: 50 }).map((_, i) => <i key={i} data-on={i < Math.round(JUNDIAI_PCT / 2)} />)}</div>
            <p>A maioria das empresas ainda não cuida do Google. Na sua rua, quem arrumar o perfil primeiro fica com os clientes que hoje se dividem entre todo mundo.</p>
          </div>
        </section>

        <section className="lp-sec">
          <div className="lp-wrap lp-two">
            <div>
              <h2>O que é feito, e você aprova antes</h2>
              <ol className="lp-steps4">
                <li><div><h3>Diagnóstico grátis</h3><p>O que falta no seu perfil, comparado com os três primeiros da sua busca.</p></div></li>
                <li><div><h3>Você vê o seu site antes de pagar</h3><p>Com o seu nome, telefone, endereço e botão de WhatsApp.</p></div></li>
                <li><div><h3>Perfil completo</h3><p>Descrição, serviços, fotos, horário e respostas às avaliações.</p></div></li>
                <li><div><h3>Relatório todo mês</h3><p>Visualizações, ligações e pedidos de rota, no seu WhatsApp.</p></div></li>
              </ol>
            </div>
            <div>
              <h3>Exemplo: um pet shop em 90 dias</h3>
              <div className="lp-ba" role="img" aria-label="Exemplo ilustrativo de antes e depois">
                {[["Visualizações do perfil", 410, 1180], ["Ligações", 9, 31], ["Pedidos de rota", 14, 46], ["Cliques no site", 0, 38]].map(([l, b, d]) => (
                  <div className="lp-ba-row" key={l as string}><span>{l}</span>
                    <div className="lp-ba-bars"><i style={{ width: `${Math.max(8, ((b as number) / (d as number)) * 100)}%` }}>{b} antes</i><i style={{ width: "100%" }}>{d} depois</i></div></div>
                ))}
              </div>
              <p className="lp-flag">Exemplo ilustrativo. Cada negócio tem um resultado diferente, e ninguém controla a posição no Google.</p>
            </div>
          </div>
        </section>

        <Faq items={OWNER_FAQ} />

        <section className="lp-final">
          <div className="lp-wrap lp-narrow">
            <h2>Descubra o que falta para {w.empresa || "a sua empresa"} aparecer.</h2>
            <p>O diagnóstico é grátis e chega no seu WhatsApp. Sem compromisso.</p>
            {cta ? <a href={cta.href} className="lp-btn lp-btn-light lp-btn-lg" {...ext(cta.href)}>{cta.label}</a>
              : <p>Peça o diagnóstico para quem te enviou esta página.</p>}
            <p className="lp-final-note">Quem responde é uma pessoa, não um robô.</p>
          </div>
        </section>
      </main>
      <Footer brand={a.brand} also={[]} />
      {cta && <div className="lp-sticky-cta"><a className="lp-btn lp-btn-main lp-btn-block" href={cta.href} {...ext(cta.href)}>{cta.label}</a></div>}
    </div>
  );
}

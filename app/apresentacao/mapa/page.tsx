import type { Metadata } from "next";
import "@/components/landing/lp.css";
import { fontVars } from "@/components/landing/fonts";
import { agency, waHref } from "@/components/landing/server";
import { MapHero, MapStory, type Step } from "@/components/landing/CityMap";
import { SystemTour } from "@/components/landing/SystemTour";
import { CONSULTANT_FAQ, ExampleFunnel, Faq, FinalCta, Footer, Header, LossList, OwnerTeaser, Pricing, ProofBand, ext } from "@/components/landing/Sections";
import { PRICING_PUBLISHED } from "@/components/landing/pricing";

// Landing para consultores, versão "mapa": a dor é prospectar no escuro, sem saber onde atacar.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await agency();
  return {
    title: `${brand}: veja na sua cidade quem está perdendo clientes no Google`,
    description: "Um mapa da sua cidade com as empresas que estão perdendo clientes no Google, a nota de cada uma e a mensagem pronta para o WhatsApp. Do pino no mapa ao relatório do mês.",
    robots: { index: true, follow: true },
    openGraph: { images: ["/apresentacao/tela-buscar.png"] },
  };
}

const STEPS: Step[] = [
  { id: "cidade", title: "A cidade inteira, com nota", text: "Cada pino é uma empresa do nicho. Laranja é quem mais perde cliente no Google: sem site, com poucas avaliações ou perfil pela metade.", view: { x: 200, y: 150, s: 1 } },
  { id: "regiao", title: "Onde atacar primeiro", text: "Antes de gastar uma busca, compare cidades vizinhas: quem tem mais empresa sem site e concorrência mais fraca vem primeiro.", view: { x: 200, y: 150, s: 1 }, print: { src: "/apresentacao/tela-onde-prospectar.webp", alt: "Ranking de cidades por oportunidade" } },
  { id: "bairro", title: "O bairro com mais oportunidade", text: "No Centro, três pet shops com nota acima de 75 a poucas quadras. É por onde a semana começa.", view: { x: 205, y: 148, s: 2.3 } },
  { id: "empresa", title: "Uma empresa, o motivo e quem decide", text: "Pet Feliz: nota 87, sem site, 8 avaliações contra 240 do líder. O CNPJ conferido na Receita mostra o sócio que decide.", view: { x: 196, y: 150, s: 3.6 }, pin: "a", print: { src: "/apresentacao/tela-validar.webp", alt: "Validação do contato com CNPJ e decisor" } },
  { id: "mensagem", title: "A mensagem já cita o problema", text: "Nada de “trabalho com marketing digital”. A mensagem fala da Pet Feliz e do que ela perde, e os lembretes ficam agendados.", view: { x: 196, y: 150, s: 3.6 }, pin: "a", print: { src: "/apresentacao/tela-abordagem.webp", alt: "Mensagem pronta para o WhatsApp" } },
  { id: "proposta", title: "Site e proposta com o nome dela", text: "O dono vê o site da empresa dele antes de pagar, com os concorrentes que aparecem na frente. Aceita por um link.", view: { x: 196, y: 150, s: 3.6 }, pin: "a", print: { src: "/apresentacao/tela-site.webp", alt: "Site de prévia" } },
  { id: "relatorio", title: "E todo mês, o resultado no WhatsApp", text: "Depois do sim, o perfil é ajustado pela API do Google e o relatório do mês mostra ligações, rotas e o que foi feito.", view: { x: 200, y: 150, s: 1 }, pin: "a", print: { src: "/apresentacao/tela-relatorio.webp", alt: "Relatório do mês" } },
];

export default async function Mapa() {
  const a = await agency();
  const msg = (t: string) => waHref(a.wa, t) ?? "/login";
  const cta = { href: msg(`Olá! Quero ver o mapa de oportunidades da minha cidade no ${a.brand}.`), label: a.wa ? "Quero o mapa da minha cidade" : "Entrar" };

  return (
    <div className={`lp lp-has-sticky ${fontVars}`}>
      <Header brand={a.brand} cta={a.wa ? { href: cta.href, label: "Quero testar" } : null}
        links={[["#mapa", "O mapa"], ["#zoom", "Do pino ao contrato"], ["#sistema", "O sistema"], ["#perguntas", "Perguntas"]]} />
      <main id="inicio">
        <section className="lp-hero" id="mapa">
          <div className="lp-wrap lp-hero-in">
            <div>
              <h1>Pare de prospectar no escuro. Veja quem está perdendo clientes, rua por rua.</h1>
              <p className="lp-lead">Mandar mensagem para a lista inteira do Google cansa e não converte. O sistema mostra quais empresas da sua cidade mais perdem cliente no Google, por quê, e o que dizer a cada uma.</p>
              <a href={cta.href} className="lp-btn lp-btn-main lp-btn-lg" {...ext(cta.href)}>{cta.label}</a>
            </div>
            <MapHero ctaHref={cta.href} />
          </div>
        </section>

        <ProofBand />

        <section className="lp-sec" id="zoom">
          <div className="lp-wrap">
            <h2>Do pino no mapa ao relatório do mês</h2>
            <p className="lp-sub">Role e acompanhe uma empresa do começo ao fim.</p>
            <MapStory steps={STEPS} />
          </div>
        </section>

        <LossList title="O que prospectar no escuro custa" />

        <section className="lp-sec lp-soft" id="sistema">
          <div className="lp-wrap">
            <h2>O sistema inteiro, por quem usa</h2>
            <p className="lp-sub">Toque num perfil e num módulo para ver a tela.</p>
            <SystemTour />
          </div>
        </section>

        <ExampleFunnel />
        <OwnerTeaser />
        {PRICING_PUBLISHED && <Pricing msg={msg} />}
        <Faq items={CONSULTANT_FAQ} />
        <FinalCta title="Comece pela rua com mais oportunidade." text="Mostramos o mapa da sua cidade, no seu nicho, com empresas de verdade." cta={cta} />
      </main>
      <Footer brand={a.brand} also={[["/apresentacao", "Quanto vale a sua cidade"], ["/apresentacao/semana", "Sua semana de prospecção numa manhã"], ["/aparecer-no-google", "Página para o dono da empresa"]]} />
      <div className="lp-sticky-cta"><a className="lp-btn lp-btn-main lp-btn-block" href={cta.href} {...ext(cta.href)}>{cta.label}</a></div>
    </div>
  );
}

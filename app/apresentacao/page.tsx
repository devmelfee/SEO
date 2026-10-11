import type { Metadata } from "next";
import "@/components/landing/lp.css";
import { fontVars } from "@/components/landing/fonts";
import { agency, waHref } from "@/components/landing/server";
import { CityCalculator } from "@/components/landing/CityCalculator";
import { SystemTour } from "@/components/landing/SystemTour";
import { CONSULTANT_FAQ, ExampleFunnel, Faq, FinalCta, Footer, Header, LossList, OwnerTeaser, Pricing, ProofBand, ext } from "@/components/landing/Sections";
import { PRICING_PUBLISHED } from "@/components/landing/pricing";

// Landing para consultores, versão "calculadora": a dor é o dinheiro parado na cidade que ninguém vê.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await agency();
  return {
    title: `${brand}: quanto vale a sua cidade em contratos de SEO local`,
    description: "Para consultores e agências de SEO local: veja quantas empresas do seu nicho estão sem site na sua cidade, aborde pelo WhatsApp com a mensagem pronta e feche com site de prévia, proposta e Perfil do Google aplicado.",
    robots: { index: true, follow: true },
    openGraph: { images: ["/apresentacao/tela-buscar.png"] },
  };
}

export default async function Apresentacao() {
  const a = await agency();
  const msg = (t: string) => waHref(a.wa, t) ?? "/login";
  const cta = { href: msg(`Olá! Vi a apresentação do ${a.brand} e quero testar na minha cidade.`), label: a.wa ? "Quero testar na minha cidade" : "Entrar" };

  return (
    <div className={`lp lp-has-sticky ${fontVars}`}>
      <Header brand={a.brand} cta={a.wa ? { href: cta.href, label: "Quero testar" } : null}
        links={[["#calculadora", "Calculadora"], ["#sistema", "O sistema"], ["#perdas", "O que você perde"], ["#perguntas", "Perguntas"]]} />
      <main id="inicio">
        <section className="lp-hero" id="calculadora">
          <div className="lp-wrap lp-hero-in">
            <div>
              <h1>Quanto vale a sua cidade em contratos de SEO local?</h1>
              <p className="lp-lead">Em Jundiaí, 64% das empresas que analisamos não tinham site próprio. Cada uma é um dono que perde cliente no Google todo dia e ainda não sabe. Faça a conta com o seu nicho e o seu preço.</p>
              <ul className="lp-check">
                <li>Nota de 0 a 100 e o motivo, empresa por empresa</li>
                <li>Mensagem de WhatsApp que cita o problema de cada uma</li>
                <li>Site de prévia e proposta com o nome da empresa no mesmo dia</li>
                <li>Perfil do Google aplicado com um clique depois do sim</li>
              </ul>
            </div>
            <CityCalculator ctaHref={cta.href} ctaLabel={cta.label} />
          </div>
        </section>

        <ProofBand />

        <section className="lp-sec" id="sistema">
          <div className="lp-wrap">
            <h2>Do número da calculadora ao contrato assinado</h2>
            <p className="lp-sub">Cada pessoa da equipe abre o app e cai direto no que precisa fazer. Toque num perfil e num módulo para ver a tela.</p>
            <SystemTour />
          </div>
        </section>

        <LossList />
        <ExampleFunnel />
        <OwnerTeaser />
        {PRICING_PUBLISHED && <Pricing msg={msg} />}
        <Faq items={CONSULTANT_FAQ} />
        <FinalCta title="Escolha um nicho e uma cidade. Mande a primeira mensagem hoje." text="Mostramos o sistema funcionando na sua cidade, com empresas de verdade." cta={cta} />
      </main>
      <Footer brand={a.brand} also={[["/apresentacao/semana", "Sua semana de prospecção numa manhã"], ["/apresentacao/mapa", "A sua cidade no mapa"], ["/aparecer-no-google", "Página para o dono da empresa"]]} />
      <div className="lp-sticky-cta"><a className="lp-btn lp-btn-main lp-btn-block" href={cta.href} {...ext(cta.href)}>{cta.label}</a></div>
    </div>
  );
}

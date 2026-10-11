import type { Metadata } from "next";
import "@/components/landing/lp.css";
import { fontVars } from "@/components/landing/fonts";
import { agency, waHref } from "@/components/landing/server";
import { WeekCompare } from "@/components/landing/WeekCompare";
import { SystemTour } from "@/components/landing/SystemTour";
import { CONSULTANT_FAQ, ExampleFunnel, Faq, FinalCta, Footer, Header, LossList, OwnerTeaser, Pricing, ProofBand, ext } from "@/components/landing/Sections";
import { PRICING_PUBLISHED } from "@/components/landing/pricing";

// Landing para consultores, versão "antes e depois": a dor é o tempo que a prospecção manual come.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await agency();
  return {
    title: `${brand}: sua semana de prospecção de SEO local numa manhã`,
    description: "Pare de montar planilha, copiar dados do Google e escrever mensagem uma por uma. Busque, aborde pelo WhatsApp, mande site de prévia e proposta, e aplique o Perfil do Google com um clique.",
    robots: { index: true, follow: true },
    openGraph: { images: ["/apresentacao/tela-buscar.png"] },
  };
}

const DAYS = [
  { d: "Segunda", t: "Escolher onde prospectar", p: "Compara cinco cidades vizinhas e escolhe a que tem mais empresa sem site e concorrência mais fraca.", img: "tela-onde-prospectar.webp" },
  { d: "Terça", t: "Buscar e validar", p: "Uma busca traz até 20 empresas com nota e motivo. As melhores ganham CNPJ conferido e o nome de quem decide.", img: "tela-buscar.webp" },
  { d: "Quarta", t: "Abordar 40 empresas", p: "A fila do dia já tem a mensagem escrita. Um toque abre o seu WhatsApp; os lembretes ficam agendados.", img: "tela-abordagem.webp" },
  { d: "Quinta", t: "Mandar as propostas", p: "Quem respondeu recebe o site de prévia e a proposta com o nome da empresa, no mesmo dia.", img: "tela-proposta.webp" },
  { d: "Sexta", t: "Entregar e mostrar resultado", p: "Descrição, serviços e posts aplicados no Perfil do Google. No fim do mês, o relatório vai no WhatsApp do cliente.", img: "tela-fila-google.webp" },
];

export default async function Semana() {
  const a = await agency();
  const msg = (t: string) => waHref(a.wa, t) ?? "/login";
  const cta = { href: msg(`Olá! Vi que a prospecção de uma semana cabe numa manhã com o ${a.brand}. Quero testar.`), label: a.wa ? "Quero minha semana de volta" : "Entrar" };

  return (
    <div className={`lp lp-has-sticky ${fontVars}`}>
      <Header brand={a.brand} cta={a.wa ? { href: cta.href, label: "Quero testar" } : null}
        links={[["#semana", "A semana"], ["#dias", "Dia a dia"], ["#sistema", "O sistema"], ["#perguntas", "Perguntas"]]} />
      <main id="inicio">
        <section className="lp-hero">
          <div className="lp-wrap">
            <h1>Sua semana de prospecção cabe numa manhã.</h1>
            <p className="lp-lead">Achar empresa no Maps, conferir o site, escrever a mensagem, lembrar do retorno, montar site e proposta: à mão, isso come a semana. Arraste e veja quanto tempo volta para você.</p>
          </div>
          <div className="lp-wrap" id="semana"><WeekCompare /></div>
        </section>

        <ProofBand />

        <section className="lp-sec" id="dias">
          <div className="lp-wrap">
            <h2>Segunda a sexta, com o sistema</h2>
            <p className="lp-sub">Cada dia é uma tela. Nada de planilha no meio do caminho.</p>
            <ol className="lp-days">
              {DAYS.map((x) => (
                <li key={x.d}>
                  <figure className="lp-phone"><img src={`/apresentacao/${x.img}`} alt={x.t} width={390} height={844} loading="lazy" /></figure>
                  <div><small>{x.d}</small><h3>{x.t}</h3><p>{x.p}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <LossList title="O que a semana à mão deixa para trás" />

        <section className="lp-sec lp-soft" id="sistema">
          <div className="lp-wrap">
            <h2>Tudo o que roda por trás da sua manhã</h2>
            <p className="lp-sub">Os módulos do sistema, por quem usa. Toque para ver a tela.</p>
            <SystemTour />
          </div>
        </section>

        <ExampleFunnel />
        <OwnerTeaser />
        {PRICING_PUBLISHED && <Pricing msg={msg} />}
        <Faq items={CONSULTANT_FAQ} />
        <FinalCta title="Ganhe de volta as horas que a planilha come." text="Mostramos o sistema funcionando na sua cidade, com empresas de verdade." cta={cta} />
      </main>
      <Footer brand={a.brand} also={[["/apresentacao", "Quanto vale a sua cidade"], ["/apresentacao/mapa", "A sua cidade no mapa"], ["/aparecer-no-google", "Página para o dono da empresa"]]} />
      <div className="lp-sticky-cta"><a className="lp-btn lp-btn-main lp-btn-block" href={cta.href} {...ext(cta.href)}>{cta.label}</a></div>
    </div>
  );
}

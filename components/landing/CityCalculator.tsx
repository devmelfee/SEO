"use client";
import { useMemo, useState } from "react";
import { brl, cityPotential, JUNDIAI_PCT } from "@/lib/landing";

const NICHOS = ["Pet shops", "Dentistas", "Salões de beleza", "Oficinas mecânicas", "Clínicas de estética", "Academias", "Restaurantes", "Imobiliárias"];

/** Calculadora da cidade: quantos contratos estão parados no nicho, com o preço e a taxa da própria pessoa. */
export function CityCalculator({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const [nicho, setNicho] = useState(NICHOS[0]);
  const [cidade, setCidade] = useState("Jundiaí");
  const [empresas, setEmpresas] = useState(120);
  const [semSitePct, setSemSitePct] = useState(JUNDIAI_PCT);
  const [fechamentoPct, setFechamentoPct] = useState(3);
  const [mensalidade, setMensalidade] = useState(997);
  const r = useMemo(() => cityPotential({ empresas, semSitePct, fechamentoPct, mensalidade }), [empresas, semSitePct, fechamentoPct, mensalidade]);
  const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;
  const href = ctaHref.startsWith("https://wa.me/")
    ? ctaHref.replace(/text=[^&]*/, `text=${encodeURIComponent(`Olá! Fiz a conta: ${nicho.toLowerCase()} em ${cidade} pode render ${brl(r.mensal)} por mês. Quero testar o sistema na minha cidade.`)}`)
    : ctaHref;

  return (
    <div className="lp-calc" role="group" aria-label="Calculadora da cidade">
      <div className="lp-calc-in">
        <div className="lp-calc-row">
          <label>Nicho
            <select value={nicho} onChange={(e) => setNicho(e.target.value)}>{NICHOS.map((n) => <option key={n}>{n}</option>)}</select>
          </label>
          <label>Cidade
            <input value={cidade} maxLength={40} onChange={(e) => setCidade(e.target.value)} />
          </label>
        </div>
        <label className="lp-range">Empresas desse nicho na cidade <output>{empresas}</output>
          <input type="range" min={20} max={600} step={10} value={empresas} onChange={(e) => setEmpresas(+e.target.value)} />
        </label>
        <label className="lp-range">Sem site próprio <output>{semSitePct}%</output>
          <input type="range" min={10} max={90} value={semSitePct} onChange={(e) => setSemSitePct(+e.target.value)} />
          <small>{semSitePct === JUNDIAI_PCT ? "64% é o que medimos em Jundiaí: 438 de 684 empresas." : "Ajuste pelo que você conhece da sua cidade."}</small>
        </label>
        <div className="lp-calc-row">
          <label>De cada 100 sem site, você fecha
            <input inputMode="numeric" value={fechamentoPct} onChange={(e) => setFechamentoPct(Math.min(50, num(e.target.value)))} />
          </label>
          <label>Sua mensalidade (R$)
            <input inputMode="numeric" value={mensalidade.toLocaleString("pt-BR")} onChange={(e) => setMensalidade(num(e.target.value))} />
          </label>
        </div>
      </div>
      <div className="lp-calc-out" aria-live="polite">
        <p className="lp-calc-big"><strong>{brl(r.mensal)}</strong> por mês</p>
        <p>{r.semSite} empresas de {nicho.toLowerCase()} em {cidade || "sua cidade"} sem site. Fechando {fechamentoPct} de cada 100, são <b>{r.contratos} contratos</b>, ou <b>{brl(r.anual)}</b> por ano.</p>
        <p className="lp-calc-loss">Cada mês sem abordar essas empresas é um mês em que outro consultor pode chegar antes.</p>
        <a className="lp-btn lp-btn-main lp-btn-lg lp-btn-block" href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>{ctaLabel}</a>
        <small>Estimativa com os números que você informou. Não é promessa de faturamento.</small>
      </div>
    </div>
  );
}

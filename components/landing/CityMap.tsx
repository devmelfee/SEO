"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

// Mapa ilustrativo de uma cidade (bairros reais de Jundiaí, empresas fictícias). Geometria em SVG, sem imagem.
export type Pin = { id: string; x: number; y: number; nome: string; nota: number; motivo: string; bairro: string };

export const PINS: Pin[] = [
  { id: "a", x: 196, y: 150, nome: "Pet Feliz Banho e Tosa", nota: 87, motivo: "Sem site · 8 avaliações contra 240 do líder", bairro: "Centro" },
  { id: "b", x: 232, y: 128, nome: "Amigo Fiel Pet", nota: 79, motivo: "Sem site · perfil sem fotos", bairro: "Centro" },
  { id: "c", x: 160, y: 176, nome: "Toca do Pet", nota: 66, motivo: "Sem site", bairro: "Centro" },
  { id: "d", x: 288, y: 186, nome: "Cão & Gato Vila Arens", nota: 71, motivo: "Sem site · sem horário", bairro: "Vila Arens" },
  { id: "e", x: 318, y: 214, nome: "Bicho Mimado", nota: 69, motivo: "Nota 3,9 sem respostas", bairro: "Vila Arens" },
  { id: "f", x: 120, y: 98, nome: "Mundo Animal Pet Shop", nota: 74, motivo: "Site é só o Instagram", bairro: "Anhangabaú" },
  { id: "g", x: 86, y: 132, nome: "Patinhas Pet Center", nota: 41, motivo: "Atrás do líder em avaliações", bairro: "Anhangabaú" },
  { id: "h", x: 336, y: 84, nome: "Clube do Bicho", nota: 58, motivo: "Poucas fotos", bairro: "Eloy Chaves" },
  { id: "i", x: 266, y: 66, nome: "Focinho Limpo", nota: 83, motivo: "Sem site · 3 avaliações", bairro: "Eloy Chaves" },
  { id: "j", x: 58, y: 220, nome: "Pet Vila Rami", nota: 62, motivo: "Sem serviços no perfil", bairro: "Vila Rami" },
  { id: "k", x: 128, y: 246, nome: "Lar dos Bichos", nota: 77, motivo: "Sem site · sem posts", bairro: "Vila Rami" },
  { id: "l", x: 372, y: 150, nome: "Petz da Serra", nota: 35, motivo: "Perfil quase completo", bairro: "Medeiros" },
];

const tone = (n: number) => (n >= 75 ? "hot" : n >= 55 ? "warm" : "cold");

export type View = { x: number; y: number; s: number };
export const FULL: View = { x: 200, y: 150, s: 1 };

export function CityMap({ selected, onSelect, view = FULL, dim = false, label = "Mapa ilustrativo de uma cidade com empresas por nota de oportunidade" }: {
  selected?: string | null; onSelect?: (id: string) => void; view?: View; dim?: boolean; label?: string;
}) {
  // Zoom centrado num ponto: translada o ponto para o meio e aplica a escala.
  const cam = { transform: `translate(200px, 150px) scale(${view.s}) translate(${-view.x}px, ${-view.y}px)` };
  return (
    <svg className={`lp-map${dim ? " lp-map-dim" : ""}`} viewBox="0 0 400 300" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" className="lp-map-ground" />
      <g className="lp-map-cam" style={cam}>
        {/* quadras */}
        {Array.from({ length: 9 }).map((_, r) => Array.from({ length: 12 }).map((__, c) => (
          <rect key={`${r}-${c}`} x={6 + c * 33 + (r % 2) * 6} y={6 + r * 33} width={26} height={26} rx={3} className="lp-map-block" />
        )))}
        {/* rio e avenidas */}
        <path d="M-20 262 C 60 230, 110 290, 190 252 S 330 214, 420 246" className="lp-map-river" />
        <path d="M-10 140 L 410 160" className="lp-map-ave" />
        <path d="M210 -10 L 190 310" className="lp-map-ave" />
        <path d="M30 -10 C 120 100, 260 120, 420 40" className="lp-map-road" />
        <path d="M-10 60 L 160 300" className="lp-map-road" />
        {[["Centro", 186, 134], ["Vila Arens", 300, 236], ["Anhangabaú", 92, 80], ["Eloy Chaves", 316, 54], ["Vila Rami", 72, 274], ["Medeiros", 370, 132]].map(([n, x, y]) => (
          <text key={n as string} x={x as number} y={y as number} className="lp-map-hood">{n}</text>
        ))}
        {PINS.map((p) => (
          <g key={p.id} transform={`translate(${p.x} ${p.y})`} className={`lp-pin lp-pin-${tone(p.nota)}${selected === p.id ? " lp-pin-on" : ""}`}
            onClick={onSelect ? () => onSelect(p.id) : undefined} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? `${p.nome}, nota ${p.nota}` : undefined}
            onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(p.id); } } : undefined}>
            <circle r={selected === p.id ? 15 : 11} className="lp-pin-halo" />
            <circle r={9} className="lp-pin-dot" />
            <text y={3.4} className="lp-pin-n">{p.nota}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Hero do mapa: tocar um pino abre a ficha da empresa, como no app. */
export function MapHero({ ctaHref }: { ctaHref: string }) {
  const [sel, setSel] = useState<string>("a");
  const p = PINS.find((x) => x.id === sel)!;
  const hot = PINS.filter((x) => x.nota >= 75).length;
  return (
    <div className="lp-maphero">
      <div className="lp-maphero-map">
      <CityMap selected={sel} onSelect={setSel} />
      <div className="lp-mapcard" aria-live="polite">
        <div className="lp-mapcard-top"><span className={`lp-score lp-score-${tone(p.nota)}`}>{p.nota}</span>
          <div><strong>{p.nome}</strong><small>{p.bairro} · pet shop</small></div></div>
        <p>{p.motivo}</p>
        <a href={ctaHref} className="lp-mapcard-act" {...(ctaHref.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}><Icon name="chat" size={18} /> Mensagem pronta para esta empresa</a>
      </div>
      </div>
      <p className="lp-maphero-legend"><span className="lp-dot lp-dot-hot" /> {hot} com nota alta <span className="lp-dot lp-dot-warm" /> média <span className="lp-dot lp-dot-cold" /> baixa · toque num pino · mapa e empresas ilustrativos</p>
    </div>
  );
}

export type Step = { id: string; title: string; text: string; view: View; pin?: string; print?: { src: string; alt: string } };

/** Rolagem com zoom: cidade → bairro → empresa → mensagem → proposta → relatório. */
export function MapStory({ steps }: { steps: Step[] }) {
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setI(Number((e.target as HTMLElement).dataset.i));
    }, { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const s = steps[i];
  return (
    <div className="lp-story">
      <div className="lp-story-stage" aria-hidden>
        <CityMap view={s.view} selected={s.pin} dim={!!s.print} label="" />
        {steps.map((x, k) => x.print && (
          <figure key={x.id} className="lp-phone lp-story-phone" data-on={k === i}>
            <img src={x.print.src} alt="" width={390} height={844} loading="lazy" />
          </figure>
        ))}
        <ol className="lp-story-dots">{steps.map((x, k) => <li key={x.id} data-on={k === i} />)}</ol>
      </div>
      <div className="lp-story-steps">
        {steps.map((x, k) => (
          <section key={x.id} data-i={k} ref={(el) => { refs.current[k] = el; }} className="lp-story-step" data-on={k === i}>
            <h3>{x.title}</h3>
            <p>{x.text}</p>
            {x.print && <img className="lp-story-inline" src={x.print.src} alt={x.print.alt} width={390} height={844} loading="lazy" />}
          </section>
        ))}
      </div>
    </div>
  );
}

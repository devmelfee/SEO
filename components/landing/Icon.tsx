// Ícones desenhados para as landings: traço de 2px, cantos arredondados, 24×24.
const PATHS: Record<string, string> = {
  check: "M5 12.5l4.2 4.2L19 7",
  x: "M6 6l12 12M18 6L6 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z",
  chat: "M4 18.5V6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v6.4a2.8 2.8 0 0 1-2.8 2.8H8.4L4 18.5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  search: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5",
  alert: "M12 4l9 16H3L12 4zM12 10v4.5M12 17.4v.1",
  star: "M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.8z",
  doc: "M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5zM14 3.5V8h4M9.5 12.5h5M9.5 16h5",
  phone: "M5 4.5l3.5-.5 1.8 4.2-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2 4.2 1.8-.5 3.5c-.1.6-.6 1-1.2 1A16.3 16.3 0 0 1 4 5.7c0-.6.4-1.1 1-1.2z",
  shield: "M12 3.5l7 2.6v5.5c0 4.4-3 7.7-7 8.9-4-1.2-7-4.5-7-8.9V6.1l7-2.6zM8.8 12l2.2 2.2 4.2-4.4",
};

export function Icon({ name, size = 20, title }: { name: keyof typeof PATHS | string; size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : true} role={title ? "img" : undefined} className="lp-ico">
      {title && <title>{title}</title>}
      <path d={PATHS[name] ?? PATHS.check} />
    </svg>
  );
}

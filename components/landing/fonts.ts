import { Bricolage_Grotesque, Onest } from "next/font/google";

// Faces das landings, servidas pelo próprio app (sem chamada ao Google no navegador).
// Bricolage: letreiro de comércio de bairro, com corte variável de largura para títulos longos em português.
export const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--lp-display", display: "swap", axes: ["opsz", "wdth"] });
export const body = Onest({ subsets: ["latin"], variable: "--lp-body", display: "swap" });
export const fontVars = `${display.variable} ${body.variable}`;

// Estratégia de "empurrões" para instalar o PWA — decide QUANDO sugerir,
// respeitando o "não" da pessoa e sem nunca insistir com quem já instalou.
//
// Cadência (atrelada a check-in, que é ~diário → momentos positivos):
//   1º empurrão  → no primeiro check-in
//   1ª semana    → mais alguns (até 3 no total), 1 por dia → efeito "um dia sim, um dia não"
//   dispensou 2x → para os frequentes; só volta 1x/mês
//   depois       → 1x/mês para quem ainda não instalou
//
// "Rastrear" instalação não precisa de memória: isStandalone() é checado ao vivo.
// Instalou → nunca aparece. Desinstalou e abriu no navegador → volta sozinho.

import { isStandalone } from "./pwaInstall";

const KEY = "nexvel_install_strategy";
const DIA = 24 * 60 * 60 * 1000;

type Estado = {
  checkins: number;
  primeiroCheckinEm: number | null;
  mostrados: number;
  ultimoMostradoEm: number | null;
  fechados: number;
};

const VAZIO: Estado = {
  checkins: 0,
  primeiroCheckinEm: null,
  mostrados: 0,
  ultimoMostradoEm: null,
  fechados: 0,
};

function ler(): Estado {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...VAZIO, ...JSON.parse(raw) };
  } catch {
    /* localStorage indisponível → trata como vazio */
  }
  return { ...VAZIO };
}

function salvar(e: Estado) {
  try {
    localStorage.setItem(KEY, JSON.stringify(e));
  } catch {
    /* silencioso: sem persistência não trava o app */
  }
}

/** Marca que um check-in (dia fechado) aconteceu. Chamar em todo fechamento de dia. */
export function registrarCheckin() {
  const e = ler();
  e.checkins += 1;
  if (!e.primeiroCheckinEm) e.primeiroCheckinEm = Date.now();
  salvar(e);
}

/** Deve mostrar o empurrão de instalação agora? (não altera nada) */
export function devePromptInstalar(): boolean {
  if (isStandalone()) return false; // já instalado → nunca
  const e = ler();
  if (e.checkins < 1) return false; // só depois do 1º check-in

  const agora = Date.now();
  const desdeUltimo = e.ultimoMostradoEm ? agora - e.ultimoMostradoEm : Infinity;

  // 1º empurrão: logo no primeiro check-in
  if (e.mostrados === 0) return true;

  // Dispensou 2x → respeita o "não": só um lembrete leve por mês
  if (e.fechados >= 2) return desdeUltimo >= 30 * DIA;

  const dentroDaPrimeiraSemana = e.primeiroCheckinEm
    ? agora - e.primeiroCheckinEm < 7 * DIA
    : false;

  // 1ª semana: até 3 no total, no máximo 1 por dia
  if (dentroDaPrimeiraSemana && e.mostrados < 3) return desdeUltimo >= DIA;

  // Depois da 1ª semana: 1x/mês para não-instaladores
  return desdeUltimo >= 30 * DIA;
}

/** Registra que o empurrão foi exibido. */
export function marcarInstalarExibido() {
  const e = ler();
  e.mostrados += 1;
  e.ultimoMostradoEm = Date.now();
  salvar(e);
}

/** Registra que a pessoa dispensou o empurrão ("agora não"). */
export function marcarInstalarDispensado() {
  const e = ler();
  e.fechados += 1;
  salvar(e);
}

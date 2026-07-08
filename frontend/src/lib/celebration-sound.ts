// Som de celebração — "reward jingle" estilo jogo, sintetizado via Web Audio API.
// Sem arquivo de áudio: funciona offline no PWA, sem asset e sem custo de rede.
// Usado em todas as celebrações (conclusão de desafio, dia completo, level-up de liga).

let ctx: AudioContext | null = null;
let ultimoToque = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Toca um arpejo ascendente e brilhante (Dó maior) — sensação de "conquista".
 * Idempotente por ~800ms (evita sobrepor em re-render). Falha em silêncio se o
 * navegador bloquear o áudio (política de autoplay).
 */
export function playCelebrationSound(): void {
  const c = getCtx();
  if (!c) return;

  try {
    if (c.state === "suspended") void c.resume();
  } catch {
    /* ignora — segue tentando tocar */
  }

  const agora = c.currentTime;
  if (agora - ultimoToque < 0.8) return; // debounce pelo relógio do próprio áudio
  ultimoToque = agora;

  try {
    const master = c.createGain();
    master.gain.value = 0.16;
    master.connect(c.destination);

    // Dó5 · Mi5 · Sol5 · Dó6 — arpejo de conquista
    const notas = [523.25, 659.25, 783.99, 1046.5];
    const passo = 0.085;
    notas.forEach((freq, i) => {
      const t = agora + i * passo;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.5);
    });

    // brilho final (oitava acima, curtinho) — o "sparkle"
    const tf = agora + notas.length * passo;
    const sparkle = c.createOscillator();
    const sg = c.createGain();
    sparkle.type = "sine";
    sparkle.frequency.value = 1568; // Sol6
    sg.gain.setValueAtTime(0.0001, tf);
    sg.gain.exponentialRampToValueAtTime(0.6, tf + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0001, tf + 0.3);
    sparkle.connect(sg);
    sg.connect(master);
    sparkle.start(tf);
    sparkle.stop(tf + 0.35);
  } catch {
    /* falha em silêncio */
  }
}

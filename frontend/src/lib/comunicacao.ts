// Sugestão contextual de mensagem para o chat do nutricionista.
// A antiga Central de Comunicação por intenção (fila priorizada + ações rápidas +
// agendar consulta) foi substituída pela Central de Conversas + chat; sobra aqui
// apenas o rascunho contextual usado como sugestão discreta no composer.
import type { Conversa } from "./mensagens";

export type Intent = "responder" | "parabenizar" | "cobrar" | "incentivo" | "consulta";

const primeiroNome = (nome: string) => nome.trim().split(" ")[0] || nome;

function streakNum(s: string): number {
  const m = /(\d+)/.exec(s);
  return m ? Number(m[1]) : 0;
}

export function intentLabel(intent: Intent): string {
  const map: Record<Intent, string> = {
    responder: "Responder",
    parabenizar: "Parabenizar",
    cobrar: "Cobrar retorno",
    incentivo: "Incentivar",
    consulta: "Agendar consulta",
  };
  return map[intent];
}

/** Rascunho contextual da mensagem — editável antes de enviar. "responder" abre em branco. */
export function rascunho(intent: Intent, c: Conversa): string {
  const nome = primeiroNome(c.nome);
  const streak = streakNum(c.streak);
  switch (intent) {
    case "parabenizar":
      return streak >= 2
        ? `Parabéns, ${nome}! 🔥 Você já está com ${streak} dias de sequência. Esse comprometimento é exatamente o que transforma resultado — continua assim, tô acompanhando sua evolução de perto!`
        : `Parabéns, ${nome}! 👏 Reparei no seu esforço por aqui e queria reconhecer. Cada registro conta — orgulho da sua evolução!`;
    case "cobrar":
      return `Ei, ${nome}, senti sua falta por aqui! 🌱 Bora retomar hoje com um check-in rapidinho? Tô do seu lado pra isso dar certo — me conta se tem algo te travando.`;
    case "consulta":
      return `Oi, ${nome}! Já faz um tempinho desde nosso último encontro. Que tal marcarmos seu retorno pra revisar sua evolução e ajustar o plano? 🗓️`;
    case "incentivo":
      return `Oi, ${nome}! Passando pra te dar aquele empurrãozinho de hoje 💪 Um passo de cada vez já muda o jogo. Bora registrar seu próximo hábito?`;
    case "responder":
    default:
      return "";
  }
}

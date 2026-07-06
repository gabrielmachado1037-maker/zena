// Central de Comunicação (nutri) — motor de sugestões automáticas + ações rápidas.
// A tela de Mensagens deixou de ser um chat estilo WhatsApp: aqui derivamos, dos dados
// que a Inbox já traz (streak, liga, última consulta, check-in de hoje, não-lidas), QUAL
// comunicação cada paciente precisa hoje e geramos um rascunho contextual pronto pra enviar.
// Sem backend novo — as 3 mensagens usam POST /mensagens/thread/:id (via lib/mensagens) e
// a 4ª ação (agendar) usa POST /consultas.
import api from "./api";
import type { Conversa } from "./mensagens";

export type Intent = "responder" | "parabenizar" | "cobrar" | "incentivo" | "consulta";
export type CommTone = "water" | "gold" | "danger" | "evo" | "neutral" | "streak";

export interface Situacao {
  intent: Intent;
  motivo: string; // linha curta na fila/chip: "🔥 14 dias de sequência"
  detalhe: string; // contexto do painel: o porquê da sugestão
  tone: CommTone;
  prioridade: number; // menor = mais urgente (ordena a fila)
}

export interface AcaoRapida {
  intent: Exclude<Intent, "responder">;
  label: string;
  tone: CommTone;
}

// As 4 ações rápidas, sempre disponíveis no painel (a sugestão só escolhe qual vem em foco).
export const ACOES: AcaoRapida[] = [
  { intent: "incentivo", label: "Incentivar", tone: "evo" },
  { intent: "parabenizar", label: "Parabenizar", tone: "gold" },
  { intent: "cobrar", label: "Cobrar retorno", tone: "danger" },
  { intent: "consulta", label: "Agendar consulta", tone: "neutral" },
];

const primeiroNome = (nome: string) => nome.trim().split(" ")[0] || nome;

export function streakNum(s: string): number {
  const m = /(\d+)/.exec(s);
  return m ? Number(m[1]) : 0;
}

// Dias inteiros desde uma data ISO (comparando só a data local). null = sem registro.
export function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hoje = new Date();
  const a = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / 86_400_000));
}

/** Deriva a comunicação recomendada do dia a partir do estado do paciente. */
export function deriveSituacao(c: Conversa): Situacao {
  const streak = streakNum(c.streak);
  const semConsulta = diasDesde(c.ultimaConsulta); // null = nunca
  const temHistorico = Boolean(c.ultimaAtividade || c.ultimaConsulta);

  // 1. Paciente escreveu — responder é sempre o mais urgente.
  if (c.naoLidoCount > 0) {
    return {
      intent: "responder",
      motivo: c.naoLidoCount === 1 ? "Nova mensagem" : `${c.naoLidoCount} novas mensagens`,
      detalhe: "Respondeu você e está esperando retorno.",
      tone: "water",
      prioridade: 0,
    };
  }

  // 2. Sumiu — sequência zerada e sem check-in hoje (só p/ quem já tem histórico).
  if (streak === 0 && !c.online && temHistorico) {
    return {
      intent: "cobrar",
      motivo: "Sequência zerada",
      detalhe: "Perdeu a sequência e não fez check-in hoje — um empurrão reengaja.",
      tone: "danger",
      prioridade: 1,
    };
  }

  // 3. Merece elogio — sequência forte.
  if (streak >= 7) {
    return {
      intent: "parabenizar",
      motivo: `🔥 ${streak} dias de sequência`,
      detalhe: "Está numa maré de consistência — reconhecer agora fixa o hábito.",
      tone: "gold",
      prioridade: 2,
    };
  }

  // 4. Consulta atrasada ou inexistente.
  if (semConsulta === null || semConsulta > 30) {
    return {
      intent: "consulta",
      motivo: semConsulta === null ? "Sem consulta marcada" : `Sem consulta há ${semConsulta} dias`,
      detalhe: "Faz tempo desde o último retorno. Vale marcar um acompanhamento.",
      tone: "neutral",
      prioridade: 3,
    };
  }

  // 5. Manutenção — incentivo leve.
  return {
    intent: "incentivo",
    motivo: c.online ? "Ativo hoje" : "Manter o ritmo",
    detalhe: "Sem urgência. Um incentivo leve mantém o engajamento em alta.",
    tone: "evo",
    prioridade: 4,
  };
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

/** Segmentos da fila. */
export type Segmento = "todos" | "responder" | "risco" | "elogiar";

export const SEGMENTOS: { id: Segmento; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "responder", label: "Responder" },
  { id: "risco", label: "Risco" },
  { id: "elogiar", label: "Elogiar" },
];

export function noSegmento(seg: Segmento, s: Situacao): boolean {
  switch (seg) {
    case "responder":
      return s.intent === "responder";
    case "risco":
      return s.intent === "cobrar";
    case "elogiar":
      return s.intent === "parabenizar";
    default:
      return true;
  }
}

/** Mensagem de confirmação enviada ao paciente logo após marcar a consulta. */
export function msgConsultaAgendada(quando: string): string {
  return `Consulta marcada! 🗓️ Nos vemos em ${quando}. Qualquer dúvida até lá, é só me chamar por aqui.`;
}

/** Cria a consulta de verdade (POST /consultas — módulo agenda). */
export async function agendarConsulta(
  pacienteId: string,
  dataISO: string,
  tipo: string,
  notas?: string,
): Promise<{ id: string; data: string }> {
  const { data } = await api.post<{ id: string; data: string }>("/consultas", {
    pacienteId,
    data: dataISO,
    tipo,
    notas: notas ?? null,
  });
  return data;
}

/** Rótulo de data/hora amigável (ex.: "seg, 14/jul às 09:00"). */
export function formatQuando(iso: string): string {
  const d = new Date(iso);
  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${dias[d.getDay()]}, ${pad(d.getDate())}/${meses[d.getMonth()]} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

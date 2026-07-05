import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui className merge helper (usado pelos componentes do dashboard v0)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Image compression using canvas
export async function comprimirImagem(file: File, maxWidth = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ISO week streak calculator
interface CheckInBasic {
  semana: number;
  ano: number;
}

export function calcularStreak(checkIns: CheckInBasic[]): number {
  if (!checkIns.length) return 0;

  const sorted = [...checkIns].sort((a, b) =>
    a.ano !== b.ano ? b.ano - a.ano : b.semana - a.semana
  );

  const now = new Date();
  const { semana: semAtual, ano: anoAtual } = getISOWeekData(now);
  const semAtualNum = anoAtual * 100 + semAtual;
  const semAnteriorNum = semAtual === 1 ? (anoAtual - 1) * 100 + 52 : anoAtual * 100 + (semAtual - 1);

  const maisRecenteNum = sorted[0].ano * 100 + sorted[0].semana;
  if (maisRecenteNum < semAnteriorNum) return 0;

  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i].ano * 100 + sorted[i].semana;
    const prev = sorted[i + 1].ano * 100 + sorted[i + 1].semana;
    const esperado = sorted[i].semana === 1
      ? (sorted[i].ano - 1) * 100 + 52
      : sorted[i].ano * 100 + (sorted[i].semana - 1);
    if (prev === esperado) streak++;
    else break;
  }

  return streak;
}

export function jaFezCheckinEstaSemana(checkIns: CheckInBasic[]): boolean {
  const { semana, ano } = getISOWeekData(new Date());
  return checkIns.some((c) => c.semana === semana && c.ano === ano);
}

function getISOWeekData(date: Date): { semana: number; ano: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { semana, ano: d.getUTCFullYear() };
}

// WhatsApp message generator
export interface WhatsAppContext {
  pacienteId?: string;
  pacienteNome: string;
  pacienteTelefone?: string;
  pacienteLinkUnico: string;
  nutricionistaNome: string;
  consultaData?: string;
  cobrancaValor?: number;
  cobrancaVencimento?: string;
}

export type TemplateWhatsApp = "lembrete_consulta" | "envio_plano" | "lembrete_checkin" | "lembrete_cobranca" | "confirmar_consulta" | "aniversario";

export function gerarMensagemWhatsApp(template: TemplateWhatsApp, ctx: WhatsAppContext): string {
  const primeiroNome = ctx.pacienteNome.split(" ")[0];
  const nomeNutri = ctx.nutricionistaNome.split(" ")[0];
  const link = `${window.location.origin}/p/${ctx.pacienteLinkUnico}`;

  switch (template) {
    case "lembrete_consulta":
      return `Olá, ${primeiroNome}! 🌿\n\nPassando pra lembrar da sua consulta *${ctx.consultaData || "em breve"}*.\n\nAguardo você! 😊\n\n— ${nomeNutri}`;

    case "confirmar_consulta":
      return `Olá, ${primeiroNome}! 📅\n\nPassando para confirmar sua consulta *${ctx.consultaData || "em breve"}*.\n\nVocê confirma a presença? 😊\n\n— ${nomeNutri}`;

    case "envio_plano":
      return `Olá, ${primeiroNome}! 🥗\n\nSeu plano alimentar atualizado está disponível. Acesse pelo link abaixo para ver seu plano e acompanhar sua evolução:\n\n👉 ${link}\n\nQualquer dúvida, é só me chamar! 💪\n\n— ${nomeNutri}`;

    case "lembrete_checkin":
      return `Olá, ${primeiroNome}! ✨\n\nHora do seu *check-in semanal*! São só 2 minutinhos e me ajuda muito a acompanhar seu progresso 💚\n\n👉 ${link}\n\n— ${nomeNutri}`;

    case "lembrete_cobranca":
      return `Olá, ${primeiroNome}! 💚\n\nPassando pra lembrar que sua consulta vence no dia *${ctx.cobrancaVencimento || ""}*.\n\nValor: *R$ ${ctx.cobrancaValor?.toFixed(2).replace(".", ",") || ""}*\n\nQualquer dúvida é só falar. Obrigada! 🙏\n\n— ${nomeNutri}`;

    case "aniversario":
      return `Olá, ${primeiroNome}! 🎂\n\nDesejando um *feliz aniversário* cheio de saúde, alegria e conquistas! 🌿\n\nConto com você seguindo firme nessa jornada. Muitas felicidades! 🎉\n\n— ${nomeNutri}`;

    default:
      return "";
  }
}

export function gerarUrlWhatsApp(telefone: string, texto: string): string {
  const numero = telefone.replace(/\D/g, "");
  const numeroCompleto = numero.startsWith("55") ? numero : `55${numero}`;
  return `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(texto)}`;
}

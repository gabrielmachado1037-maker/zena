import apiPaciente from "@/lib/apiPaciente";

// Cliente + tipos do Marketplace de Nutricionistas Parceiros (feature isolada).

export interface Parceiro {
  id: string;
  nome: string;
  foto: string | null;
  especialidade: string;
  avaliacao: number;
  bio: string | null;
}

export interface StatusResp {
  ativo: boolean;
  consulta?: { id: string; iniciaEm: string | null; expiraEm: string | null; diasRestantes: number; videoRoom: string };
  parceiro?: { id: string; nome: string; foto: string | null; especialidade: string; avaliacao: number };
  ultima?: { parceiroId: string; parceiroNome: string; foto: string | null; especialidade: string; status: string; expiraEm: string | null } | null;
}

export interface CheckoutResp {
  consultaId: string;
  parceiroNome: string;
  valor: number;
  pixCopiaECola: string;
  pixQrCode: string;
}

export interface PagamentoStatus {
  pago: boolean;
  status: string;
  diasRestantes: number;
  expiraEm: string | null;
}

export interface RankingLinha {
  pacienteId: string;
  nome: string;
  fotoPerfilUrl: string | null;
  score: number;
  checkins: number;
  streak: number;
  parceiroNome?: string;
  posicao: number;
  isMe: boolean;
}

export interface RankingResp {
  escopo: "meu" | "global";
  parceiroNome: string;
  linhas: RankingLinha[];
}

const P = "/paciente-app/parceria";

export const listarParceiros = () => apiPaciente.get<Parceiro[]>(`${P}/parceiros`).then((r) => r.data);
export const statusParceria = () => apiPaciente.get<StatusResp>(`${P}/status`).then((r) => r.data);
export const checkoutParceria = (parceiroId: string, cpf: string, nome?: string) =>
  apiPaciente.post<CheckoutResp>(`${P}/checkout`, { parceiroId, cpf, nome }).then((r) => r.data);
export const statusPagamento = (consultaId: string) =>
  apiPaciente.get<PagamentoStatus>(`${P}/pagamento/${consultaId}/status`).then((r) => r.data);
export const rankingParceria = (escopo: "meu" | "global") =>
  apiPaciente.get<RankingResp>(`${P}/ranking`, { params: { escopo } }).then((r) => r.data);

export interface MensagemParceria { id: string; autor: "paciente" | "parceiro" | "sistema"; conteudo: string; criadoEm: string }
export const listarChat = () =>
  apiPaciente.get<{ parceiroNome: string; mensagens: MensagemParceria[] }>(`${P}/chat`).then((r) => r.data);
export const enviarChat = (conteudo: string) =>
  apiPaciente.post<MensagemParceria>(`${P}/chat`, { conteudo }).then((r) => r.data);

export interface DietaResp {
  parceiroNome: string;
  especialidade: string;
  planoRefeicoes: { key: string; label: string }[] | null;
  aguaMetaMl: number | null;
  sonoMetaHoras: number | null;
}
export const verDieta = () => apiPaciente.get<DietaResp>(`${P}/dieta`).then((r) => r.data);

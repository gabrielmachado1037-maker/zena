import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, SlidersHorizontal, Trophy, Send, Check, ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import api from "../lib/api";
import { CardNx, ButtonNx, ProgressBarNx, LevelUpOverlay } from "./ui-nx";

/**
 * Onboarding de 1º acesso da nutricionista. Guia a configuração inicial da clínica
 * (paciente → personalização → desafio → convite), detectando cada etapa dos dados
 * reais. Aparece só quando o backend retorna status "pendente"/"andamento";
 * some pra sempre depois de "concluido". Montado pelo Layout só na rota do dashboard.
 */
interface Passos { paciente: boolean; personalizacao: boolean; desafio: boolean; convite: boolean }
interface PrimeiroPaciente { id: string; nome: string; conviteCodigo: string | null }
interface OnboardingResp {
  status: "pendente" | "andamento" | "concluido";
  passos: Passos;
  concluidos: number;
  total: number;
  primeiroPaciente: PrimeiroPaciente | null;
}

export default function NutriOnboarding() {
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingResp | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [fechado, setFechado] = useState(false);
  const [celebrando, setCelebrando] = useState(false);

  const carregar = useCallback(() => {
    api.get<OnboardingResp>("/onboarding")
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setCarregado(true));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // 4/4 → dispara a celebração (uma vez).
  useEffect(() => {
    if (data?.status === "andamento" && data.concluidos >= data.total) setCelebrando(true);
  }, [data]);

  async function iniciar() {
    setData((p) => (p ? { ...p, status: "andamento" } : p));
    await api.post("/onboarding/iniciar").catch(() => {});
    carregar();
  }

  async function concluir() {
    setFechado(true);
    await api.post("/onboarding/concluir").catch(() => {});
  }

  async function compartilharConvite() {
    const pac = data?.primeiroPaciente;
    if (!pac?.conviteCodigo) { navigate("/app/pacientes"); return; }
    const texto = `Olá, ${pac.nome}! Seu convite para o app Nexvel é ${pac.conviteCodigo}. Baixe o app, escolha "Criar conta" e informe este código + os últimos 4 dígitos do seu telefone. O código é individual e de uso único.`;
    try {
      if (navigator.share) await navigator.share({ title: "Convite Nexvel", text: texto });
      else await navigator.clipboard.writeText(pac.conviteCodigo);
    } catch { /* cancelado */ }
    await api.post("/onboarding/convite-enviado").catch(() => {});
    carregar();
  }

  if (!carregado || fechado || !data || data.status === "concluido") return null;

  // ── Tela de boas-vindas ──────────────────────────────────────────────
  if (data.status === "pendente") {
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <CardNx className="w-full max-w-md p-8 text-center animate-nx-rise">
          <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-nx-evo/12 text-nx-evo">
            <Sparkles className="size-7" />
          </span>
          <h2 className="text-headline-lg text-nx-on-surface">👋 Bem-vindo ao Nexvel</h2>
          <p className="mx-auto mt-3 max-w-sm text-body-md text-nx-on-surface-variant">
            Vamos configurar sua clínica para que seus pacientes já possam começar a utilizar o aplicativo.
          </p>
          <ButtonNx variant="evo" size="lg" className="mt-7 w-full" onClick={iniciar}>
            Começar configuração
          </ButtonNx>
        </CardNx>
      </div>
    );
  }

  // ── Checklist (andamento) ────────────────────────────────────────────
  const etapas: { key: keyof Passos; icon: LucideIcon; titulo: string; desc: string; cta: string; acao: () => void }[] = [
    { key: "paciente", icon: Users, titulo: "Adicionar primeiro paciente", desc: "Cadastre seu primeiro paciente no Nexvel.", cta: "Adicionar paciente", acao: () => navigate("/app/pacientes") },
    { key: "personalizacao", icon: SlidersHorizontal, titulo: "Personalizar acompanhamento", desc: "Configure refeições, meta de água, treino e sono do paciente.", cta: "Personalizar", acao: () => navigate(data.primeiroPaciente ? `/app/pacientes/${data.primeiroPaciente.id}` : "/app/pacientes") },
    { key: "desafio", icon: Trophy, titulo: "Criar primeiro desafio", desc: "Crie um desafio para aumentar o engajamento do paciente.", cta: "Criar desafio", acao: () => navigate("/app/desafios") },
    { key: "convite", icon: Send, titulo: "Enviar convite", desc: "Envie o convite para o paciente criar a conta no app.", cta: "Enviar convite", acao: compartilharConvite },
  ];
  const pct = Math.round((data.concluidos / data.total) * 100);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <CardNx className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-nx-sm bg-nx-evo/12 text-nx-evo">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-headline-md text-nx-on-surface">Configure sua clínica</h2>
              <p className="mt-0.5 text-body-sm text-nx-on-surface-variant">
                Conclua estes passos para começar a acompanhar seus pacientes.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-nx-container-high px-2.5 py-1 text-label-sm font-bold tabular-nums text-nx-on-surface">
              {data.concluidos}/{data.total}
            </span>
          </div>

          <div className="mt-4">
            <ProgressBarNx value={pct} tone="evo" />
            <p className="mt-1.5 text-label-sm text-nx-on-surface-variant">{data.concluidos} de {data.total} etapas concluídas</p>
          </div>

          <ul className="mt-5 space-y-2.5">
            {etapas.map((e, i) => {
              const done = data.passos[e.key];
              return (
                <li key={e.key} className={`flex flex-col gap-3 rounded-nx-md border p-3.5 transition-colors sm:flex-row sm:items-center sm:gap-3.5 ${done ? "border-nx-evo/30 bg-nx-evo/[0.06]" : "border-nx-border bg-nx-container/40"}`}>
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${done ? "bg-nx-evo text-nx-on-evo" : "bg-nx-container-high text-nx-on-surface-variant"}`}>
                      {done ? <Check className="size-5" /> : <e.icon className="size-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-body-md font-semibold ${done ? "text-nx-on-surface line-through decoration-nx-on-surface-variant/50" : "text-nx-on-surface"}`}>
                        <span className="mr-1.5 text-nx-on-surface-variant">{i + 1}.</span>{e.titulo}
                      </p>
                      {!done && <p className="mt-0.5 text-body-sm text-nx-on-surface-variant">{e.desc}</p>}
                    </div>
                  </div>
                  {done ? (
                    <span className="shrink-0 pl-[3.125rem] text-label-sm font-semibold text-nx-evo sm:self-center sm:pl-0">Concluído</span>
                  ) : (
                    <ButtonNx variant="surface" size="sm" onClick={e.acao} className="w-full shrink-0 gap-1.5 sm:w-auto sm:self-center">
                      {e.cta} <ArrowRight className="size-4" />
                    </ButtonNx>
                  )}
                </li>
              );
            })}
          </ul>
        </CardNx>
      </div>

      {/* Celebração ao concluir as 4 etapas */}
      <LevelUpOverlay
        open={celebrando}
        nivel={data.total}
        eyebrow="🎉 Parabéns!"
        titulo="Sua clínica está pronta"
        descricao="Agora basta aguardar seu paciente acessar o aplicativo e começar sua evolução."
        bigContent={<Check className="size-12 text-nx-on-evo" />}
        ctaLabel="Ir para o Dashboard"
        ariaLabel="Configuração da clínica concluída"
        onClose={concluir}
      />
    </>
  );
}

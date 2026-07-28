import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Trophy, MessageCircle, Star, Clock, AlertTriangle, ChevronRight, Stethoscope, LogOut } from "lucide-react";
import { ButtonNx, ProgressBarNx, ChipNx } from "@/components/ui-nx";
import { statusParceria, type StatusResp } from "@/lib/parceria";
import { DIAS_ACESSO } from "@/lib/parceria-const";
import { usePacienteAuth } from "@/contexts/PacienteAuthContext";

function AcessoAtivo({ s }: { s: StatusResp }) {
  const navigate = useNavigate();
  const dias = s.consulta!.diasRestantes;
  const pct = Math.min(100, Math.max(2, (dias / DIAS_ACESSO) * 100));

  return (
    <>
      {/* Card do parceiro + tempo restante */}
      <section className="rounded-nx-xl border border-nx-evo/40 bg-nx-evo/[0.06] p-5 shadow-nx-card">
        <div className="flex items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-nx-container-high">
            {s.parceiro!.foto ? (
              <img src={s.parceiro!.foto} alt={s.parceiro!.nome} className="size-full object-cover" />
            ) : (
              <span className="text-headline-md font-bold text-nx-on-surface-variant">{s.parceiro!.nome.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-label-sm uppercase tracking-wide text-nx-evo">Acesso ativo</p>
            <h2 className="truncate text-headline-md font-bold text-nx-on-surface">{s.parceiro!.nome}</h2>
            <span className="mt-0.5 inline-flex items-center gap-1 text-label-sm font-semibold text-nx-on-surface-variant">
              <Star className="size-3" fill="#F8C84B" style={{ color: "#F8C84B" }} /> {s.parceiro!.avaliacao.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface">
              <Clock className="size-4 text-nx-evo" /> {dias} {dias === 1 ? "dia restante" : "dias restantes"}
            </span>
            <span className="text-label-sm text-nx-on-surface-variant">de {DIAS_ACESSO} dias</span>
          </div>
          <ProgressBarNx value={pct} tone="evo" aria-label="Dias restantes de acesso" />
        </div>

        {/* Consulta por vídeo — o link fica no chat (primeira mensagem), sem botão separado. */}
        <button
          onClick={() => navigate("/paciente/parceria/chat")}
          className="mt-5 flex w-full items-center gap-3 rounded-nx-lg border border-nx-evo/40 bg-nx-evo/10 px-4 py-3.5 text-left transition-colors hover:bg-nx-evo/[0.16]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-nx-md bg-nx-evo/20 text-nx-evo"><Video className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-md font-bold text-nx-on-surface">Consulta por vídeo</span>
            <span className="block truncate text-label-sm text-nx-on-surface-variant">O link está no seu chat com {s.parceiro!.nome.split(" ")[0]}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-nx-on-surface-variant" />
        </button>
      </section>

      {/* Acesso liberado */}
      <section className="space-y-2">
        <h3 className="px-1 text-label-md uppercase tracking-wide text-nx-on-surface-variant">Acesso liberado</h3>
        <FeatureRow icon={MessageCircle} label="Conversar" hint="Chat + link da consulta por vídeo" onClick={() => navigate("/paciente/parceria/chat")} />
        <FeatureRow icon={Trophy} label="Ranking" hint="Meu nutricionista e global" onClick={() => navigate("/paciente/parceria/ranking")} />
        <FeatureRow icon={Stethoscope} label="Minha dieta" hint="Plano do seu nutricionista" onClick={() => navigate("/paciente/parceria/dieta")} />
      </section>
    </>
  );
}

function FeatureRow({ icon: Icon, label, hint, onClick }: { icon: typeof Trophy; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-nx-lg border border-nx-border bg-nx-surface px-4 py-3.5 text-left transition-colors hover:bg-nx-container-high"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-nx-md bg-nx-evo/15 text-nx-evo"><Icon className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-md font-bold text-nx-on-surface">{label}</span>
        <span className="block truncate text-label-sm text-nx-on-surface-variant">{hint}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-nx-on-surface-variant" />
    </button>
  );
}

function SemAcesso({ s }: { s: StatusResp }) {
  const navigate = useNavigate();
  const u = s.ultima;
  return (
    <>
      {u && (
        <section className="rounded-nx-xl border border-nx-danger/30 bg-nx-danger/[0.06] p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-nx-md bg-nx-danger/15 text-nx-danger"><AlertTriangle className="size-5" /></span>
            <div>
              <p className="text-body-md font-bold text-nx-on-surface">Seu acesso expirou</p>
              <p className="mt-0.5 text-body-sm text-nx-on-surface-variant">
                O acompanhamento com <span className="font-semibold text-nx-on-surface">{u.parceiroNome}</span> terminou. Renove para voltar a ter chat, dieta, ranking e vídeo.
              </p>
            </div>
          </div>
          <ButtonNx variant="evo" block className="mt-4" onClick={() => navigate(`/paciente/parceria/pagar/${u.parceiroId}`)}>
            Renovar com {u.parceiroNome.split(" ")[0]} · R$ 200
          </ButtonNx>
          <ButtonNx variant="surface" block className="mt-2" onClick={() => navigate("/paciente/parceria/escolher")}>
            Escolher outro nutricionista
          </ButtonNx>
        </section>
      )}

      {!u && (
        <section className="rounded-nx-xl border border-nx-border bg-nx-surface p-6 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-nx-evo/12 text-nx-evo"><Stethoscope className="size-7" /></div>
          <h2 className="text-headline-md font-bold text-nx-on-surface">Acompanhamento com especialista</h2>
          <p className="mx-auto mt-1.5 max-w-xs text-body-sm text-nx-on-surface-variant">
            Escolha um nutricionista parceiro e tenha 30 dias de chat, dieta, ranking e consulta por vídeo. R$ 200 via Pix.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <ChipNx tone="evo">Chat</ChipNx>
            <ChipNx tone="water">Dieta</ChipNx>
            <ChipNx tone="gold">Ranking</ChipNx>
            <ChipNx tone="streak">Vídeo</ChipNx>
          </div>
          <ButtonNx variant="evo" block size="lg" className="mt-5" onClick={() => navigate("/paciente/parceria/escolher")}>
            Escolher nutricionista
          </ButtonNx>
        </section>
      )}
    </>
  );
}

export function MarketplaceStatusScreen() {
  const { logout } = usePacienteAuth();
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    statusParceria().then(setStatus).catch(() => setErro(true));
  }, []);

  return (
    <div className="space-y-6 px-5 pb-24 pt-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-lg text-nx-on-surface">Nutricionista</h1>
          <p className="mt-0.5 text-body-md text-nx-on-surface-variant">Acompanhamento com especialistas parceiros</p>
        </div>
        {/* Saída sempre disponível — o paciente avulso fica focado nesta área, então
            precisa poder sair da conta a qualquer momento (senão fica preso). */}
        <button
          onClick={logout}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-nx-md border border-nx-border px-3 py-1.5 text-body-sm font-semibold text-nx-on-surface-variant transition-colors hover:text-nx-on-surface"
        >
          <LogOut className="size-4" /> Sair
        </button>
      </header>

      {erro && (
        <div className="rounded-nx-lg border border-nx-danger/30 bg-nx-danger/[0.06] p-5 text-center">
          <p className="text-body-md text-nx-on-surface">Não foi possível carregar seu acesso.</p>
        </div>
      )}
      {!status && !erro && (
        <div className="flex justify-center py-16">
          <div className="size-8 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" />
        </div>
      )}
      {status && (status.ativo ? <AcessoAtivo s={status} /> : <SemAcesso s={status} />)}
    </div>
  );
}

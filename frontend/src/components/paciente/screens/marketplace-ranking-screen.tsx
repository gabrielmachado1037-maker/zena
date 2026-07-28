import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { rankingParceria, type RankingLinha } from "@/lib/parceria";

const primeiro = (nome: string) => nome.split(" ")[0];

function Linha({ u }: { u: RankingLinha }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-nx-lg border px-3 py-2.5",
        u.isMe ? "border-nx-evo/60 bg-nx-evo/10 shadow-[0_0_20px_rgba(124,255,91,0.12)]" : "border-nx-border bg-nx-surface",
      )}
    >
      <span className={cn("w-7 text-center text-body-md font-extrabold tabular-nums", u.isMe ? "text-nx-evo" : "text-nx-on-surface-variant")}>
        {u.posicao}
      </span>
      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-nx-container-high" style={{ boxShadow: u.isMe ? "0 0 0 2px #7CFF5B" : undefined }}>
        {u.fotoPerfilUrl ? (
          <img src={u.fotoPerfilUrl} alt={u.nome} className="size-full object-cover" />
        ) : (
          <span className="font-bold text-nx-on-surface-variant">{u.nome.charAt(0)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-body-md font-bold text-nx-on-surface">
          {u.isMe && <Star className="size-3.5 shrink-0 text-nx-evo" fill="#7CFF5B" />}
          {u.isMe ? "Você" : primeiro(u.nome)}
        </p>
        <p className="flex items-center gap-2 truncate text-label-sm text-nx-on-surface-variant">
          <span className="inline-flex items-center gap-0.5"><Flame className="size-3 text-nx-streak" fill="#FF8A1F" /> {u.streak}d</span>
          {u.parceiroNome && <span className="truncate">· {u.parceiroNome}</span>}
        </p>
      </div>
      <span className="shrink-0 text-right">
        <span className="block text-body-md font-extrabold tabular-nums text-nx-on-surface">{u.score}%</span>
        <span className="block text-label-sm text-nx-on-surface-variant">aderência</span>
      </span>
    </div>
  );
}

export function MarketplaceRankingScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"meu" | "global">("meu");
  const [linhas, setLinhas] = useState<RankingLinha[] | null>(null);
  const [parceiroNome, setParceiroNome] = useState("");

  useEffect(() => {
    setLinhas(null);
    rankingParceria(tab)
      .then((r) => { setLinhas(r.linhas); setParceiroNome(r.parceiroNome); })
      .catch(() => setLinhas([]));
  }, [tab]);

  return (
    <div className="space-y-6 px-5 pb-24 pt-7">
      <header>
        <button
          onClick={() => navigate("/paciente/parceria")}
          className="mb-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface-variant transition-colors hover:text-nx-on-surface"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <h1 className="text-headline-lg text-nx-on-surface">Ranking</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">
          Aderência normalizada — % dos check-ins dos últimos 30 dias.
        </p>
      </header>

      {/* Toggle segmentado */}
      <div className="grid grid-cols-2 gap-1 rounded-nx-md border border-nx-border bg-nx-container-low p-1">
        {(["meu", "global"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-nx-sm py-2 text-body-sm font-semibold transition-colors",
              tab === t ? "bg-nx-container-high text-nx-on-surface" : "text-nx-on-surface-variant",
            )}
          >
            {t === "meu" ? "Meu nutricionista" : "Global"}
          </button>
        ))}
      </div>

      {tab === "meu" && parceiroNome && (
        <p className="-mt-2 px-1 text-label-sm text-nx-on-surface-variant">Pacientes de {parceiroNome}</p>
      )}

      {!linhas ? (
        <div className="flex justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" />
        </div>
      ) : linhas.length === 0 ? (
        <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-8 text-center">
          <p className="text-body-md text-nx-on-surface-variant">O ranking ainda vai começar.</p>
          <p className="mt-1 text-body-sm text-nx-on-surface-variant">Feche seus dias pra entrar na disputa 🔥</p>
        </div>
      ) : (
        <div className="space-y-2">
          {linhas.map((u) => <Linha key={u.pacienteId} u={u} />)}
        </div>
      )}
    </div>
  );
}

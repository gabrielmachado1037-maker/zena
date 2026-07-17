import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Building2, CreditCard, Bell, Settings, HelpCircle, LogOut,
  ChevronRight, ChevronLeft, Users, BadgeCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import Avatar from "./Avatar";
import { BottomSheetNx } from "./ui-nx";

const SUPORTE_EMAIL = "contato@nexvel.tech";

type Vista = "menu" | "clinica" | "sair";

/**
 * AccountSheet — folha inferior de conta do nutricionista (somente mobile).
 * Substitui a necessidade de uma aba "Configurações" no menu inferior.
 * Reutiliza telas existentes (/app/perfil, /app/planos) e endpoints já expostos.
 */
export default function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { nutricionista, logout } = useAuth();
  const [vista, setVista] = useState<Vista>("menu");

  // volta pro menu sempre que reabrir
  useEffect(() => { if (open) setVista("menu"); }, [open]);

  const nome = nutricionista?.nome ?? "Nutricionista";
  const email = nutricionista?.email ?? "";

  function irPara(rota: string) { onClose(); navigate(rota); }

  const ITENS: { icon: typeof User; label: string; onClick: () => void; tint?: "danger" }[] = [
    { icon: User, label: "Meu Perfil", onClick: () => irPara("/app/perfil") },
    { icon: Building2, label: "Minha Clínica", onClick: () => setVista("clinica") },
    { icon: CreditCard, label: "Plano", onClick: () => irPara("/app/planos") },
    { icon: Bell, label: "Notificações", onClick: () => irPara("/app/perfil") },
    { icon: Settings, label: "Configurações", onClick: () => irPara("/app/perfil") },
    { icon: HelpCircle, label: "Ajuda", onClick: () => { onClose(); window.location.href = `mailto:${SUPORTE_EMAIL}`; } },
    { icon: LogOut, label: "Sair da Conta", onClick: () => setVista("sair"), tint: "danger" },
  ];

  const titulo = vista === "menu" ? "Conta" : vista === "clinica" ? "Minha Clínica" : "Sair da conta";

  return (
    <BottomSheetNx open={open} onClose={onClose} title={vista === "menu" ? undefined : titulo} ariaLabel="Menu da conta">
      {vista !== "menu" && (
        <button
          onClick={() => setVista("menu")}
          className="mb-2 -mt-1 flex items-center gap-1 text-label-md text-nx-on-surface-variant hover:text-nx-on-surface"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
      )}

      {vista === "menu" && (
        <div className="pb-1">
          {/* Cabeçalho do usuário */}
          <div className="mb-4 flex items-center gap-3">
            <Avatar src={nutricionista?.foto} nome={nome} tamanho={52} className="rounded-2xl" />
            <div className="min-w-0">
              <p className="text-body-md font-bold text-nx-on-surface truncate">{nome}</p>
              {email && <p className="text-label-sm text-nx-on-surface-variant truncate">{email}</p>}
            </div>
          </div>

          {/* Itens */}
          <div className="divide-y divide-nx-border rounded-2xl border border-nx-border overflow-hidden">
            {ITENS.map(({ icon: Icon, label, onClick, tint }) => (
              <button
                key={label}
                onClick={onClick}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-nx-surface-hover active:bg-nx-surface-hover"
              >
                <span className={`grid place-items-center size-9 rounded-xl shrink-0 ${tint === "danger" ? "bg-nx-danger/12 text-nx-danger" : "bg-nx-evo/12 text-nx-evo"}`}>
                  <Icon size={17} />
                </span>
                <span className={`flex-1 text-body-md font-semibold ${tint === "danger" ? "text-nx-danger" : "text-nx-on-surface"}`}>{label}</span>
                {tint !== "danger" && <ChevronRight size={18} className="text-nx-outline shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {vista === "clinica" && <MinhaClinica nome={nutricionista?.nomeConsultorio?.trim() || "Minha Clínica"} />}
      {vista === "sair" && (
        <div className="pb-1">
          <p className="text-body-md text-nx-on-surface">Tem certeza que deseja sair?</p>
          <p className="mt-1 text-body-sm text-nx-on-surface-variant">Você precisará entrar novamente com seu e-mail e senha.</p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setVista("menu")}
              className="flex-1 rounded-xl border border-nx-border py-3 text-body-md font-semibold text-nx-on-surface hover:bg-nx-surface-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => { onClose(); logout(); }}
              className="flex-1 rounded-xl bg-nx-danger py-3 text-body-md font-bold text-white hover:brightness-110 transition-all"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </BottomSheetNx>
  );
}

/* ───────── Minha Clínica ───────── */
function MinhaClinica({ nome }: { nome: string }) {
  const [pacientes, setPacientes] = useState<number | null>(null);
  const [plano, setPlano] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    Promise.allSettled([
      api.get<unknown>("/pacientes"),
      api.get<{ planoAtivo: boolean; emTrial: boolean }>("/billing/status"),
    ]).then(([pac, bil]) => {
      if (!vivo) return;
      if (pac.status === "fulfilled") {
        const d = pac.value.data as unknown;
        const lista = Array.isArray(d)
          ? d
          : (d as { pacientes?: unknown[]; data?: unknown[] })?.pacientes ?? (d as { data?: unknown[] })?.data ?? [];
        setPacientes(Array.isArray(lista) ? lista.length : 0);
      }
      if (bil.status === "fulfilled") {
        const b = bil.value.data;
        setPlano(b.emTrial ? "Período de teste" : b.planoAtivo ? "Ativo" : "Expirado");
      }
      setLoading(false);
    });
    return () => { vivo = false; };
  }, []);

  const Row = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) => (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="grid place-items-center size-9 rounded-xl bg-nx-evo/12 text-nx-evo shrink-0"><Icon size={17} /></span>
      <span className="flex-1 text-body-sm text-nx-on-surface-variant">{label}</span>
      <span className="text-body-md font-bold text-nx-on-surface">{value}</span>
    </div>
  );

  return (
    <div className="pb-1">
      <div className="divide-y divide-nx-border rounded-2xl border border-nx-border overflow-hidden">
        <Row icon={Building2} label="Nome da clínica" value={nome} />
        <Row icon={Users} label="Pacientes" value={loading ? "…" : pacientes != null ? String(pacientes) : "—"} />
        <Row icon={BadgeCheck} label="Plano atual" value={loading ? "…" : plano ?? "—"} />
      </div>
    </div>
  );
}


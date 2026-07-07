import { RefreshCw } from "lucide-react";

// FAB flutuante "Atualizar" — recarrega o feed de registros.
export default function AdjustFab({ onRefresh, refreshing }: { onRefresh: () => void; refreshing?: boolean }) {
  return (
    <button
      onClick={onRefresh}
      disabled={refreshing}
      className="fixed bottom-8 right-8 bg-nx-evo text-nx-on-evo px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-nx-evo hover:bg-nx-evo-2 transition-all active:scale-95 z-50 disabled:opacity-60"
    >
      <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
      {refreshing ? "Atualizando…" : "Atualizar"}
    </button>
  );
}

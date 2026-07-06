// FAB flutuante "Atualizar" — recarrega o feed de registros.
export default function AdjustFab({ onRefresh, refreshing }: { onRefresh: () => void; refreshing?: boolean }) {
  return (
    <button
      onClick={onRefresh}
      disabled={refreshing}
      className="fixed bottom-8 right-8 bg-nx-primary/20 backdrop-blur-xl border border-nx-primary/50 text-nx-primary px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-2xl hover:bg-nx-primary/30 transition-all active:scale-95 z-50 disabled:opacity-60"
    >
      <span className={`material-symbols-outlined ${refreshing ? "animate-spin" : ""}`} data-icon="refresh">refresh</span>
      {refreshing ? "Atualizando…" : "Atualizar"}
    </button>
  );
}

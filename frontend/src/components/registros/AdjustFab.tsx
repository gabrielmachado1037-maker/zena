// FAB flutuante "Preciso de ajuste" (secondary, backdrop-blur).
export default function AdjustFab() {
  return (
    <button
      onClick={() => console.log("[Registros] Preciso de ajuste")}
      className="fixed bottom-8 right-8 bg-nx-secondary/20 backdrop-blur-xl border border-nx-secondary/50 text-nx-secondary px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-2xl hover:bg-nx-secondary/30 transition-all active:scale-95 z-50"
    >
      <span className="material-symbols-outlined" data-icon="warning">warning</span>
      Preciso de ajuste
    </button>
  );
}

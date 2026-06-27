import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, Calendar, CheckCircle, Copy, ExternalLink, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";

interface DashFinanceiro {
  receitaMes: number;
  receitaMesPassado: number;
  aReceber: number;
  totalInadimplente: number;
  projecaoMes: number;
  inadimplentes: Cobranca[];
  proximosVencimentos: Cobranca[];
  totalPacientesComPlano: number;
}

interface Cobranca {
  id: string;
  valor: number;
  vencimento: string;
  status: string;
  pixCopiaECola?: string;
  linkPagamento?: string;
  asaasChargeId?: string;
  paciente: { id: string; nome: string; telefone?: string; linkUnico: string };
}

function fmt(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export default function Financeiro() {
  const [data, setData] = useState<DashFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [asaasKey, setAsaasKey] = useState("");
  const [savedKey, setSavedKey] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [gerandoPix, setGerandoPix] = useState<string | null>(null);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    api.get<DashFinanceiro>("/financeiro/dashboard").then(r => {
      setData(r.data);
      setLoading(false);
    });
  }, []);

  async function salvarChaveAsaas() {
    await api.put("/financeiro/asaas-key", { asaasApiKey: asaasKey });
    setSavedKey(true);
    setShowKeyForm(false);
    show("Chave Asaas salva!");
  }

  async function gerarPix(cobrancaId: string) {
    setGerandoPix(cobrancaId);
    try {
      await api.post(`/financeiro/cobrar/${cobrancaId}/pix`);
      const res = await api.get<DashFinanceiro>("/financeiro/dashboard");
      setData(res.data);
      show("Pix gerado com sucesso!");
    } catch (e: any) {
      show(e?.response?.data?.error || "Erro ao gerar Pix.", "error");
    } finally {
      setGerandoPix(null);
    }
  }

  function copiarPix(texto: string) {
    navigator.clipboard.writeText(texto);
    show("Pix copiado!");
  }

  function abrirWhatsApp(paciente: Cobranca["paciente"], valor: number, pix?: string) {
    const tel = paciente.telefone?.replace(/\D/g, "");
    if (!tel) { show("Paciente sem telefone cadastrado.", "error"); return; }
    const venc = format(new Date(), "dd/MM/yyyy");
    const msg = encodeURIComponent(
      `Olá, ${paciente.nome.split(" ")[0]}! 😊\n\nPassando para lembrar sobre a mensalidade de *${fmt(valor)}* com vencimento em *${venc}*.\n\n${pix ? `Pix copia e cola:\n${pix}` : `Acesse seu portal: ${window.location.origin}/p/${paciente.linkUnico}`}\n\nQualquer dúvida, é só falar! 💚`
    );
    window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank");
  }

  const variacao = data ? data.receitaMes - data.receitaMesPassado : 0;
  const variacaoPct = data?.receitaMesPassado ? Math.round((variacao / data.receitaMesPassado) * 100) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zena-green-dark">Financeiro</h1>
          <p className="text-zena-text-mid mt-1">Receitas, cobranças e Pix automático.</p>
        </div>
        <button
          onClick={() => setShowKeyForm(!showKeyForm)}
          className="flex items-center gap-2 text-sm border border-zena-mint/50 text-zena-text-mid px-4 py-2 rounded-xl hover:bg-zena-cream"
        >
          <Zap size={14} /> Configurar Asaas
        </button>
      </div>

      {/* Config Asaas */}
      {showKeyForm && (
        <div className="bg-white border border-zena-mint/30 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="font-semibold text-zena-text-dark mb-1">Integração Asaas (Pix)</h3>
          <p className="text-zena-text-light text-sm mb-4">
            Crie uma conta em <strong>asaas.com.br</strong>, acesse API → Configurações e cole sua chave aqui.
            Os pagamentos vão direto para sua conta Asaas.
          </p>
          <div className="flex gap-3">
            <input
              type="password"
              value={asaasKey}
              onChange={e => setAsaasKey(e.target.value)}
              placeholder="$aas_live_... ou $aas_sandbox_..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light font-mono"
            />
            <button
              onClick={salvarChaveAsaas}
              disabled={!asaasKey}
              className="bg-zena-green-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-zena-green-mid"
            >
              Salvar
            </button>
          </div>
          {savedKey && <p className="text-zena-green-light text-sm mt-2">✓ Chave salva com sucesso.</p>}
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white h-28 rounded-2xl border border-zena-mint/30" />)}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-zena-mint/30 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-zena-green-mid" />
              <p className="text-xs text-zena-text-light font-medium">Receita do mês</p>
            </div>
            <p className="text-2xl font-bold text-zena-green-dark font-mono-data">{fmt(data.receitaMes)}</p>
            <div className="flex items-center gap-1 mt-1">
              {variacao >= 0
                ? <TrendingUp size={12} className="text-zena-green-light" />
                : <TrendingDown size={12} className="text-zena-brown" />}
              <p className={`text-xs font-medium ${variacao >= 0 ? "text-zena-green-light" : "text-zena-brown"}`}>
                {variacao >= 0 ? "+" : ""}{variacaoPct}% vs mês passado
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-zena-mint/30 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-zena-green-mid" />
              <p className="text-xs text-zena-text-light font-medium">A receber</p>
            </div>
            <p className="text-2xl font-bold text-zena-green-dark font-mono-data">{fmt(data.aReceber)}</p>
            <p className="text-xs text-zena-text-light mt-1">Cobranças pendentes do mês</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-xs text-zena-text-light font-medium">Inadimplente</p>
            </div>
            <p className="text-2xl font-bold text-red-600 font-mono-data">{fmt(data.totalInadimplente)}</p>
            <p className="text-xs text-zena-text-light mt-1">{data.inadimplentes.length} cobrança(s) vencida(s)</p>
          </div>

          <div className="bg-zena-green-dark rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-zena-mint" />
              <p className="text-xs text-zena-mint font-medium">Projeção do mês</p>
            </div>
            <p className="text-2xl font-bold text-white font-mono-data">{fmt(data.projecaoMes)}</p>
            <p className="text-xs text-zena-mint/70 mt-1">{data.totalPacientesComPlano} pacientes com plano ativo</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inadimplentes */}
        <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle size={16} className="text-red-500" />
            <h3 className="font-semibold text-zena-text-dark">Cobranças vencidas</h3>
          </div>
          {!data?.inadimplentes.length ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="mx-auto text-zena-green-light mb-2" />
              <p className="text-zena-text-light text-sm">Nenhuma cobrança em atraso!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.inadimplentes.map(c => (
                <div key={c.id} className="border border-red-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-zena-text-dark text-sm">{c.paciente.nome}</p>
                    <p className="font-bold text-red-600 font-mono-data text-sm">{fmt(c.valor)}</p>
                  </div>
                  <p className="text-xs text-red-400 mb-3">
                    Venceu em {format(new Date(c.vencimento), "dd/MM/yyyy")}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {c.pixCopiaECola ? (
                      <>
                        <button
                          onClick={() => copiarPix(c.pixCopiaECola!)}
                          className="flex items-center gap-1.5 text-xs bg-zena-green-dark text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          <Copy size={12} /> Copiar Pix
                        </button>
                        {c.linkPagamento && (
                          <a href={c.linkPagamento} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs border border-zena-green-light/40 text-zena-green-mid px-3 py-1.5 rounded-lg font-medium">
                            <ExternalLink size={12} /> Link
                          </a>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => gerarPix(c.id)}
                        disabled={gerandoPix === c.id}
                        className="text-xs bg-zena-mint/50 text-zena-green-dark px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      >
                        {gerandoPix === c.id ? "Gerando..." : "Gerar Pix"}
                      </button>
                    )}
                    <button
                      onClick={() => abrirWhatsApp(c.paciente, c.valor, c.pixCopiaECola)}
                      className="flex items-center gap-1.5 text-xs text-[#25D366] border border-[#25D366]/30 px-3 py-1.5 rounded-lg font-medium"
                    >
                      <span>💬</span> WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos vencimentos */}
        <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={16} className="text-zena-green-mid" />
            <h3 className="font-semibold text-zena-text-dark">Próximos vencimentos</h3>
          </div>
          {!data?.proximosVencimentos.length ? (
            <p className="text-zena-text-light text-sm text-center py-8">Nenhum vencimento pendente.</p>
          ) : (
            <div className="space-y-2">
              {data.proximosVencimentos.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zena-cream">
                  <div className="w-10 h-10 rounded-xl bg-zena-cream flex flex-col items-center justify-center flex-shrink-0">
                    <p className="text-xs font-bold text-zena-green-dark leading-none">
                      {format(new Date(c.vencimento), "dd")}
                    </p>
                    <p className="text-[10px] text-zena-text-light uppercase">
                      {format(new Date(c.vencimento), "MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zena-text-dark truncate">{c.paciente.nome}</p>
                    <p className="text-xs text-zena-text-light font-mono-data">{fmt(c.valor)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {c.pixCopiaECola ? (
                      <button onClick={() => copiarPix(c.pixCopiaECola!)}
                        className="text-xs bg-zena-green-dark text-white px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Copy size={10} /> Pix
                      </button>
                    ) : (
                      <button onClick={() => gerarPix(c.id)} disabled={gerandoPix === c.id}
                        className="text-xs text-zena-green-mid border border-zena-green-light/30 px-2.5 py-1 rounded-lg disabled:opacity-50">
                        {gerandoPix === c.id ? "..." : "Gerar Pix"}
                      </button>
                    )}
                    <button onClick={() => abrirWhatsApp(c.paciente, c.valor, c.pixCopiaECola)}
                      className="text-xs text-[#25D366] border border-[#25D366]/20 px-2.5 py-1 rounded-lg">
                      💬
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

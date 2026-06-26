import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  CheckCircle,
  Leaf,
  Calendar,
  FileText,
  Bell,
  MessageCircle,
  ClipboardList,
  ArrowRight,
  Star,
  Shield,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Leaf,
    title: "Portal da Paciente",
    desc: "Suas pacientes acompanham evolução, fazem check-in semanal e acessam o plano alimentar pelo celular — sem instalar nenhum app.",
  },
  {
    icon: FileText,
    title: "Plano Alimentar em PDF",
    desc: "Gere PDFs profissionais com identidade visual da Zena em segundos. Imprima ou envie direto pelo WhatsApp.",
  },
  {
    icon: Bell,
    title: "Lembretes Automáticos",
    desc: "Cron jobs criam lembretes de consultas, check-ins e cobranças. Você envia pelo WhatsApp com um clique.",
  },
  {
    icon: Calendar,
    title: "Agendamento Online",
    desc: "Suas pacientes escolhem horário disponível pelo portal. Você confirma ou recusa em segundos.",
  },
  {
    icon: ClipboardList,
    title: "Anamnese Digital",
    desc: "A paciente preenche o histórico de saúde completo antes da primeira consulta. Você acessa tudo organizado.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Integrado",
    desc: "Mensagens personalizadas com templates prontos. Sem custo extra — usa o WhatsApp que você já tem.",
  },
];

const DEPOIMENTOS = [
  {
    nome: "Dra. Ana Lima",
    crn: "CRN-3 12345",
    texto: "Economizo 3 horas por semana que usava para enviar planos e cobrar pacientes. Minhas pacientes adoram o portal.",
    nota: 5,
  },
  {
    nome: "Dra. Carol Santos",
    crn: "CRN-6 67890",
    texto: "A aderência ao plano das minhas pacientes aumentou muito desde que elas começaram a fazer check-in semanal.",
    nota: 5,
  },
  {
    nome: "Dra. Marina Oliveira",
    crn: "CRN-1 54321",
    texto: "O PDF profissional impressionou meus pacientes. Parece de consultório grande com preço acessível.",
    nota: 5,
  },
];

const FAQ = [
  {
    p: "Preciso de cartão de crédito para o teste?",
    r: "Não. Você tem 14 dias grátis sem precisar cadastrar cartão. Só pedimos quando você decidir assinar.",
  },
  {
    p: "Posso cancelar quando quiser?",
    r: "Sim, sem fidelidade e sem multa. O acesso fica ativo até o fim do período pago.",
  },
  {
    p: "Meus dados de pacientes estão seguros?",
    r: "Sim. Todos os dados são criptografados e armazenados em servidores seguros em conformidade com a LGPD.",
  },
  {
    p: "Quantas pacientes posso cadastrar?",
    r: "Ilimitadas. Não cobramos por número de pacientes ou de consultas.",
  },
];

export default function Landing() {
  const { token } = useAuth();
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-2xl font-bold text-zena-green-dark tracking-tight">zena</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-zena-text-mid hover:text-zena-green-dark font-medium transition-colors">
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="bg-zena-green-dark text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zena-green-mid transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-zena-cream to-white pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-zena-mint/30 text-zena-green-dark text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap size={14} />
            14 dias grátis · Sem cartão
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-zena-green-dark leading-tight mb-6">
            A plataforma que<br />
            <span className="text-zena-green-light">transforma pacientes</span><br />
            em resultados
          </h1>
          <p className="text-xl text-zena-text-mid max-w-2xl mx-auto mb-10 leading-relaxed">
            Gerencie consultas, planos alimentares e acompanhe a evolução das suas pacientes
            em um só lugar. Profissional, simples e feito para nutricionistas brasileiras.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/cadastro"
              className="bg-zena-green-dark text-white font-semibold px-8 py-4 rounded-xl hover:bg-zena-green-mid transition-colors flex items-center gap-2 text-lg shadow-lg"
            >
              Começar 14 dias grátis <ArrowRight size={20} />
            </Link>
            <Link
              to="/login"
              className="text-zena-green-dark font-semibold px-8 py-4 rounded-xl border-2 border-zena-green-dark hover:bg-zena-cream transition-colors text-lg"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="text-sm text-zena-text-light mt-4">
            Sem cartão · Cancele quando quiser · Dados protegidos pela LGPD
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-zena-green-dark py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { n: "3h", label: "economizadas\npor semana" },
            { n: "2×", label: "mais aderência\ndas pacientes" },
            { n: "100%", label: "sem papel\nnem planilha" },
            { n: "14 dias", label: "grátis\npara testar" },
          ].map((s) => (
            <div key={s.n}>
              <p className="text-4xl font-bold text-zena-mint">{s.n}</p>
              <p className="text-zena-mint/70 text-sm mt-1 whitespace-pre-line">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-zena-green-dark mb-4">Tudo que você precisa, em um só lugar</h2>
            <p className="text-lg text-zena-text-mid">Sem trocar de app. Sem planilha. Sem WhatsApp manual.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-zena-cream rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-zena-green-dark rounded-xl flex items-center justify-center mb-4">
                  <f.icon size={22} className="text-zena-mint" />
                </div>
                <h3 className="font-bold text-zena-green-dark text-lg mb-2">{f.title}</h3>
                <p className="text-zena-text-mid text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-24 px-6 bg-zena-sand">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-zena-green-dark text-center mb-12">O que as nutricionistas dizem</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {DEPOIMENTOS.map((d) => (
              <div key={d.nome} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: d.nota }).map((_, i) => (
                    <Star key={i} size={16} fill="#52B788" className="text-zena-green-light" />
                  ))}
                </div>
                <p className="text-zena-text-mid text-sm leading-relaxed mb-4">"{d.texto}"</p>
                <div>
                  <p className="font-semibold text-zena-green-dark text-sm">{d.nome}</p>
                  <p className="text-zena-text-light text-xs">{d.crn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-white" id="precos">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-zena-green-dark mb-4">Preço justo, sem surpresa</h2>
            <p className="text-lg text-zena-text-mid">Comece grátis. Assine só quando estiver convencida.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Mensal */}
            <div className="border-2 border-gray-100 rounded-2xl p-8">
              <p className="text-zena-text-mid font-medium mb-2">Mensal</p>
              <p className="text-4xl font-bold text-zena-green-dark mb-1">R$ 97<span className="text-lg font-normal text-zena-text-mid">/mês</span></p>
              <p className="text-sm text-zena-text-light mb-6">Cobrado mensalmente</p>
              <ul className="space-y-2 mb-8">
                {["Pacientes ilimitadas", "Portal da paciente", "PDF profissional", "Agendamento online", "WhatsApp integrado", "Suporte por e-mail"].map((i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zena-text-mid">
                    <CheckCircle size={16} className="text-zena-green-light flex-shrink-0" />{i}
                  </li>
                ))}
              </ul>
              <Link
                to="/cadastro"
                className="block text-center border-2 border-zena-green-dark text-zena-green-dark font-semibold py-3 rounded-xl hover:bg-zena-cream transition-colors"
              >
                Começar grátis
              </Link>
            </div>
            {/* Anual */}
            <div className="border-2 border-zena-green-dark rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zena-green-dark text-white text-xs font-bold px-4 py-1 rounded-full">
                ECONOMIZE 21%
              </div>
              <p className="text-zena-text-mid font-medium mb-2">Anual</p>
              <p className="text-4xl font-bold text-zena-green-dark mb-1">R$ 77<span className="text-lg font-normal text-zena-text-mid">/mês</span></p>
              <p className="text-sm text-zena-text-light mb-6">R$ 924 cobrado anualmente</p>
              <ul className="space-y-2 mb-8">
                {["Tudo do plano mensal", "Economia de R$ 240/ano", "Suporte prioritário", "Novas funcionalidades primeiro"].map((i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zena-text-mid">
                    <CheckCircle size={16} className="text-zena-green-light flex-shrink-0" />{i}
                  </li>
                ))}
              </ul>
              <Link
                to="/cadastro"
                className="block text-center bg-zena-green-dark text-white font-semibold py-3 rounded-xl hover:bg-zena-green-mid transition-colors"
              >
                Começar grátis
              </Link>
            </div>
          </div>
          <p className="text-center text-sm text-zena-text-light mt-6 flex items-center justify-center gap-2">
            <Shield size={14} /> Pagamento seguro · Cancele quando quiser · Sem fidelidade
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-zena-cream">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-zena-green-dark text-center mb-12">Perguntas frequentes</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.p} className="bg-white rounded-2xl p-6">
                <h3 className="font-semibold text-zena-green-dark mb-2">{f.p}</h3>
                <p className="text-zena-text-mid text-sm leading-relaxed">{f.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-zena-green-dark py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-4">Pronta para transformar seu consultório?</h2>
          <p className="text-zena-mint/80 text-lg mb-8">14 dias grátis, sem cartão, sem compromisso.</p>
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-2 bg-zena-mint text-zena-green-dark font-bold px-8 py-4 rounded-xl hover:bg-white transition-colors text-lg shadow-lg"
          >
            Criar minha conta grátis <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zena-green-dark border-t border-white/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zena-mint/60">
          <span className="font-bold text-zena-mint text-xl tracking-tight">zena</span>
          <div className="flex gap-6">
            <Link to="/privacidade" className="hover:text-zena-mint transition-colors">Privacidade</Link>
            <Link to="/termos" className="hover:text-zena-mint transition-colors">Termos de uso</Link>
            <a href="mailto:contato@zena.app" className="hover:text-zena-mint transition-colors">Contato</a>
          </div>
          <p>© {new Date().getFullYear()} Zena. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

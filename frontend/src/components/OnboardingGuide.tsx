import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Users, FileText, Share2, CheckCircle } from "lucide-react";

const STEPS = [
  {
    icon: Users,
    title: "Adicione sua primeira paciente",
    desc: "Cadastre nome, objetivo e dados de contato. Ela receberá acesso ao portal pessoal.",
    link: "/app/pacientes",
    cta: "Adicionar paciente",
  },
  {
    icon: FileText,
    title: "Crie um plano alimentar",
    desc: "Monte o plano com refeições personalizadas e exporte em PDF profissional com 1 clique.",
    link: "/app/pacientes",
    cta: "Criar plano",
  },
  {
    icon: Share2,
    title: "Compartilhe o portal",
    desc: "Cada paciente tem um link único. Ela acessa check-ins, evolução e plano alimentar pelo celular.",
    link: "/app/pacientes",
    cta: "Ver portal",
  },
];

export default function OnboardingGuide({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-zena-text-light hover:text-zena-text-dark"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🌿</div>
          <h2 className="text-2xl font-bold text-zena-green-dark">Bem-vinda à Clinne!</h2>
          <p className="text-zena-text-light text-sm mt-1">3 passos para começar em 5 minutos</p>
        </div>

        {/* Steps */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-zena-green-dark" : i < step ? "w-4 bg-zena-green-light" : "w-4 bg-gray-200"}`}
            />
          ))}
        </div>

        {/* Current step */}
        <div className="bg-zena-cream rounded-2xl p-6 mb-6">
          <div className="w-12 h-12 bg-zena-green-dark rounded-xl flex items-center justify-center mb-4">
            {(() => { const Icon = STEPS[step].icon; return <Icon size={22} className="text-zena-mint" />; })()}
          </div>
          <h3 className="font-bold text-zena-green-dark text-lg mb-2">{STEPS[step].title}</h3>
          <p className="text-zena-text-mid text-sm leading-relaxed">{STEPS[step].desc}</p>
        </div>

        <div className="flex gap-3">
          {step < STEPS.length - 1 ? (
            <>
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 text-zena-text-light text-sm py-2.5 rounded-xl hover:bg-zena-cream transition-colors"
              >
                Pular
              </button>
              <Link
                to={STEPS[step].link}
                onClick={onDismiss}
                className="flex-1 bg-zena-green-dark text-white font-semibold py-2.5 rounded-xl hover:bg-zena-green-mid transition-colors text-center text-sm"
              >
                {STEPS[step].cta}
              </Link>
            </>
          ) : (
            <Link
              to={STEPS[step].link}
              onClick={onDismiss}
              className="flex-1 bg-zena-green-dark text-white font-semibold py-2.5 rounded-xl hover:bg-zena-green-mid transition-colors text-center text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Começar agora
            </Link>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="w-full text-center text-xs text-zena-text-light mt-4 hover:text-zena-text-mid"
        >
          Já sei o que fazer, fechar
        </button>
      </div>
    </div>
  );
}

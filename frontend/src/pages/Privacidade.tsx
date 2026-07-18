import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacidade() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-nx-bg">
      <nav className="bg-nx-surface border-b border-nx-border px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between">
        <Link to="/"><img src="/nexvel-wordmark.png" alt="Nexvel" className="h-6 w-auto" /></Link>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-nx-evo font-medium hover:text-nx-on-surface">
          <ArrowLeft className="size-4" /> Voltar
        </button>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-nx-on-surface mb-2">Política de Privacidade</h1>
        <p className="text-nx-on-surface-variant text-sm mb-10">Última atualização: junho de 2026</p>

        <div className="bg-nx-surface rounded-2xl p-8 space-y-8 text-nx-on-surface-variant leading-relaxed">
          <Section titulo="1. Quem somos">
            A Nexvel é uma plataforma SaaS destinada a nutricionistas autônomos. Operamos em conformidade com a
            Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e demais normas aplicáveis.
            Para dúvidas sobre privacidade, entre em contato pelo e-mail{" "}
            <a href="mailto:contato@nexvel.tech" className="text-nx-evo underline">contato@nexvel.tech</a>.
          </Section>

          <Section titulo="2. Dados que coletamos">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Dados do nutricionista:</strong> nome, e-mail, CRN e senha (armazenada com hash bcrypt).</li>
              <li><strong>Dados das pacientes:</strong> nome, e-mail, telefone, fotos de evolução, peso, medidas corporais, planos alimentares e histórico de saúde (anamnese). Esses dados são inseridos pelo nutricionista ou pela própria paciente pelo portal.</li>
              <li><strong>Dados de uso:</strong> logs de acesso, endereço IP e eventos de navegação para fins de segurança e melhoria do serviço.</li>
              <li><strong>Dados de pagamento:</strong> processados integralmente pelo Stripe. Não armazenamos números de cartão.</li>
            </ul>
          </Section>

          <Section titulo="3. Como usamos os dados">
            <ul className="list-disc pl-5 space-y-2">
              <li>Prestar os serviços contratados (dashboard, portal da paciente, geração de PDF etc.).</li>
              <li>Enviar e-mails transacionais (boas-vindas, recuperação de senha, confirmações).</li>
              <li>Processar pagamentos e gerenciar assinaturas.</li>
              <li>Melhorar a plataforma com base em métricas anônimas de uso.</li>
            </ul>
          </Section>

          <Section titulo="4. Base legal (LGPD)">
            O tratamento dos dados é realizado com base nas seguintes hipóteses legais (art. 7º da LGPD):
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Execução de contrato</strong> — para prestar o serviço contratado.</li>
              <li><strong>Consentimento</strong> — para envio de comunicações de marketing (você pode revogar a qualquer momento).</li>
              <li><strong>Legítimo interesse</strong> — para fins de segurança e melhoria do produto.</li>
            </ul>
          </Section>

          <Section titulo="5. Compartilhamento de dados">
            Não vendemos dados. Compartilhamos apenas com prestadores necessários para operar o serviço:
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Stripe</strong> — processamento de pagamentos.</li>
              <li><strong>Resend</strong> — envio de e-mails transacionais.</li>
              <li><strong>Render / Neon / Vercel</strong> — hospedagem e banco de dados (servidores no Brasil ou com adequação LGPD).</li>
              <li><strong>Sentry</strong> — monitoramento de erros. Recebe apenas dados técnicos da falha (mensagem de erro, tela e identificador interno da conta). Não recebe seu nome, e-mail, fotos nem dados de saúde.</li>
            </ul>
          </Section>

          <Section titulo="6. Retenção e exclusão">
            Mantemos os dados enquanto a conta estiver ativa. A exclusão pode ser solicitada a qualquer
            momento — pelo próprio aplicativo ou por e-mail para{" "}
            <a href="mailto:contato@nexvel.tech" className="text-nx-evo underline">contato@nexvel.tech</a>.
            Ao ser solicitada, os dados pessoais e de saúde (anamnese, medições, registros, check-ins e
            fotos) são eliminados de forma permanente e irreversível. Registros financeiros e fiscais
            podem ser retidos pelo prazo legal exigido, e as cópias de segurança são sobrescritas nos
            ciclos regulares de backup.
          </Section>

          <Section titulo="7. Seus direitos">
            Você tem direito a: acessar, corrigir, portar, eliminar seus dados e revogar consentimentos.
            Para exercer esses direitos, entre em contato pelo e-mail de privacidade.
          </Section>

          <Section titulo="8. Segurança">
            Utilizamos criptografia em trânsito (HTTPS/TLS), hash bcrypt para senhas e tokens JWT com prazo
            de expiração. Realizamos auditorias periódicas de segurança.
          </Section>

          <Section titulo="9. Cookies">
            Utilizamos apenas cookies estritamente necessários para autenticação (token JWT no localStorage).
            Não utilizamos cookies de rastreamento ou publicidade.
          </Section>

          <Section titulo="10. Contato">
            Dúvidas, solicitações ou reclamações sobre privacidade:{" "}
            <a href="mailto:contato@nexvel.tech" className="text-nx-evo underline">contato@nexvel.tech</a>.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-nx-on-surface mb-3">{titulo}</h2>
      <div className="text-sm">{children}</div>
    </div>
  );
}

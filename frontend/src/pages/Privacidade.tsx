import { Link } from "react-router-dom";

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-zena-cream">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-zena-green-dark tracking-tight">zena</Link>
        <Link to="/login" className="text-sm text-zena-green-mid font-medium hover:text-zena-green-dark">Entrar</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-zena-green-dark mb-2">Política de Privacidade</h1>
        <p className="text-zena-text-light text-sm mb-10">Última atualização: junho de 2025</p>

        <div className="bg-white rounded-2xl p-8 space-y-8 text-zena-text-mid leading-relaxed">
          <Section titulo="1. Quem somos">
            A Zena é uma plataforma SaaS destinada a nutricionistas autônomos. Operamos em conformidade com a
            Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e demais normas aplicáveis.
            Para dúvidas sobre privacidade, entre em contato pelo e-mail{" "}
            <a href="mailto:privacidade@zena.app" className="text-zena-green-mid underline">privacidade@zena.app</a>.
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
              <li><strong>Railway / Neon</strong> — hospedagem e banco de dados (servidores no Brasil ou com adequação LGPD).</li>
            </ul>
          </Section>

          <Section titulo="6. Retenção e exclusão">
            Mantemos os dados enquanto a conta estiver ativa. Após o cancelamento, os dados são mantidos por
            90 dias para fins de auditoria e, em seguida, excluídos permanentemente.
            Para solicitar a exclusão antecipada, envie um e-mail para{" "}
            <a href="mailto:privacidade@zena.app" className="text-zena-green-mid underline">privacidade@zena.app</a>.
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
            <a href="mailto:privacidade@zena.app" className="text-zena-green-mid underline">privacidade@zena.app</a>.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-zena-green-dark mb-3">{titulo}</h2>
      <div className="text-sm">{children}</div>
    </div>
  );
}

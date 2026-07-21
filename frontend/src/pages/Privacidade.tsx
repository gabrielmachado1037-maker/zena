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
        <p className="text-nx-on-surface-variant text-sm mb-10">Última atualização: julho de 2026</p>

        <div className="bg-nx-surface rounded-2xl p-8 space-y-8 text-nx-on-surface-variant leading-relaxed">
          <Section titulo="1. Quem somos">
            A Nexvel é uma plataforma SaaS destinada a nutricionistas autônomos, operada por{" "}
            <strong>FTA Marketing LTDA</strong>. Operamos em conformidade com a Lei Geral de Proteção de Dados
            (LGPD — Lei nº 13.709/2018) e demais normas aplicáveis.
            <p className="mt-3">
              <strong>Encarregado pelo Tratamento de Dados Pessoais (DPO)</strong>, nos termos do art. 41 da LGPD:{" "}
              Gabriel Machado — <a href="mailto:contato@nexvel.tech" className="text-nx-evo underline">contato@nexvel.tech</a>.
              É por esse canal que você exerce os direitos descritos na seção 8.
            </p>
          </Section>

          <Section titulo="1.1 Quem responde por quais dados">
            A Nexvel não ocupa o mesmo papel em todos os dados que passam pela plataforma. A divisão abaixo é o que
            determina a quem você deve pedir acesso, correção ou exclusão.
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>
                <strong>Dados das pacientes (prontuário, anamnese, planos, fotos, medidas):</strong> quem decide o
                tratamento é o <strong>nutricionista</strong>, que é o <strong>controlador</strong>. A Nexvel atua como{" "}
                <strong>operadora</strong> (art. 39 da LGPD): armazena e processa esses dados seguindo as instruções
                dele, e não os utiliza para finalidade própria. É o nutricionista quem responde pelo conteúdo clínico
                e pelo consentimento da paciente, conforme a seção 7 dos{" "}
                <Link to="/termos" className="text-nx-evo underline">Termos de Uso</Link>. Pedidos de paciente sobre
                seus dados clínicos devem ser dirigidos primeiro ao seu nutricionista; se preferir, encaminhamos.
              </li>
              <li>
                <strong>Dados da conta do nutricionista</strong> (cadastro, CRN, cobrança, logs de acesso):
                a Nexvel é <strong>controladora</strong>, porque é ela quem decide coletá-los para prestar e cobrar
                o serviço.
              </li>
              <li>
                <strong>Funcionalidades criadas pela Nexvel</strong> — gamificação (pontos, ligas, ranking),
                notificações de engajamento e a redação automática de relatórios por IA: nessas a{" "}
                <strong>finalidade é decidida pela Nexvel</strong>, e não pelo nutricionista, de modo que aqui ela
                também age como controladora. As comunicações de engajamento podem ser desligadas pela paciente no
                próprio aplicativo (seção 7).
              </li>
            </ul>
          </Section>

          <Section titulo="2. Dados que coletamos">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Dados do nutricionista:</strong> nome, e-mail, CRN e senha (armazenada com hash bcrypt).</li>
              <li><strong>Dados das pacientes:</strong> nome, e-mail, telefone, fotos de evolução, peso, medidas corporais, planos alimentares e histórico de saúde (anamnese). Esses dados são inseridos pelo nutricionista ou pela própria paciente pelo portal.</li>
              <li><strong>Dados de uso:</strong> logs de acesso, endereço IP e eventos de navegação para fins de segurança e melhoria do serviço.</li>
              <li><strong>Dados de pagamento:</strong> processados integralmente pelo Stripe (cartão) ou pelo Asaas (Pix). Não armazenamos números de cartão.</li>
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
              <li><strong>Neon</strong> — banco de dados. É onde ficam armazenados os dados de saúde. Servidores em <strong>São Paulo, Brasil</strong>.</li>
              <li><strong>Supabase</strong> — armazenamento das fotos de evolução. As fotos ficam em área privada, acessível apenas por links temporários assinados.</li>
              <li><strong>Render</strong> — servidor da aplicação (processa os dados para responder às requisições).</li>
              <li><strong>Vercel</strong> — hospedagem da interface.</li>
              <li><strong>Stripe</strong> — processamento de pagamentos por cartão.</li>
              <li><strong>Asaas</strong> — processamento de pagamentos por Pix. Servidores no Brasil.</li>
              <li><strong>Resend</strong> — envio de e-mails transacionais. Servidores em São Paulo, Brasil.</li>
              <li><strong>Sentry</strong> — monitoramento de erros. Recebe apenas dados técnicos da falha (mensagem de erro, tela e identificador interno da conta). Não recebe seu nome, e-mail, fotos nem dados de saúde. Servidores nos <strong>Estados Unidos</strong>.</li>
              <li><strong>Anthropic</strong> — geração do texto do relatório mensal. Recebe dados de acompanhamento (adesão, registros e evolução do período) para redigir o resumo entregue ao nutricionista. Servidores nos <strong>Estados Unidos</strong>.</li>
            </ul>
          </Section>

          <Section titulo="6. Transferência internacional de dados">
            Parte dos prestadores acima trata dados fora do Brasil — atualmente
            <strong> Sentry</strong> e <strong>Anthropic</strong>, ambos nos Estados Unidos, e
            o <strong>Stripe</strong>, nos Estados Unidos e na Irlanda. O banco de dados onde
            ficam armazenados os dados de saúde permanece no Brasil.
          </Section>

          <Section titulo="7. Retenção e exclusão">
            Mantemos os dados enquanto a conta estiver ativa. A exclusão pode ser solicitada a qualquer
            momento — pelo próprio aplicativo ou por e-mail para{" "}
            <a href="mailto:contato@nexvel.tech" className="text-nx-evo underline">contato@nexvel.tech</a>.
            Ao ser solicitada, os dados pessoais e de saúde (anamnese, medições, registros, check-ins e
            fotos) são eliminados de forma permanente e irreversível. Registros financeiros e fiscais
            podem ser retidos pelo prazo legal exigido, e as cópias de segurança são sobrescritas nos
            ciclos regulares de backup.
          </Section>

          <Section titulo="8. Seus direitos">
            Você tem direito a: acessar, corrigir, portar, eliminar seus dados e revogar consentimentos.
            Exportação e exclusão de dados podem ser feitas diretamente no aplicativo (em Conta). O
            consentimento para comunicações de engajamento pode ser revogado a qualquer momento em
            Conta › Comunicações de engajamento. Para os demais direitos, entre em contato pelo e-mail de privacidade.
          </Section>

          <Section titulo="9. Segurança">
            Utilizamos criptografia em trânsito (HTTPS/TLS), hash bcrypt para senhas e tokens JWT com prazo
            de expiração. Realizamos auditorias periódicas de segurança.
          </Section>

          <Section titulo="10. Cookies">
            Não utilizamos cookies de rastreamento ou publicidade. Para manter você conectado,
            guardamos o token de autenticação no armazenamento local do navegador
            (localStorage) — que, tecnicamente, não é um cookie e não é enviado a
            terceiros.
          </Section>

          <Section titulo="11. Contato">
            Dúvidas, solicitações ou reclamações sobre privacidade devem ser dirigidas ao Encarregado (DPO),
            Gabriel Machado, pelo e-mail{" "}
            <a href="mailto:contato@nexvel.tech" className="text-nx-evo underline">contato@nexvel.tech</a>.
            Controladora: FTA Marketing LTDA. Se a solicitação for sobre dados clínicos de uma paciente, veja
            antes a seção 1.1 — nesse caso o controlador é o nutricionista responsável.
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

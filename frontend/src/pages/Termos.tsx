import { Link } from "react-router-dom";

export default function Termos() {
  return (
    <div className="min-h-screen bg-nx-bg">
      <nav className="bg-nx-surface border-b border-nx-border px-6 py-4 flex items-center justify-between">
        <Link to="/"><img src="/nexvel-wordmark.png" alt="Nexvel" className="h-6 w-auto" /></Link>
        <Link to="/login" className="text-sm text-nx-evo font-medium hover:text-nx-on-surface">Entrar</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-nx-on-surface mb-2">Termos de Uso</h1>
        <p className="text-nx-on-surface-variant text-sm mb-10">Última atualização: junho de 2026</p>

        <div className="bg-nx-surface rounded-2xl p-8 space-y-8 text-nx-on-surface-variant leading-relaxed">
          <Section titulo="1. Aceitação">
            Ao criar uma conta na Nexvel, você concorda integralmente com estes Termos de Uso e com nossa{" "}
            <Link to="/privacidade" className="text-nx-evo underline">Política de Privacidade</Link>.
            Se não concordar, não utilize o serviço.
          </Section>

          <Section titulo="2. Descrição do serviço">
            A Nexvel é uma plataforma de gestão para nutricionistas autônomos que inclui: cadastro de pacientes,
            geração de planos alimentares, portal da paciente, agendamento, controle financeiro, check-ins semanais
            e lembretes via WhatsApp.
          </Section>

          <Section titulo="3. Cadastro e conta">
            <ul className="list-disc pl-5 space-y-2">
              <li>Você é responsável por manter a confidencialidade de suas credenciais.</li>
              <li>Uma conta é de uso exclusivamente pessoal (um nutricionista por conta).</li>
              <li>Você deve fornecer informações verdadeiras no cadastro, incluindo CRN válido.</li>
              <li>A Nexvel pode suspender contas que violem estes termos.</li>
            </ul>
          </Section>

          <Section titulo="4. Planos e pagamentos">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Trial:</strong> 14 dias gratuitos sem necessidade de cartão.</li>
              <li><strong>Nexvel Pro (mensal):</strong> R$ 149/mês, cobrado mensalmente via cartão ou Pix.</li>
              <li><strong>Nexvel Pro (anual):</strong> R$ 1.490/ano (equivalente a R$ 124,17/mês), cobrado anualmente.</li>
              <li>Os preços podem ser alterados mediante aviso prévio de 30 dias por e-mail.</li>
              <li>Reembolsos: não oferecemos reembolso proporcional por cancelamento antecipado, mas o acesso
              permanece ativo até o fim do período pago.</li>
            </ul>
          </Section>

          <Section titulo="5. Cancelamento">
            Você pode cancelar a assinatura a qualquer momento pelo portal de gerenciamento ou enviando e-mail
            para <a href="mailto:suporte@nexvel.com.br" className="text-nx-evo underline">suporte@nexvel.com.br</a>.
            O cancelamento encerra a renovação automática. O acesso permanece ativo até o fim do ciclo pago.
          </Section>

          <Section titulo="6. Responsabilidade pelo conteúdo">
            O nutricionista é inteiramente responsável pelo conteúdo dos planos alimentares, orientações e
            informações inseridas na plataforma. A Nexvel não é prestadora de serviços de saúde e não valida
            orientações nutricionais. O uso da plataforma não substitui a responsabilidade profissional do nutricionista
            conforme o CFN.
          </Section>

          <Section titulo="7. Dados das pacientes">
            Ao cadastrar dados de pacientes, você declara ter obtido o consentimento necessário conforme a LGPD
            e o sigilo profissional exigido pelo CFN. A Nexvel atua como operadora dos dados (art. 39 da LGPD),
            sendo o nutricionista o controlador.
          </Section>

          <Section titulo="8. Propriedade intelectual">
            Todo o código, design, marca e conteúdo da Nexvel são de propriedade da Nexvel. Você recebe uma licença
            limitada, não exclusiva e intransferível para usar a plataforma conforme estes termos.
          </Section>

          <Section titulo="9. Limitação de responsabilidade">
            A Nexvel não se responsabiliza por danos indiretos, lucros cessantes ou perda de dados decorrentes
            do uso ou impossibilidade de uso do serviço. Nossa responsabilidade máxima é limitada ao valor pago
            nos últimos 3 meses.
          </Section>

          <Section titulo="10. Disponibilidade">
            A Nexvel não garante disponibilidade ininterrupta. Faremos manutenções programadas com aviso prévio
            e nos esforçamos para manter disponibilidade acima de 99% mensais.
          </Section>

          <Section titulo="11. Alterações nos termos">
            Podemos atualizar estes termos mediante aviso prévio por e-mail com 15 dias de antecedência.
            O uso continuado após essa data implica aceitação dos novos termos.
          </Section>

          <Section titulo="12. Foro">
            Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de São Paulo/SP
            para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.
          </Section>

          <Section titulo="13. Contato">
            <a href="mailto:suporte@nexvel.com.br" className="text-nx-evo underline">suporte@nexvel.com.br</a>
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

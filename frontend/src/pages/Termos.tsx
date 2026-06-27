import { Link } from "react-router-dom";

export default function Termos() {
  return (
    <div className="min-h-screen bg-zena-cream">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-zena-green-dark tracking-tight">clinne</Link>
        <Link to="/login" className="text-sm text-zena-green-mid font-medium hover:text-zena-green-dark">Entrar</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-zena-green-dark mb-2">Termos de Uso</h1>
        <p className="text-zena-text-light text-sm mb-10">Última atualização: junho de 2026</p>

        <div className="bg-white rounded-2xl p-8 space-y-8 text-zena-text-mid leading-relaxed">
          <Section titulo="1. Aceitação">
            Ao criar uma conta na Clinne, você concorda integralmente com estes Termos de Uso e com nossa{" "}
            <Link to="/privacidade" className="text-zena-green-mid underline">Política de Privacidade</Link>.
            Se não concordar, não utilize o serviço.
          </Section>

          <Section titulo="2. Descrição do serviço">
            A Clinne é uma plataforma de gestão para nutricionistas autônomos que inclui: cadastro de pacientes,
            geração de planos alimentares, portal da paciente, agendamento, controle financeiro, check-ins semanais
            e lembretes via WhatsApp.
          </Section>

          <Section titulo="3. Cadastro e conta">
            <ul className="list-disc pl-5 space-y-2">
              <li>Você é responsável por manter a confidencialidade de suas credenciais.</li>
              <li>Uma conta é de uso exclusivamente pessoal (um nutricionista por conta).</li>
              <li>Você deve fornecer informações verdadeiras no cadastro, incluindo CRN válido.</li>
              <li>A Clinne pode suspender contas que violem estes termos.</li>
            </ul>
          </Section>

          <Section titulo="4. Planos e pagamentos">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Trial:</strong> 29 dias gratuitos sem necessidade de cartão.</li>
              <li><strong>Plano Mensal:</strong> R$ 69/mês, cobrado mensalmente via Stripe.</li>
              <li><strong>Plano Anual:</strong> R$ 708/ano (equivalente a R$ 59/mês), cobrado anualmente.</li>
              <li>Os preços podem ser alterados mediante aviso prévio de 30 dias por e-mail.</li>
              <li>Reembolsos: não oferecemos reembolso proporcional por cancelamento antecipado, mas o acesso
              permanece ativo até o fim do período pago.</li>
            </ul>
          </Section>

          <Section titulo="5. Cancelamento">
            Você pode cancelar a assinatura a qualquer momento pelo portal de gerenciamento ou enviando e-mail
            para <a href="mailto:suporte@clinne.com.br" className="text-zena-green-mid underline">suporte@clinne.com.br</a>.
            O cancelamento encerra a renovação automática. O acesso permanece ativo até o fim do ciclo pago.
          </Section>

          <Section titulo="6. Responsabilidade pelo conteúdo">
            O nutricionista é inteiramente responsável pelo conteúdo dos planos alimentares, orientações e
            informações inseridas na plataforma. A Clinne não é prestadora de serviços de saúde e não valida
            orientações nutricionais. O uso da plataforma não substitui a responsabilidade profissional do nutricionista
            conforme o CFN.
          </Section>

          <Section titulo="7. Dados das pacientes">
            Ao cadastrar dados de pacientes, você declara ter obtido o consentimento necessário conforme a LGPD
            e o sigilo profissional exigido pelo CFN. A Clinne atua como operadora dos dados (art. 39 da LGPD),
            sendo o nutricionista o controlador.
          </Section>

          <Section titulo="8. Propriedade intelectual">
            Todo o código, design, marca e conteúdo da Clinne são de propriedade da Clinne. Você recebe uma licença
            limitada, não exclusiva e intransferível para usar a plataforma conforme estes termos.
          </Section>

          <Section titulo="9. Limitação de responsabilidade">
            A Clinne não se responsabiliza por danos indiretos, lucros cessantes ou perda de dados decorrentes
            do uso ou impossibilidade de uso do serviço. Nossa responsabilidade máxima é limitada ao valor pago
            nos últimos 3 meses.
          </Section>

          <Section titulo="10. Disponibilidade">
            A Clinne não garante disponibilidade ininterrupta. Faremos manutenções programadas com aviso prévio
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
            <a href="mailto:suporte@clinne.com.br" className="text-zena-green-mid underline">suporte@clinne.com.br</a>
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

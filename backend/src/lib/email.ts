import { Resend } from "resend";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "Clinne <noreply@clinne.com.br>";
const BASE_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function base(titulo: string, corpo: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#F8F9F4;font-family:system-ui,sans-serif}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:#1C4A2E;padding:32px 40px;text-align:center}
  .logo{color:#B7E4C7;font-size:28px;font-weight:700;letter-spacing:-1px}
  .body{padding:40px}
  h2{color:#1C4A2E;margin:0 0 16px}
  p{color:#4a4a4a;line-height:1.7;margin:0 0 16px}
  .btn{display:inline-block;background:#2D6A4F;color:#fff!important;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;margin:8px 0}
  .footer{background:#F8F9F4;padding:20px 40px;text-align:center;color:#999;font-size:13px}
  .footer a{color:#2D6A4F}
</style></head>
<body>
<div class="wrap">
  <div class="header"><div class="logo">clinne</div></div>
  <div class="body"><h2>${titulo}</h2>${corpo}</div>
  <div class="footer">
    Clinne — Plataforma para nutricionistas<br>
    <a href="${BASE_URL}/privacidade">Privacidade</a> · <a href="${BASE_URL}/termos">Termos</a>
  </div>
</div>
</body></html>`;
}

export async function emailBoasVindas(nome: string, email: string) {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Bem-vinda à Clinne! 🌿",
    html: base(
      `Olá, ${nome}! 🌿`,
      `<p>Seu período de teste de <strong>29 dias grátis</strong> começa agora. Nenhum cartão necessário.</p>
       <p>Com a Clinne você vai:</p>
       <ul style="color:#4a4a4a;line-height:2">
         <li>Enviar planos alimentares em PDF profissional</li>
         <li>Acompanhar seus pacientes pelo portal digital</li>
         <li>Receber check-ins semanais automáticos</li>
         <li>Gerenciar agenda e cobranças em um só lugar</li>
       </ul>
       <a href="${BASE_URL}/app/dashboard" class="btn">Acessar minha conta →</a>
       <p style="margin-top:24px;font-size:14px;color:#999">Qualquer dúvida, responda este e-mail. Estamos aqui!</p>`
    ),
  });
}

export async function emailRecuperacaoSenha(email: string, token: string) {
  const resend = getResend();
  if (!resend) return;
  const link = `${BASE_URL}/redefinir-senha?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Redefinição de senha — Clinne",
    html: base(
      "Redefinir sua senha",
      `<p>Recebemos uma solicitação para redefinir a senha da sua conta Clinne.</p>
       <p>Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
       <a href="${link}" class="btn">Redefinir senha →</a>
       <p style="margin-top:24px;font-size:14px;color:#999">Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.</p>`
    ),
  });
}

export async function emailTrialExpirando(nome: string, email: string, diasRestantes: number) {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Seu trial Clinne expira em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} ⏰`,
    html: base(
      `${nome}, seu trial acaba em breve!`,
      `<p>Você tem apenas <strong>${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}</strong> restante${diasRestantes !== 1 ? "s" : ""} no seu período gratuito.</p>
       <p>Para não perder o acesso às suas pacientes, planos e histórico, assine agora:</p>
       <a href="${BASE_URL}/app/billing" class="btn">Ver planos →</a>
       <p style="margin-top:24px;font-size:14px;color:#999">Qualquer dúvida, responda este e-mail. Estamos aqui!</p>`
    ),
  });
}

export async function emailConfirmacaoConsulta(
  emailNutri: string,
  nomeNutri: string,
  nomePaciente: string,
  data: Date
) {
  const resend = getResend();
  if (!resend) return;
  const dataFmt = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(data);
  await resend.emails.send({
    from: FROM,
    to: emailNutri,
    subject: `Nova consulta solicitada — ${nomePaciente}`,
    html: base(
      "Nova solicitação de consulta",
      `<p>Sua paciente <strong>${nomePaciente}</strong> solicitou uma consulta para:</p>
       <p style="font-size:18px;color:#1C4A2E;font-weight:600">${dataFmt}</p>
       <a href="${BASE_URL}/dashboard" class="btn">Ver solicitação →</a>`
    ),
  });
}

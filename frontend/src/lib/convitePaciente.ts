// Convite do paciente: link direto pra área de cadastro (com o código já
// preenchido) + mensagem pronta pra a nutri encaminhar (WhatsApp etc.).

/** Link clicável que abre o cadastro do paciente já com o código preenchido. */
export function linkCadastroPaciente(codigo: string): string {
  const base = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://nexvel.tech";
  return `${base}/login-paciente?tab=register&codigo=${encodeURIComponent(codigo)}`;
}

/** Mensagem de convite pronta (link clicável + código de backup + instrução). */
export function mensagemConvite(nome: string, codigo: string): string {
  const primeiro = (nome ?? "").trim().split(" ")[0] || (nome ?? "").trim() || "Olá";
  const link = linkCadastroPaciente(codigo);
  return (
    `Olá, ${primeiro}! 💚 Você foi convidado(a) para acompanhar sua evolução no app Nexvel.\n\n` +
    `Crie sua conta direto por aqui (o código já vai preenchido):\n${link}\n\n` +
    `Código do convite: ${codigo}\n` +
    `No cadastro, confirme com os últimos 4 dígitos do seu telefone. O convite é individual e de uso único.`
  );
}

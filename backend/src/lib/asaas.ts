const BASE = process.env.ASAAS_ENV === "production"
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

async function req(apiKey: string, method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { access_token: apiKey, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as any;
  if (!res.ok) throw new Error(json.errors?.[0]?.description || `Asaas ${res.status}`);
  return json;
}

// Usa a chave do NUTRICIONISTA — dinheiro vai para a conta do nutricionista
export async function criarOuBuscarCliente(apiKey: string, nome: string, email?: string, cpfCnpj?: string) {
  if (email) {
    const existing = await req(apiKey, "GET", `/customers?email=${encodeURIComponent(email)}&limit=1`);
    if (existing.data?.length > 0) return existing.data[0];
  }
  return req(apiKey, "POST", "/customers", {
    name: nome,
    email: email || undefined,
    cpfCnpj: cpfCnpj || undefined,
    notificationDisabled: true,
  });
}

export async function criarCobrancaPix(apiKey: string, customerId: string, valor: number, vencimento: string, descricao: string) {
  const charge = await req(apiKey, "POST", "/payments", {
    customer: customerId,
    billingType: "PIX",
    value: valor,
    dueDate: vencimento,
    description: descricao,
  });
  const pix = await req(apiKey, "GET", `/payments/${charge.id}/pixQrCode`);
  return { charge, pix };
}

export async function cancelarCobranca(apiKey: string, chargeId: string) {
  return req(apiKey, "DELETE", `/payments/${chargeId}`);
}

export async function buscarStatusCobranca(apiKey: string, chargeId: string) {
  return req(apiKey, "GET", `/payments/${chargeId}`);
}

// ── Nexvel subscription (usa a chave DO NEXVEL, não do nutricionista) ──────────

function nexvelKey() {
  const k = process.env.NEXVEL_ASAAS_API_KEY;
  if (!k) throw new Error("NEXVEL_ASAAS_API_KEY não configurada.");
  return k;
}

export async function nexvelReq(method: string, path: string, body?: any) {
  return req(nexvelKey(), method, path, body);
}

export async function criarClienteNexvel(nome: string, email: string, cpfCnpj?: string) {
  const existing = await nexvelReq("GET", `/customers?email=${encodeURIComponent(email)}&limit=1`);
  const found = existing.data?.[0] as { id: string; cpfCnpj?: string | null } | undefined;
  if (found) {
    // Cliente já existe (possivelmente criado sem CPF numa tentativa anterior).
    // O Asaas exige CPF/CNPJ para Pix → garante que esteja preenchido/atualizado.
    if (cpfCnpj && found.cpfCnpj !== cpfCnpj) {
      return nexvelReq("POST", `/customers/${found.id}`, { name: nome, cpfCnpj });
    }
    return found;
  }
  return nexvelReq("POST", "/customers", {
    name: nome,
    email,
    cpfCnpj: cpfCnpj || undefined,
    notificationDisabled: false,
  });
}

export async function criarAssinaturaPix(customerId: string, valor: number, ciclo: "MONTHLY" | "YEARLY", descricao: string, nutricionistaId: string) {
  const hoje = new Date();
  const nextDue = hoje.toISOString().split("T")[0];
  const sub = await nexvelReq("POST", "/subscriptions", {
    customer: customerId,
    billingType: "PIX",
    nextDueDate: nextDue,
    value: valor,
    cycle: ciclo,
    description: descricao,
    externalReference: nutricionistaId,
  });
  // Busca o primeiro pagamento gerado pela assinatura
  const payments = await nexvelReq("GET", `/subscriptions/${sub.id}/payments?limit=1`);
  const firstPayment = payments.data?.[0];
  let pix = null;
  if (firstPayment) {
    pix = await nexvelReq("GET", `/payments/${firstPayment.id}/pixQrCode`);
  }
  return { subscription: sub, firstPayment, pix };
}

export async function cancelarAssinatura(subscriptionId: string) {
  return nexvelReq("DELETE", `/subscriptions/${subscriptionId}`);
}

export async function buscarAssinatura(subscriptionId: string) {
  return nexvelReq("GET", `/subscriptions/${subscriptionId}`);
}

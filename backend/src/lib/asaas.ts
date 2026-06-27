const BASE = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

async function req(apiKey: string, method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as any;
  if (!res.ok) throw new Error(json.errors?.[0]?.description || `Asaas ${res.status}`);
  return json;
}

export async function criarOuBuscarCliente(apiKey: string, nome: string, email?: string, cpfCnpj?: string) {
  if (email) {
    const existing = await req(apiKey, 'GET', `/customers?email=${encodeURIComponent(email)}&limit=1`);
    if (existing.data?.length > 0) return existing.data[0];
  }
  return req(apiKey, 'POST', '/customers', {
    name: nome,
    email: email || undefined,
    cpfCnpj: cpfCnpj || undefined,
    notificationDisabled: true,
  });
}

export async function criarCobrancaPix(
  apiKey: string,
  customerId: string,
  valor: number,
  vencimento: string,
  descricao: string
) {
  const charge = await req(apiKey, 'POST', '/payments', {
    customer: customerId,
    billingType: 'PIX',
    value: valor,
    dueDate: vencimento,
    description: descricao,
    externalReference: undefined,
  });
  const pix = await req(apiKey, 'GET', `/payments/${charge.id}/pixQrCode`);
  return { charge, pix };
}

export async function cancelarCobranca(apiKey: string, chargeId: string) {
  return req(apiKey, 'DELETE', `/payments/${chargeId}`);
}

export async function buscarStatusCobranca(apiKey: string, chargeId: string) {
  return req(apiKey, 'GET', `/payments/${chargeId}`);
}

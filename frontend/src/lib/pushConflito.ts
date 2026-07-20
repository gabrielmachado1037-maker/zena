/**
 * O backend agora recusa (409) registrar um endpoint de push que pertence a
 * outra conta — sem isso, quem conhecesse o endpoint alheio redirecionava as
 * notificações da vítima para si.
 *
 * O efeito colateral legítimo: um aparelho onde alguém saiu de uma conta e
 * entrou em outra continua com o MESMO endpoint (o navegador o reaproveita
 * enquanto a subscription existir), e passaria a levar 409 para sempre — sem
 * push, em silêncio.
 *
 * A saída é o próprio navegador: descartar a subscription atual e criar outra
 * gera um endpoint novo, sem conflito e sem precisar tocar na conta anterior.
 */
export function ehConflitoDeConta(erro: unknown): boolean {
  const e = erro as { response?: { status?: number; data?: { code?: string } } };
  return e?.response?.status === 409 && e.response?.data?.code === "endpoint_de_outra_conta";
}

/**
 * Envia a subscription; se o backend acusar conflito, troca o endpoint por um
 * novo e tenta uma única vez. Retorna a subscription em vigor, ou null se nem
 * a segunda tentativa funcionou (push fica desligado, mas nada quebra).
 */
export async function registrarSubscription(
  reg: ServiceWorkerRegistration,
  applicationServerKey: BufferSource,
  enviar: (sub: PushSubscription) => Promise<unknown>,
): Promise<PushSubscription | null> {
  const atual =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));

  try {
    await enviar(atual);
    return atual;
  } catch (erro) {
    if (!ehConflitoDeConta(erro)) return null;

    await atual.unsubscribe().catch(() => {});
    const nova = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    try {
      await enviar(nova);
      return nova;
    } catch {
      return null;
    }
  }
}

/**
 * Desfaz o registro no aparelho e avisa o backend. Chamado no logout: sem isso
 * a linha do usuário anterior fica no banco e o próximo login neste aparelho
 * cai no 409 acima (que se resolve sozinho, mas gera um round-trip inútil e
 * deixa o endpoint antigo apto a receber push de quem já saiu).
 */
export async function encerrarSubscription(
  remover: (endpoint: string) => Promise<unknown>,
): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const { endpoint } = sub;
    await sub.unsubscribe().catch(() => {});
    await remover(endpoint).catch(() => {});
  } catch {
    // Best-effort: falhar aqui não pode impedir o logout.
  }
}

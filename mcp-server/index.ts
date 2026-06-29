#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import express, { type Request, type Response } from "express";
import crypto from "crypto";

// ─── Configuração ──────────────────────────────────────────────────────────────

const BASE =
  (process.env.CLINNE_API_URL ?? "https://zena-l2jd.onrender.com").replace(/\/$/, "") + "/api";

const HOST =
  process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

let jwtToken: string | null = process.env.CLINNE_TOKEN ?? null;

// ─── Auth contra o Clinne ─────────────────────────────────────────────────────

async function login(): Promise<void> {
  const email = process.env.CLINNE_EMAIL;
  const senha = process.env.CLINNE_PASSWORD;
  if (!email || !senha)
    throw new Error("Defina CLINNE_TOKEN ou CLINNE_EMAIL + CLINNE_PASSWORD.");

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (!res.ok) throw new Error(`Login falhou (${res.status}): ${await res.text()}`);
  jwtToken = ((await res.json()) as { token: string }).token;
}

let reauthenticating = false;

async function loginComRetry(tentativas = 5, delayMs = 3000): Promise<void> {
  for (let i = 1; i <= tentativas; i++) {
    try {
      await login();
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[clinne-mcp] Login tentativa ${i}/${tentativas} falhou: ${msg}`);
      if (i < tentativas) await new Promise(r => setTimeout(r, delayMs * i));
    }
  }
  throw new Error("Não foi possível autenticar após várias tentativas. Verifique CLINNE_EMAIL e CLINNE_PASSWORD.");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!jwtToken) await loginComRetry();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 && !reauthenticating) {
    reauthenticating = true; jwtToken = null;
    await loginComRetry(); reauthenticating = false;
    return apiFetch<T>(path, init);
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Schema do banco (estático) ──────────────────────────────────────────────

const SCHEMA_RESUMO = `
MODELOS PRISMA — Clinne (PostgreSQL / Neon)

Nutricionista         → usuário principal (1 por conta)
  campos: id, nome, email, crn, plano, planoAtivo, trialEnd, stripeCustomerId,
          asaasApiKey, nomeConsultorio, logoConsultorio, enderecoConsultorio

Paciente              → pertence a 1 Nutricionista
  campos: id, nome, email, telefone, objetivo, dataInicio, ativo, pesoMeta,
          dataNascimento, sexo, altura, linkUnico (único — portal do paciente)
  índice: nutricionistaId

Medicao               → medições corporais do paciente
  campos: id, pacienteId, data, peso, gordura, musculo, cintura, quadril, braco, coxa, laudo, observacoes

Consulta              → consultas agendadas
  campos: id, pacienteId, data, status (agendada|realizada|cancelada), tipo, notas
  índices: pacienteId, data

Cobranca              → cobranças individuais
  campos: id, pacienteId, valor, vencimento, status (pendente|pago|vencido|cancelado),
          metodo, pagoEm, asaasChargeId, pixCopiaECola, linkPagamento

PlanoCobranca         → plano de cobrança recorrente (1 por paciente)
  campos: id, pacienteId, valor, periodicidade (mensal|trimestral|anual), diaVencimento, ativo

PlanoAlimentar        → planos alimentares do paciente
  campos: id, pacienteId, dataCriacao, cafeManha, lancheManha, almoco, lancheTarde, jantar, ceia, observacoes

CheckIn               → check-in semanal de hábitos (único por semana/ano)
  campos: id, pacienteId, semana (ISO), ano, humor (1-5), adesao (1-10), peso, nota

Anamnese              → anamnese clínica (1 por paciente)
  campos: queixaPrincipal, restricoes, medicamentos, condicoesSaude, nivelAtividade,
          horasSono, nivelEstresse, refeicoesDia, consumoAgua, motivacao

HorarioDisponivel     → horários de atendimento configurados
  campos: id, nutricionistaId, diaSemana (0-6), hora (HH:MM), duracaoMinutos, ativo

RankingPontuacao      → pontuação calculada por período
  campos: pacienteId, periodo (semanal|mensal), semana, mes, ano,
          pctObjetivoPeso, diasConsecutivosHabitos, metasSemanaisBatidas, pontuacaoTotal, posicaoRanking

RankingConfig         → pesos do ranking (1 por nutricionista)
  campos: pesoPesoMeta (padrão 40), pesoHabitosConsecutivos (30), pesoMetasSemanais (30),
          diasConsecutivosAlvo (7), metasSemanaisAlvo (4)

FeedPost              → posts automáticos do feed social
  campos: id, tipo (META_BATIDA|PESO_ALCANCADO|CONQUISTA), pacienteId, nutricionistaId,
          mensagem, curtidas, criadoEm

PushSubscription      → assinaturas Web Push
  campos: id, nutricionistaId, endpoint, p256dh, auth

FotoEvolucao / RegistroFotos → fotos de evolução do paciente
RegistroContato       → histórico de contatos (WhatsApp etc.)
MensagemWhatsApp      → mensagens enviadas por template
Lembrete              → lembretes internos da nutricionista
TokenRedefinicao      → tokens de redefinição de senha
DailyQuote            → frase do dia (cache)
`;

// ─── Endpoints da API (estático) ─────────────────────────────────────────────

const ENDPOINTS_API = [
  // Auth
  { metodo: "POST", rota: "/api/auth/login",                auth: false, desc: "Login — retorna JWT" },
  { metodo: "POST", rota: "/api/auth/registro",             auth: false, desc: "Cria conta de nutricionista" },
  { metodo: "POST", rota: "/api/auth/forgot-password",      auth: false, desc: "Envia email de redefinição" },
  { metodo: "POST", rota: "/api/auth/reset-password",       auth: false, desc: "Redefine senha via token" },
  // Pacientes
  { metodo: "GET",  rota: "/api/pacientes",                 auth: true,  desc: "Lista pacientes com paginação (busca, status, limit, page)" },
  { metodo: "POST", rota: "/api/pacientes",                 auth: true,  desc: "Cria paciente" },
  { metodo: "GET",  rota: "/api/pacientes/:id",             auth: true,  desc: "Dados completos do paciente" },
  { metodo: "PUT",  rota: "/api/pacientes/:id",             auth: true,  desc: "Atualiza paciente" },
  { metodo: "DELETE",rota:"/api/pacientes/:id",             auth: true,  desc: "Remove paciente" },
  // Medições
  { metodo: "GET",  rota: "/api/pacientes/:id/medicoes",    auth: true,  desc: "Histórico de medições" },
  { metodo: "POST", rota: "/api/pacientes/:id/medicoes",    auth: true,  desc: "Registra medição" },
  // Planos alimentares
  { metodo: "GET",  rota: "/api/pacientes/:id/planos",      auth: true,  desc: "Lista planos alimentares" },
  { metodo: "POST", rota: "/api/pacientes/:id/planos",      auth: true,  desc: "Cria plano alimentar" },
  // Consultas
  { metodo: "GET",  rota: "/api/consultas",                 auth: true,  desc: "Lista consultas (inicio, fim, pacienteId)" },
  { metodo: "POST", rota: "/api/consultas",                 auth: true,  desc: "Agenda consulta" },
  { metodo: "PUT",  rota: "/api/consultas/:id",             auth: true,  desc: "Atualiza status/notas" },
  { metodo: "DELETE",rota:"/api/consultas/:id",             auth: true,  desc: "Cancela consulta" },
  // Cobranças
  { metodo: "GET",  rota: "/api/cobrancas",                 auth: true,  desc: "Lista cobranças (status, pacienteId)" },
  { metodo: "POST", rota: "/api/cobrancas",                 auth: true,  desc: "Cria cobrança" },
  { metodo: "PUT",  rota: "/api/cobrancas/:id",             auth: true,  desc: "Marca como paga etc." },
  // Financeiro
  { metodo: "GET",  rota: "/api/financeiro/dashboard",      auth: true,  desc: "Dashboard: faturamento mês, pendentes, vencidos" },
  // Horários
  { metodo: "GET",  rota: "/api/horarios",                  auth: true,  desc: "Horários disponíveis configurados" },
  { metodo: "POST", rota: "/api/horarios",                  auth: true,  desc: "Cria horário disponível" },
  { metodo: "DELETE",rota:"/api/horarios/:id",              auth: true,  desc: "Remove horário" },
  // Ranking
  { metodo: "GET",  rota: "/api/ranking",                   auth: true,  desc: "Ranking (periodo, semana, mes, ano)" },
  { metodo: "POST", rota: "/api/ranking/recalcular",        auth: true,  desc: "Força recálculo do ranking" },
  { metodo: "GET",  rota: "/api/ranking/config",            auth: true,  desc: "Configuração dos pesos" },
  { metodo: "PUT",  rota: "/api/ranking/config",            auth: true,  desc: "Atualiza pesos do ranking" },
  // Feed
  { metodo: "GET",  rota: "/api/feed",                      auth: true,  desc: "Posts do feed social" },
  { metodo: "POST", rota: "/api/feed/:id/curtir",           auth: true,  desc: "Curte/descurte post" },
  // Check-ins
  { metodo: "GET",  rota: "/api/checkins/paciente/:id",     auth: true,  desc: "Check-ins de um paciente" },
  { metodo: "POST", rota: "/api/checkins",                  auth: false, desc: "Registra check-in (portal do paciente)" },
  // Anamnese
  { metodo: "GET",  rota: "/api/anamnese/:pacienteId",      auth: true,  desc: "Anamnese do paciente" },
  { metodo: "POST", rota: "/api/anamnese",                  auth: true,  desc: "Cria/atualiza anamnese" },
  // Notificações (Web Push)
  { metodo: "POST", rota: "/api/notificacoes/subscribe",    auth: true,  desc: "Registra subscription push" },
  { metodo: "DELETE",rota:"/api/notificacoes/unsubscribe",  auth: true,  desc: "Remove subscription" },
  // Dashboard
  { metodo: "GET",  rota: "/api/dashboard",                 auth: true,  desc: "Métricas resumo do dashboard" },
  // Perfil
  { metodo: "GET",  rota: "/api/perfil",                    auth: true,  desc: "Dados da nutricionista logada" },
  { metodo: "PUT",  rota: "/api/perfil",                    auth: true,  desc: "Atualiza perfil" },
  // Portal público (paciente)
  { metodo: "GET",  rota: "/api/publica/:linkUnico",        auth: false, desc: "Dados do paciente via link único" },
  // Billing (Stripe/Asaas)
  { metodo: "POST", rota: "/api/billing/checkout",          auth: true,  desc: "Cria sessão de checkout" },
  { metodo: "POST", rota: "/api/billing/webhook",           auth: false, desc: "Webhook Stripe/Asaas" },
];

// ─── Ferramentas ──────────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: "listar_pacientes",
    description: "Lista todos os pacientes da nutricionista. Retorna nome, status, última medição, próxima consulta e situação de cobrança.",
    inputSchema: {
      type: "object",
      properties: {
        busca:  { type: "string",  description: "Busca por nome." },
        status: { type: "string",  description: "'ativo', 'inativo' ou 'todos'.", enum: ["todos","ativo","inativo"] },
        limit:  { type: "number",  description: "Máximo de resultados (padrão 50)." },
      },
    },
  },
  {
    name: "ver_paciente",
    description: "Dados completos de um paciente: medições, consultas, planos alimentares, check-ins, cobranças e anamnese.",
    inputSchema: {
      type: "object",
      properties: {
        pacienteId: { type: "string", description: "UUID do paciente." },
        nome:       { type: "string", description: "Nome para busca (se não souber o ID)." },
      },
    },
  },
  {
    name: "ver_ranking",
    description: "Ranking de pacientes por pontuação: progresso de peso, hábitos e metas semanais.",
    inputSchema: {
      type: "object",
      properties: {
        periodo: { type: "string", enum: ["semanal","mensal"] },
        semana:  { type: "number" },
        mes:     { type: "number" },
        ano:     { type: "number" },
      },
    },
  },
  {
    name: "ver_financeiro",
    description: "Dashboard financeiro: faturamento do mês, cobranças pendentes e vencidas.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ver_agenda",
    description: "Consultas agendadas e horários disponíveis. Padrão: próximos 30 dias.",
    inputSchema: {
      type: "object",
      properties: {
        inicio: { type: "string", description: "YYYY-MM-DD (padrão: hoje)." },
        fim:    { type: "string", description: "YYYY-MM-DD (padrão: +30 dias)." },
      },
    },
  },
  {
    name: "ver_sistema",
    description: "Saúde e status do sistema Clinne: latência do backend, autenticação MCP, e resumo técnico da plataforma.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ver_metricas_gerais",
    description: "Visão geral de negócio: total de pacientes ativos/inativos, faturamento, cobranças pendentes, consultas do mês e feed.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ver_schema_banco",
    description: "Estrutura completa do banco de dados PostgreSQL: modelos, campos, relacionamentos e índices.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ver_endpoints_api",
    description: "Lista todos os endpoints da API REST do Clinne com método HTTP, rota, autenticação e descrição.",
    inputSchema: {
      type: "object",
      properties: {
        filtro: { type: "string", description: "Filtra por rota ou descrição (ex: 'paciente', 'financeiro')." },
      },
    },
  },
];

type Args = Record<string, unknown>;

async function runTool(name: string, args: Args): Promise<unknown> {
  switch (name) {
    case "listar_pacientes": {
      const busca  = args.busca  ? `&busca=${encodeURIComponent(String(args.busca))}` : "";
      const status = args.status ? `&status=${String(args.status)}` : "";
      return apiFetch<unknown>(`/pacientes?page=1&limit=${Math.min(50,Number(args.limit??50))}${busca}${status}`);
    }
    case "ver_paciente": {
      let id = args.pacienteId as string | undefined;
      if (!id && args.nome) {
        const lista = await apiFetch<{data:Array<{id:string;nome:string}>}>(
          `/pacientes?busca=${encodeURIComponent(String(args.nome))}&limit=5`);
        const f = lista.data ?? [];
        if (f.length === 0) return { erro: "Nenhum paciente encontrado." };
        if (f.length > 1)   return { aviso: "Vários encontrados. Especifique pacienteId.", pacientes: f.map(p=>({id:p.id,nome:p.nome})) };
        id = f[0].id;
      }
      if (!id) return { erro: "Informe pacienteId ou nome." };
      return apiFetch<unknown>(`/pacientes/${id}`);
    }
    case "ver_ranking": {
      const qs = new URLSearchParams({ periodo: String(args.periodo??"semanal") });
      if (args.ano)    qs.set("ano",    String(args.ano));
      if (args.semana) qs.set("semana", String(args.semana));
      if (args.mes)    qs.set("mes",    String(args.mes));
      return apiFetch<unknown>(`/ranking?${qs}`);
    }
    case "ver_financeiro": return apiFetch<unknown>("/financeiro/dashboard");
    case "ver_agenda": {
      const hoje = new Date();
      const em30 = new Date(hoje); em30.setDate(hoje.getDate()+30);
      const fmt = (d:Date) => d.toISOString().split("T")[0];
      const [consultas, horarios] = await Promise.all([
        apiFetch<unknown>(`/consultas?inicio=${args.inicio??fmt(hoje)}&fim=${args.fim??fmt(em30)}`),
        apiFetch<unknown>("/horarios"),
      ]);
      return { consultas, horarios_disponiveis: horarios };
    }

    case "ver_sistema": {
      const t0 = Date.now();
      let backendStatus = "online";
      let latenciaMs = 0;
      let backendAuth = "autenticado";
      try {
        await fetch(BASE.replace("/api","") + "/api/auth/login", { method: "HEAD" }).catch(()=>{});
        const ping = await fetch(BASE + "/dashboard", {
          headers: { Authorization: `Bearer ${jwtToken}` }
        });
        latenciaMs = Date.now() - t0;
        if (ping.status === 401) backendAuth = "token expirado (será renovado automaticamente)";
        if (!ping.ok && ping.status !== 401) backendStatus = `degradado (HTTP ${ping.status})`;
      } catch {
        backendStatus = "offline ou inacessível";
        latenciaMs = Date.now() - t0;
      }
      return {
        sistema: "Clinne — Plataforma para Nutricionistas",
        versao_mcp: "1.0.0",
        mcp_autenticado: !!jwtToken,
        backend: {
          url: BASE,
          status: backendStatus,
          autenticacao: backendAuth,
          latencia_ms: latenciaMs,
        },
        stack: {
          frontend: "React 18 + TypeScript + Vite + Tailwind CSS (Vercel)",
          backend: "Node.js 20 + Express 5 + Prisma 5 (Render — free tier)",
          banco: "PostgreSQL 16 via Neon (serverless, sa-east-1)",
          auth: "JWT Bearer (localStorage: zena_token + zena_user)",
          pagamentos: "Asaas (PIX/boleto) + Stripe (cartão)",
          push: "Web Push Notifications (VAPID)",
        },
        funcionalidades: [
          "Gestão de pacientes com portal individual por link único",
          "Medições corporais com histórico e gráficos",
          "Planos alimentares digitais",
          "Agenda de consultas",
          "Check-ins semanais de hábitos",
          "Ranking gamificado (semanal e mensal)",
          "Feed social de conquistas",
          "Financeiro: cobranças manuais e recorrentes",
          "Anamnese clínica digital",
          "Notificações Web Push",
        ],
        verificado_em: new Date().toISOString(),
      };
    }

    case "ver_metricas_gerais": {
      const [todosAtivos, todosInativos, financeiro, consultasMes, feed] = await Promise.allSettled([
        apiFetch<{total?:number;data?:unknown[]}>("/pacientes?status=ativo&limit=1"),
        apiFetch<{total?:number;data?:unknown[]}>("/pacientes?status=inativo&limit=1"),
        apiFetch<unknown>("/financeiro/dashboard"),
        apiFetch<unknown>(`/consultas?inicio=${new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split("T")[0]}&fim=${new Date(new Date().getFullYear(),new Date().getMonth()+1,0).toISOString().split("T")[0]}`),
        apiFetch<{posts?:unknown[]}>("/feed?limit=5"),
      ]);
      const ativos   = todosAtivos.status   === "fulfilled" ? todosAtivos.value?.total   ?? "?" : "erro";
      const inativos = todosInativos.status === "fulfilled" ? todosInativos.value?.total ?? "?" : "erro";
      return {
        pacientes: { ativos, inativos, total: typeof ativos === "number" && typeof inativos === "number" ? ativos + inativos : "?" },
        financeiro: financeiro.status === "fulfilled" ? financeiro.value : { erro: "indisponível" },
        consultas_mes_atual: consultasMes.status === "fulfilled" ? consultasMes.value : { erro: "indisponível" },
        feed_recente: feed.status === "fulfilled" ? { ultimos_posts: (feed.value?.posts ?? []).length } : { erro: "indisponível" },
        gerado_em: new Date().toISOString(),
      };
    }

    case "ver_schema_banco":
      return { schema: SCHEMA_RESUMO, fonte: "prisma/schema.prisma", banco: "PostgreSQL 16 (Neon serverless)" };

    case "ver_endpoints_api": {
      const filtro = args.filtro ? String(args.filtro).toLowerCase() : null;
      const lista = filtro
        ? ENDPOINTS_API.filter(e => e.rota.toLowerCase().includes(filtro) || e.desc.toLowerCase().includes(filtro))
        : ENDPOINTS_API;
      return {
        total: lista.length,
        base_url: "https://zena-l2jd.onrender.com",
        autenticacao: "Bearer JWT — header Authorization: Bearer <token>",
        endpoints: lista,
      };
    }

    default: throw new Error(`Ferramenta desconhecida: "${name}"`);
  }
}

// ─── MCP Server factory ───────────────────────────────────────────────────────

function createMcpServer() {
  const srv = new Server(
    { name: "clinne-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  srv.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  srv.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    const { name, arguments: args = {} } = params;
    try {
      const result = await runTool(name, args as Args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Erro: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  });
  return srv;
}

// ─── OAuth 2.0 (exigido pelos Conectores do Claude.ai) ───────────────────────

const authCodes = new Map<string, { expiresAt: number }>();

function setupOAuth(app: express.Application, apiKey: string) {
  // Discovery
  app.get("/.well-known/oauth-authorization-server", (_req, res: Response) => {
    res.json({
      issuer: HOST,
      authorization_endpoint:  `${HOST}/oauth/authorize`,
      token_endpoint:          `${HOST}/oauth/token`,
      registration_endpoint:   `${HOST}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported:    ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
    });
  });

  // RFC 7591 — Registro dinâmico de cliente
  app.post("/oauth/register", (_req, res: Response) => {
    res.status(201).json({
      client_id: "clinne-mcp-client",
      client_id_issued_at: Math.floor(Date.now() / 1000),
      grant_types: ["authorization_code"],
      response_types: ["code"],
    });
  });

  // Authorize — auto-aprova (ferramenta pessoal, 1 usuário)
  app.get("/oauth/authorize", (req: Request, res: Response) => {
    const { redirect_uri, state } = req.query as Record<string, string>;
    if (!redirect_uri) { res.status(400).send("redirect_uri obrigatório"); return; }
    const code = crypto.randomBytes(16).toString("hex");
    authCodes.set(code, { expiresAt: Date.now() + 5 * 60_000 });
    const url = new URL(redirect_uri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  // Token
  app.post("/oauth/token", (req: Request, res: Response) => {
    const body = req.body as Record<string, string>;
    const code = body.code;
    const stored = authCodes.get(code ?? "");
    if (!stored || stored.expiresAt < Date.now()) {
      res.status(400).json({ error: "invalid_grant" }); return;
    }
    authCodes.delete(code);
    res.json({ access_token: apiKey, token_type: "Bearer", expires_in: 7 * 86400 });
  });
}

// ─── HTTP mode (Render) ───────────────────────────────────────────────────────

async function startHttp(port: number) {
  const app = express();

  // CORS
  app.use((_req: Request, res: Response, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version");
    if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const apiKey = process.env.MCP_API_KEY ?? crypto.randomBytes(32).toString("hex");
  setupOAuth(app, apiKey);

  const PUBLIC = ["/health", "/.well-known/", "/oauth/"];

  // Auth middleware
  app.use((req: Request, res: Response, next) => {
    if (PUBLIC.some(p => req.path.startsWith(p))) return next();
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${apiKey}`) {
      res.status(401).json({ error: "Não autorizado" }); return;
    }
    next();
  });

  app.get("/health", (_req, res: Response) => {
    res.json({ ok: true, service: "clinne-mcp", autenticado: !!jwtToken });
  });

  // StreamableHTTP — protocolo MCP moderno (2025-03-26)
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.all("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        await sessions.get(sessionId)!.handleRequest(req, res, req.body);
        return;
      }

      // Nova sessão
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, transport);
          console.error(`[clinne-mcp] Sessão criada: ${id}`);
        },
      });

      transport.onclose = () => {
        const id = transport.sessionId;
        if (id) { sessions.delete(id); console.error(`[clinne-mcp] Sessão encerrada: ${id}`); }
      };

      const srv = createMcpServer();
      await srv.connect(transport);
      await transport.handleRequest(req, res, req.body);

    } catch (err) {
      console.error("[clinne-mcp] Erro /mcp:", err);
      if (!res.headersSent) res.status(500).json({ error: "Erro interno" });
    }
  });

  // Encerra sessão
  app.delete("/mcp", async (req: Request, res: Response) => {
    const id = req.headers["mcp-session-id"] as string | undefined;
    if (id && sessions.has(id)) { await sessions.get(id)!.close(); sessions.delete(id); }
    res.json({ ok: true });
  });

  app.listen(port, () => {
    console.error(`[clinne-mcp] HTTP rodando na porta ${port} | ${HOST}/mcp`);
  });
}

// ─── Stdio mode (Claude Desktop) ─────────────────────────────────────────────

async function startStdio() {
  const srv = createMcpServer();
  await srv.connect(new StdioServerTransport());
  console.error("[clinne-mcp] MCP ativo (stdio).");
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function main() {
  // Login é lazy — feito na primeira chamada de ferramenta.
  // Isso evita crash quando o backend (Render free) ainda está acordando.
  console.error("[clinne-mcp] Iniciando. Autenticação será feita na primeira chamada.");
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  if (port) await startHttp(port);
  else      await startStdio();
}

main().catch((err: unknown) => {
  console.error("[clinne-mcp] Falha:", err instanceof Error ? err.message : err);
  setTimeout(() => process.exit(1), 100);
});

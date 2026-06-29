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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!jwtToken) await login();
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
    await login(); reauthenticating = false;
    return apiFetch<T>(path, init);
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

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
        await sessions.get(sessionId)!.handleRequest(req, res);
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
  if (!jwtToken) { await login(); console.error("[clinne-mcp] Autenticado."); }
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  if (port) await startHttp(port);
  else      await startStdio();
}

main().catch((err: unknown) => {
  console.error("[clinne-mcp] Falha:", err instanceof Error ? err.message : err);
  setTimeout(() => process.exit(1), 100);
});

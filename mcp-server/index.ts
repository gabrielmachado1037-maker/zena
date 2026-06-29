#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import express, { type Request, type Response } from "express";

// ─── Configuração ──────────────────────────────────────────────────────────────

const BASE =
  (process.env.CLINNE_API_URL ?? "https://zena-l2jd.onrender.com").replace(/\/$/, "") +
  "/api";

let jwtToken: string | null = process.env.CLINNE_TOKEN ?? null;

// ─── Autenticação contra o backend Clinne ─────────────────────────────────────

async function login(): Promise<void> {
  const email = process.env.CLINNE_EMAIL;
  const senha = process.env.CLINNE_PASSWORD;
  if (!email || !senha) {
    throw new Error(
      "Defina CLINNE_TOKEN ou CLINNE_EMAIL + CLINNE_PASSWORD nas variáveis de ambiente."
    );
  }

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login falhou (${res.status}): ${text}`);
  }

  const body = (await res.json()) as { token: string };
  jwtToken = body.token;
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
    reauthenticating = true;
    jwtToken = null;
    await login();
    reauthenticating = false;
    return apiFetch<T>(path, init);
  }

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

// ─── Ferramentas ──────────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: "listar_pacientes",
    description:
      "Lista todos os pacientes da nutricionista autenticada. " +
      "Retorna nome, status, última medição, próxima consulta e situação de cobrança.",
    inputSchema: {
      type: "object",
      properties: {
        busca:  { type: "string", description: "Busca por nome ou parte do nome." },
        status: { type: "string", description: "'ativo', 'inativo' ou 'todos' (padrão: todos).", enum: ["todos", "ativo", "inativo"] },
        limit:  { type: "number", description: "Máximo de resultados (padrão 50)." },
      },
    },
  },
  {
    name: "ver_paciente",
    description:
      "Dados completos de um paciente: medições, consultas, planos alimentares, " +
      "check-ins de hábitos, cobranças e anamnese. Aceita ID ou nome para busca.",
    inputSchema: {
      type: "object",
      properties: {
        pacienteId: { type: "string", description: "UUID do paciente." },
        nome:       { type: "string", description: "Nome do paciente (busca automática se não souber o ID)." },
      },
    },
  },
  {
    name: "ver_ranking",
    description:
      "Ranking de pacientes por pontuação: progresso de peso, hábitos consecutivos e metas semanais.",
    inputSchema: {
      type: "object",
      properties: {
        periodo: { type: "string", description: "'semanal' ou 'mensal' (padrão: semanal).", enum: ["semanal", "mensal"] },
        semana:  { type: "number", description: "Semana ISO 1–53 (padrão: atual)." },
        mes:     { type: "number", description: "Mês 1–12 (padrão: atual)." },
        ano:     { type: "number", description: "Ano (padrão: atual)." },
      },
    },
  },
  {
    name: "ver_financeiro",
    description:
      "Dashboard financeiro: faturamento do mês, comparativo com mês anterior, cobranças pendentes e vencidas.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ver_agenda",
    description:
      "Consultas agendadas no período e horários disponíveis configurados. Padrão: próximos 30 dias.",
    inputSchema: {
      type: "object",
      properties: {
        inicio: { type: "string", description: "Data início YYYY-MM-DD (padrão: hoje)." },
        fim:    { type: "string", description: "Data fim YYYY-MM-DD (padrão: +30 dias)." },
      },
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

type Args = Record<string, unknown>;

async function runTool(name: string, args: Args): Promise<unknown> {
  switch (name) {

    case "listar_pacientes": {
      const busca  = args.busca  ? `&busca=${encodeURIComponent(String(args.busca))}` : "";
      const status = args.status ? `&status=${String(args.status)}` : "";
      const limit  = `&limit=${Math.min(50, Number(args.limit ?? 50))}`;
      return apiFetch<unknown>(`/pacientes?page=1${limit}${busca}${status}`);
    }

    case "ver_paciente": {
      let id = args.pacienteId as string | undefined;
      const nomeBusca = args.nome as string | undefined;

      if (!id && nomeBusca) {
        const lista = await apiFetch<{ data: Array<{ id: string; nome: string }> }>(
          `/pacientes?busca=${encodeURIComponent(nomeBusca)}&limit=5`
        );
        const found = lista.data ?? [];
        if (found.length === 0) return { erro: `Nenhum paciente encontrado com o nome "${nomeBusca}".` };
        if (found.length > 1) return {
          aviso: `${found.length} pacientes encontrados. Especifique o pacienteId.`,
          pacientes: found.map(p => ({ id: p.id, nome: p.nome })),
        };
        id = found[0].id;
      }

      if (!id) return { erro: "Informe pacienteId ou o nome do paciente." };
      return apiFetch<unknown>(`/pacientes/${id}`);
    }

    case "ver_ranking": {
      const periodo = String(args.periodo ?? "semanal");
      const qs = new URLSearchParams({ periodo });
      if (args.ano)    qs.set("ano",    String(args.ano));
      if (args.semana) qs.set("semana", String(args.semana));
      if (args.mes)    qs.set("mes",    String(args.mes));
      return apiFetch<unknown>(`/ranking?${qs.toString()}`);
    }

    case "ver_financeiro":
      return apiFetch<unknown>("/financeiro/dashboard");

    case "ver_agenda": {
      const hoje = new Date();
      const em30 = new Date(hoje);
      em30.setDate(hoje.getDate() + 30);
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      const inicio = String(args.inicio ?? fmt(hoje));
      const fim    = String(args.fim    ?? fmt(em30));
      const [consultas, horarios] = await Promise.all([
        apiFetch<unknown>(`/consultas?inicio=${inicio}&fim=${fim}`),
        apiFetch<unknown>("/horarios"),
      ]);
      return { consultas, horarios_disponiveis: horarios };
    }

    default:
      throw new Error(`Ferramenta desconhecida: "${name}"`);
  }
}

// ─── Servidor MCP ─────────────────────────────────────────────────────────────

function createServer() {
  const srv = new Server(
    { name: "clinne-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  srv.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  srv.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      const result = await runTool(name, args as Args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Erro ao executar "${name}": ${message}` }],
        isError: true,
      };
    }
  });

  return srv;
}

// ─── Modo HTTP/SSE — Render / Claude.ai Connectors ───────────────────────────

async function startHttp(port: number) {
  const app = express();
  app.use(express.json());

  // Chave de acesso opcional: protege o MCP de uso não autorizado
  const apiKey = process.env.MCP_API_KEY;

  app.use((req: Request, res: Response, next) => {
    if (req.path === "/health") return next();
    if (apiKey) {
      const auth = req.headers.authorization ?? "";
      if (auth !== `Bearer ${apiKey}`) {
        res.status(401).json({ error: "MCP_API_KEY inválida" });
        return;
      }
    }
    next();
  });

  // Health check — Render usa isso para saber se o serviço está vivo
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "clinne-mcp", autenticado: !!jwtToken });
  });

  // Cada cliente SSE recebe sua própria instância do Server
  const transports: Record<string, SSEServerTransport> = {};

  app.get("/sse", async (req: Request, res: Response) => {
    const transport = new SSEServerTransport("/messages", res);
    const srv = createServer();
    transports[transport.sessionId] = transport;
    res.on("close", () => { delete transports[transport.sessionId]; });
    await srv.connect(transport);
    console.error(`[clinne-mcp] Nova conexão SSE: ${transport.sessionId}`);
  });

  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query["sessionId"] as string;
    const transport = transports[sessionId];
    if (!transport) {
      res.status(404).json({ error: "Sessão SSE não encontrada" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(port, () => {
    console.error(`[clinne-mcp] HTTP/SSE rodando na porta ${port}`);
    console.error(`[clinne-mcp] SSE endpoint: http://localhost:${port}/sse`);
  });
}

// ─── Modo stdio — Claude Desktop local ───────────────────────────────────────

async function startStdio() {
  const srv = createServer();
  const transport = new StdioServerTransport();
  await srv.connect(transport);
  console.error("[clinne-mcp] Servidor MCP ativo (stdio).");
}

// ─── Inicialização ─────────────────────────────────────────────────────────────

async function main() {
  if (!jwtToken) {
    await login();
    console.error("[clinne-mcp] Autenticado com sucesso.");
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;

  if (port) {
    await startHttp(port);
  } else {
    await startStdio();
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[clinne-mcp] Falha na inicialização:", msg);
  setTimeout(() => process.exit(1), 100);
});

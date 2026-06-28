#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

// ─── Configuração ──────────────────────────────────────────────────────────────

const BASE =
  (process.env.CLINNE_API_URL ?? "https://zena-l2jd.onrender.com").replace(/\/$/, "") +
  "/api";

let jwtToken: string | null = process.env.CLINNE_TOKEN ?? null;

// ─── Autenticação ──────────────────────────────────────────────────────────────

async function login(): Promise<void> {
  const email = process.env.CLINNE_EMAIL;
  const senha = process.env.CLINNE_PASSWORD;
  if (!email || !senha) {
    throw new Error(
      "Credenciais não configuradas. Defina CLINNE_TOKEN " +
      "ou CLINNE_EMAIL + CLINNE_PASSWORD nas variáveis de ambiente."
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

// Wrapper com re-autenticação automática em 401
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

// ─── Definição das ferramentas ─────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: "listar_pacientes",
    description:
      "Lista todos os pacientes da nutricionista autenticada. " +
      "Retorna nome, status, última medição, próxima consulta e situação de cobrança.",
    inputSchema: {
      type: "object",
      properties: {
        busca: {
          type: "string",
          description: "Busca por nome ou parte do nome do paciente.",
        },
        status: {
          type: "string",
          description: "Filtrar por 'ativo', 'inativo' ou 'todos' (padrão: todos).",
          enum: ["todos", "ativo", "inativo"],
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados (padrão: 50, máximo: 50).",
        },
      },
    },
  },
  {
    name: "ver_paciente",
    description:
      "Retorna dados completos de um paciente: informações cadastrais, histórico de medições " +
      "(peso, gordura, músculo), consultas, planos alimentares, check-ins de hábitos, " +
      "cobranças e anamnese. Aceita ID do paciente ou nome para busca.",
    inputSchema: {
      type: "object",
      properties: {
        pacienteId: {
          type: "string",
          description: "UUID do paciente (obtenha via listar_pacientes).",
        },
        nome: {
          type: "string",
          description: "Nome do paciente para busca automática (se não souber o ID).",
        },
      },
    },
  },
  {
    name: "ver_ranking",
    description:
      "Retorna o ranking de pacientes com pontuação calculada por: " +
      "progresso do objetivo de peso, hábitos consecutivos e metas semanais batidas. " +
      "Suporta filtro por período semanal ou mensal.",
    inputSchema: {
      type: "object",
      properties: {
        periodo: {
          type: "string",
          description: "Período de análise: 'semanal' ou 'mensal' (padrão: semanal).",
          enum: ["semanal", "mensal"],
        },
        semana: {
          type: "number",
          description: "Número da semana ISO 1–53 (padrão: semana atual). Usado com período semanal.",
        },
        mes: {
          type: "number",
          description: "Mês 1–12 (padrão: mês atual). Usado com período mensal.",
        },
        ano: {
          type: "number",
          description: "Ano (padrão: ano atual).",
        },
      },
    },
  },
  {
    name: "ver_financeiro",
    description:
      "Retorna o dashboard financeiro: faturamento do mês atual, comparativo com mês anterior, " +
      "cobranças pendentes e vencidas, lista de pacientes com inadimplência.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "ver_agenda",
    description:
      "Retorna as consultas agendadas no período solicitado e os horários disponíveis " +
      "configurados pela nutricionista. Padrão: próximos 30 dias.",
    inputSchema: {
      type: "object",
      properties: {
        inicio: {
          type: "string",
          description: "Data de início no formato YYYY-MM-DD (padrão: hoje).",
        },
        fim: {
          type: "string",
          description: "Data de fim no formato YYYY-MM-DD (padrão: 30 dias a partir de hoje).",
        },
      },
    },
  },
];

// ─── Handlers das ferramentas ──────────────────────────────────────────────────

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

      // Busca pelo nome se o ID não foi fornecido
      if (!id && nomeBusca) {
        const lista = await apiFetch<{ data: Array<{ id: string; nome: string }> }>(
          `/pacientes?busca=${encodeURIComponent(nomeBusca)}&limit=5`
        );
        const found = lista.data ?? [];

        if (found.length === 0) {
          return { erro: `Nenhum paciente encontrado com o nome "${nomeBusca}".` };
        }
        if (found.length > 1) {
          return {
            aviso: `${found.length} pacientes encontrados para "${nomeBusca}". Especifique o pacienteId.`,
            pacientes: found.map(p => ({ id: p.id, nome: p.nome })),
          };
        }
        id = found[0].id;
      }

      if (!id) {
        return { erro: "Informe pacienteId ou o nome do paciente." };
      }

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

    case "ver_financeiro": {
      return apiFetch<unknown>("/financeiro/dashboard");
    }

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

const server = new Server(
  { name: "clinne-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    const result = await runTool(name, args as Args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Erro ao executar "${name}": ${message}` }],
      isError: true,
    };
  }
});

// ─── Inicialização ─────────────────────────────────────────────────────────────

async function main() {
  // Valida credenciais na inicialização para falhar cedo
  if (!jwtToken) {
    await login();
    console.error("[clinne-mcp] Autenticado com sucesso.");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[clinne-mcp] Servidor MCP ativo (stdio).");
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[clinne-mcp] Falha na inicialização:", msg);
  process.exit(1);
});

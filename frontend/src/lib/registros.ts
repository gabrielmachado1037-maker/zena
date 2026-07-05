// Tela "Registros Diários" (Nexvel) — tipos + dados 100% mockados (fiéis ao code.html).

export type TipoRegistro = "excecao" | "treino" | "refeicao" | "furtada";
export type Liga = "gold" | "master" | "silver";

// Definição dos filtros do feed (cada um casa com um `tipo`).
export interface FiltroDef {
  id: string;
  tipo: TipoRegistro;
  icon: string;
  cor: string; // classe de cor do ícone
  label: string;
}

export const FILTROS: FiltroDef[] = [
  { id: "excecoes", tipo: "excecao", icon: "priority_high", cor: "text-nx-secondary", label: "Apenas Exceções" },
  { id: "furtadas", tipo: "furtada", icon: "no_meals", cor: "text-nx-error", label: "Refeições Furtadas" },
  { id: "treinos", tipo: "treino", icon: "fitness_center", cor: "text-nx-tertiary", label: "Treinos Realizados" },
];

export interface Registro {
  id: string;
  paciente: string;
  liga: Liga; // moldura + badge
  ligaLabel: string; // "OURO" | "MESTRE" | "PRATA"
  avatar: string;
  horario: string; // "14:20"
  tipoTexto: string; // "Almoço (Exceção)"
  tipo: TipoRegistro; // define borda/chip/botões
  texto?: string; // citação (opcional)
  imagem?: string; // foto da refeição (opcional)
}

export interface AlertaRadar {
  id: string;
  nome: string;
  motivo: string;
  cor: "error" | "secondary";
  glow: boolean; // active-glow (pulso)
}

const IMG_PIZZA =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCDUiZuFrH-7WlqcyS14HynMQEi7MZfNN4u-LDh5GDW0qmECETO9ffHH18XJ5QfDYD2ZqbjuF0TMu6zGVFkMCPFFisetr00SS4ovAbmlGm33xxt0iQ4zBYK3vUJV50I2edqmyIJxyxJMo-BjCwrffkyWwXcDnPZO98GY5eImSrpn6z1A9i45Q0m8mlNzmr-hap3jGhNY3J-C3_ccNJr0wOtWFJDSJF7zJvMU0ADmZmuzu4m1ovndc_AbQ";
const IMG_BOWL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAb33jxbWHcpFeSU9qr6Gq25bt0toL0QmA1n8MTWThoB-FIjtl-Fp71afRQfxAmfsFpKJB2VMZbv2zYGhyXaBSWMOdEwfpOKD-teBCezirRu7otiqOw2Z3EgFDd0f7pIcofyVO8Jm4YAxn8ZrTfVDf0XRU4sFKDjohdmVwsWWtArclB8BUI2_afFQYDoArmPgXwdm-Il_kJjd0dnhDmeCeQ-GavC5qOrUNyO6Ntt5msg9eOA-Y4c_JrwQ";
const AV_THIAGO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDa4op-6GwcZUxa1ktXK7r0rnNpTDGl6q10VdXYhmiMtG8E0nnQq0VgiwnL2oxG9BjOY5nHxXy_lJDGEysR8NyYNy_hjRZLR-0kNHlXbuPmsO7mKxNqxg3dekD_M8Q1UE3XHgZIw7PBDQibg9TZfz_LUgofiWfs-rKO5Mb1eLqg640LQjABHN69r0Y5j9FBPAJIHtCx7UBhx9Uq2PIy8G5Y2WwoNX8UJUTa9am-d-uOJLUz5K62A90a5Q";
const AV_JULIANA =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA0gnThajqrcjDfbZzcS7T2ftqpks0P5XUHkp9wIQI2D96lk_Ena-jAfi2ipAmrOBorn6Y3KKIkBI9ua4RqZ0paePEgXP5GWYOsrdgik2vLYTxqNZs40Daf4H6UcKkdzRmpZjG68Djc8nbEBqnNHiHK3tne1eW5UBfEU4jc6U_0u4vrZk-oGbeaBI9ep-AmkawuiNMIiX1wgHx2bN-bOUaKKrBEpMSy1_B_VDJb5rvMIM5RLF-ejREthQ";
const AV_CARLOS =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBCSUfXlOZ8gEmj2-cb5OGJwpPHHZR3RKTGinkrn_czLuLZ9SMYULAx-isTVu3GhXLH1bQWmYFU7Jmmq87D-hVSXjfJk0nlOt3Fz0-AjFKDOtEaSDCujDG-54E46Ho8BbcWpYBs7-JSvojbyaOj5qpFIptTkJd7WQRRfYuee9_-XzeObTHsWY6ds7r7_U_BoBe7LAzs0fSgm1Y0CIAZhJoEwAS58EES5o3PhltZkCbVt0IFoUJG4-AM_A";

export const REGISTROS: Registro[] = [
  {
    id: "r1",
    paciente: "Thiago Mendonça",
    liga: "gold",
    ligaLabel: "OURO",
    avatar: AV_THIAGO,
    horario: "14:20",
    tipoTexto: "Almoço (Exceção)",
    tipo: "excecao",
    texto:
      '"Hoje não resisti ao aniversário na firma. Comi dois pedaços de pizza, mas mantive o foco na água e bati a meta de proteína no café da manhã."',
    imagem: IMG_PIZZA,
  },
  {
    id: "r4",
    paciente: "Marcos J.",
    liga: "silver",
    ligaLabel: "PRATA",
    avatar: AV_THIAGO,
    horario: "13:00",
    tipoTexto: "Almoço (Furtado)",
    tipo: "furtada",
    texto:
      "Acabei pulando o almoço hoje — corrida no trabalho e não consegui parar pra comer. Prometo compensar no jantar.",
  },
  {
    id: "r2",
    paciente: "Juliana Ferreira",
    liga: "master",
    ligaLabel: "MESTRE",
    avatar: AV_JULIANA,
    horario: "10:05",
    tipoTexto: "Treino A (Concluído)",
    tipo: "treino",
    texto:
      "Check-in feito! Treino de perna finalizado com 110% de intensidade. Senti um pouco de fadiga no final, mas completei todas as séries.",
  },
  {
    id: "r3",
    paciente: "Carlos Alberto",
    liga: "silver",
    ligaLabel: "PRATA",
    avatar: AV_CARLOS,
    horario: "08:30",
    tipoTexto: "Café da Manhã",
    tipo: "refeicao",
    imagem: IMG_BOWL,
  },
];

export const ALERTAS_RADAR: AlertaRadar[] = [
  { id: "a1", nome: "Marcos J.", motivo: "3 refeições furtadas hoje", cor: "error", glow: true },
  { id: "a2", nome: "Beatriz W.", motivo: "Sem registro há 48h", cor: "secondary", glow: false },
];

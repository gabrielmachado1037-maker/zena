// Tabela definitiva de pontuação do Nexvel

export const PONTOS = {
  // Check-in diário (1x por dia)
  refeicoes_ok:      1,    // bateu meta de refeições
  agua_ok:           1,    // bateu meta de hidratação
  treino_ok:         1,    // fez atividade física
  bonus_tudo:        1,    // bônus por completar os 3

  // Honestidade
  registro_excecao:  0.5,  // relatou um furo honestamente

  // Comunidade (com limites diários)
  comentario:        0.5,  // máx 3 comentários/dia = 1.5pts
  curtida:           0.5,  // máx 5 curtidas/dia = 2.5pts

  // Marcos de streak (bônus único por ciclo)
  streak_7dias:      5,    // 7 dias seguidos sem quebrar
  streak_21dias:     10,   // 21 dias seguidos sem quebrar

  // Foto de evolução
  checkpoint_30dias: 5,    // foto mensal de evolução
} as const;

export const LIMITES_DIARIOS = {
  comentarios_pontuados: 3,
  curtidas_pontuadas:    5,
  checkins_por_dia:      1,
  registros_excecao:     1,
} as const;

// Máximo teórico/dia: 4 base + 0.5 exceção + 1.5 comentários + 2.5 curtidas = 8.5pts
// Ciclo 30 dias 100% (~120 base + streaks + social)

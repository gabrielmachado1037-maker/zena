-- Plano de missões: refeições configuradas pela nutri [{ key, label }] (3–6 refeições).
-- null = 4 refeições padrão (café/almoço/lanche/jantar). A alimentação sempre satura em 4 XP.
ALTER TABLE "Paciente" ADD COLUMN "planoRefeicoes" JSONB;

-- Estado por refeição para N refeições: { key: "seguiu" | "adaptou" | "comeu_mal" | "pulou" }.
-- Para o plano padrão de 4, as colunas cafeStatus…jantarStatus seguem espelhadas (retrocompat).
ALTER TABLE "Registro" ADD COLUMN "refeicoesStatus" JSONB;

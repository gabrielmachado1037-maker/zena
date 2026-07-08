# Processo Oficial de Desenvolvimento — Nexvel

> Este processo é **obrigatório** para todo novo desenvolvimento no Nexvel.
> Nenhuma implementação começa sem passar por ele. Objetivo: proteger o que já
> funciona, evitar retrabalho e manter tudo consistente e documentado.

---

## 1. Fluxo obrigatório (12 passos)

Todo novo desenvolvimento **deve** seguir esta ordem:

1. **Ler a documentação** correspondente em `/docs`.
2. **Analisar** como essa funcionalidade funciona **atualmente no código**.
3. **Explicar resumidamente** o que foi encontrado.
4. **Informar exatamente quais arquivos** serão alterados.
5. **Informar se será necessária alguma migração** (banco de dados).
6. **Informar se existe risco** de quebrar funcionalidades existentes.
7. **Apresentar o plano** de implementação.
8. **Aguardar aprovação** do responsável.
9. **Somente após aprovação, implementar.**
10. **Informar todos os arquivos alterados.**
11. **Informar quais testes** devem ser executados.
12. **Encerrar a implementação** e aguardar o próximo módulo.

> Regra de parada: **um módulo por vez.** Concluiu → para e espera a próxima solicitação.

---

## 2. Checklist de Compatibilidade (antes de qualquer implementação)

Executar e responder **todos** os itens antes de escrever código:

- [ ] Esta alteração reutiliza a estrutura existente?
- [ ] Existe alguma regra duplicada?
- [ ] Esta alteração pode quebrar alguma funcionalidade existente?
- [ ] Os componentes atuais podem ser reaproveitados?
- [ ] Existe impacto no banco de dados?
- [ ] Existe impacto nas rotas?
- [ ] Existe impacto na autenticação?
- [ ] Existe impacto no Dashboard do Nutricionista?
- [ ] Existe impacto no Dashboard do Paciente?
- [ ] Existe impacto no sistema de XP?
- [ ] Existe impacto no sistema de Ligas?
- [ ] Existe impacto nos Desafios?
- [ ] Existe impacto na IA?
- [ ] Existe impacto nos Relatórios?
- [ ] Será necessário criar novas tabelas?
- [ ] Será necessário criar novas APIs?
- [ ] Será necessário criar novas migrations?
- [ ] Será necessário atualizar testes?
- [ ] Será necessário atualizar documentação?

---

## 3. Regras gerais para todas as futuras implementações

- **Reutilizar sempre** o código existente antes de criar novos componentes.
- **Nunca duplicar** regras de negócio.
- **Nunca alterar** funcionalidades que já estejam funcionando sem necessidade.
- **Sempre preservar** compatibilidade com todo o sistema.
- **Sempre manter** a interface consistente.
- **Sempre documentar** alterações importantes (atualizar o doc do módulo em `/docs`).
- **Sempre parar** após concluir um módulo e aguardar a próxima solicitação.

---

## 4. Contexto do repositório (referência rápida)

<!-- Fatos estruturais, não regras de negócio. Ajustar se o repo mudar. -->

- **Monorepo:** `frontend/` (Vite + React + TypeScript + Tailwind, PWA) e `backend/` (Express + Prisma).
- **Banco:** Postgres (Neon) — **produção compartilhada**; migrations devem ser **aditivas**.
- **Deploy:** frontend na Vercel, backend no Render; auto-deploy no push para `main`.
- **Padrão de doc:** ver [`_MODELO.md`](./_MODELO.md).

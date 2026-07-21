# Registro de Operações de Tratamento — Nexvel

> **Art. 37 da LGPD** — o controlador e o operador devem manter registro das operações
> de tratamento que realizarem, especialmente quando baseado no legítimo interesse.
>
> **Status deste documento:** os fatos técnicos (que dado existe, onde fica, quem
> recebe, como é protegido) foram levantados do código e da infraestrutura reais em
> **20/07/2026** e estão marcados ✅ verificado. As definições **jurídicas** estão
> marcadas ⚠️ e **dependem de decisão do responsável e de revisão por advogado** —
> não foram preenchidas por suposição. Documento interno; não é peça pública.

---

## 1. Agentes de tratamento

| Campo | Valor |
|---|---|
| Controlador (dados do nutricionista) | **FTA Marketing LTDA** ✅ (definido 2026-07-21) — ⚠️ falta o **CNPJ** na política |
| Papel quanto aos dados das **pacientes** | **Operadora** — o nutricionista é o controlador ✅ (decidido pelo titular do negócio em 2026-07-21; já era o que os Termos §7 diziam) — ver §7 |
| Papel nas funcionalidades próprias | **Controladora** (gamificação, notificações de engajamento, relatório por IA) — a finalidade é da plataforma, não do nutricionista |
| Encarregado (DPO) | **Gabriel Machado** ✅ (indicado 2026-07-21) — divulgado na Política §1 e §11 |
| Canal do titular | `contato@nexvel.tech` ✅ (caixa ativa, via ImprovMX) |

---

## 2. Categorias de titulares

1. **Nutricionistas** — clientes contratantes (14 contas em 20/07/2026).
2. **Pacientes** — pessoas atendidas pelos nutricionistas, com conta própria no app
   (11 contas de acesso) ou apenas cadastradas pelo nutricionista.

---

## 3. Categorias de dados tratados ✅ verificado no schema

### 3.1 Dados pessoais comuns
| Dado | Onde | Titular |
|---|---|---|
| Nome, e-mail, telefone | `Nutricionista`, `Paciente`, `PacienteUser` | ambos |
| CRN (registro profissional) | `Nutricionista` | nutricionista |
| Senha (hash bcrypt, custo 12) | `Nutricionista`, `PacienteUser` | ambos |
| Data de nascimento, sexo | `Paciente` | paciente |
| Endereço do consultório | `Nutricionista` | nutricionista |
| IP e logs de acesso | rate limiters, Sentry | ambos |

### 3.2 🔴 Dados pessoais SENSÍVEIS — saúde (Art. 5º, II)
> Esta é a categoria de maior risco do produto e a que determina o regime jurídico
> aplicável. **Dado de saúde não é regido pelo Art. 7º, e sim pelo Art. 11.**

| Dado | Modelo |
|---|---|
| Anamnese / histórico de saúde | `Anamnese` |
| Peso, medidas corporais, % gordura, massa muscular | `Medicao` |
| Fotos de evolução corporal | `FotoEvolucao`, `RegistroFotos` |
| Planos alimentares prescritos | `PlanoAlimentar` |
| Registros diários de alimentação, sono, água, treino | `Registro`, `ChecklistDiario`, `CheckIn` |
| Humor auto-relatado | `Registro` |
| Consultas e evolução clínica | `Consulta` |

### 3.3 Dados financeiros
`Cobranca`, `PlanoCobranca`, `PlanoSaas` — identificadores de assinatura
(Stripe/Asaas). **Não há número de cartão armazenado** ✅ verificado.

### 3.4 Dados de engajamento / comportamento
`PontosLog`, `RankingPontuacao`, `Conquista`, `Desafio`, `StreakMarco`,
`RegistroEvento`, `NotificacaoLog`, `FeedPost`, `MensagemChat`.

---

## 4. Finalidades

1. Prestação do serviço de acompanhamento nutricional (núcleo contratado).
2. Autenticação e segurança das contas.
3. Geração de relatórios clínicos para o nutricionista.
4. Gamificação e engajamento do paciente (ligas, ranking, desafios, lembretes).
5. Cobrança e gestão de assinatura.
6. Monitoramento de erros e disponibilidade.

---

## 5. Bases legais

⚠️ **PENDENTE DE REVISÃO JURÍDICA.** A política pública hoje cita apenas o
**Art. 7º** (execução de contrato, consentimento, legítimo interesse). Isso é
insuficiente e, num ponto, incorreto:

- **Legítimo interesse não existe no Art. 11** e portanto **não é base válida para
  dado de saúde**. Se hoje algum tratamento de dado sensível se apoia nele, está sem
  base legal.
- Para dado de saúde as hipóteses típicas são **Art. 11, I** (consentimento
  específico e destacado, para finalidades específicas) e **Art. 11, II, "f"**
  (tutela da saúde, em procedimento realizado por profissionais de saúde).
- A escolha entre elas **muda o produto**: se for consentimento, ele precisa ser
  específico, destacado e revogável; se for tutela da saúde, precisa estar claro que
  o tratamento ocorre sob responsabilidade do profissional.

**Contradição interna já identificada:** a política classifica as comunicações de
engajamento como *consentimento*, mas a implementação as entrega por padrão
(`ContaPaciente.tsx:310` — ausência de preferência = ligado). Consentimento sob a
LGPD exige manifestação **afirmativa** (Art. 5º, XII); opt-out não satisfaz. É
preciso escolher: ou reclassificar como execução de contrato (e o padrão ligado
passa a ser coerente), ou inverter o padrão para desligado.

---

## 6. Compartilhamento e transferência internacional ✅ verificado

| Operador | Finalidade | Local | Transferência internacional |
|---|---|---|---|
| **Neon** (banco) | Armazenamento de todos os dados, inclusive saúde | `sa-east-1` = **São Paulo, Brasil** ✅ | **Não** |
| **Sentry** | Monitoramento de erros | `ingest.**us**.sentry.io` = **EUA** ✅ | **Sim** — Art. 33 |
| **Render** | Backend | ⚠️ região definida no painel, **não verificada** | a confirmar |
| **Vercel** | Frontend | ⚠️ **não verificada** | a confirmar |
| **Stripe** | Pagamento | EUA/Irlanda | Sim |
| **Asaas** | Pagamento Pix | Brasil | Não |
| **Resend** | E-mail transacional | `sa-east-1` ✅ | Não |
| **Anthropic** | Geração do texto do relatório clínico | EUA | **Sim** |
| **Supabase** | Armazenamento de fotos (bucket privado) | ⚠️ **não verificada** | a confirmar |

> ✅ **CORRIGIDO na política pública em 20/07/2026.** Ela afirmava "servidores no
> Brasil ou com adequação LGPD" — impreciso — e omitia três operadores. Agora
> declara Neon, Supabase, Render, Vercel, Stripe, Asaas, Resend, Sentry e Anthropic,
> com seção própria de transferência internacional. **Supabase (fotos de corpo),
> Asaas e Anthropic não estavam declarados.**
>
> ⚠️ **Ainda em aberto:** a política declara o FATO da transferência internacional,
> mas **não indica a hipótese do Art. 33** que a autoriza (cláusulas contratuais
> padrão, adequação, consentimento específico…). Escolher a hipótese é decisão
> jurídica, não foi preenchida.
>
> ⚠️ **Regiões de Render, Vercel e Supabase seguem não verificadas.** Cabeçalhos
> `CF-RAY: …-GRU` e `x-vercel-id: gru1` mostram o **edge da CDN**, não a região de
> origem — não servem como prova. Confirmar nos respectivos painéis.

---

## 7. ⚠️ DECISÃO CRÍTICA: controlador ou operador?

Para os dados das **pacientes**, quem decide as finalidades do tratamento?

- Se o **nutricionista** decide (ele coleta, ele trata, ele é o profissional de
  saúde): o nutricionista é **controlador** e a Nexvel é **operadora**. Nesse caso é
  necessário um **contrato de operador** (cláusulas de tratamento) com cada
  nutricionista, e a política deve dizer isso com clareza.
- Se a **Nexvel** decide (gamificação, ranking, notificações e relatórios com IA são
  finalidades definidas pela plataforma, não pelo nutricionista): a Nexvel é
  **controladora** ou **co-controladora**, e responde diretamente perante o titular.

### ✅ DECIDIDO em 2026-07-21 (titular do negócio) — modelo MISTO

O nutricionista é **controlador** dos dados das pacientes; a Nexvel é **operadora**
desses dados. Nas funcionalidades que a própria plataforma criou (gamificação,
notificações de engajamento, relatório redigido por IA) a finalidade é definida pela
Nexvel, então **nela a Nexvel é controladora** — declarar-se "apenas operadora"
seria impreciso.

**O que já estava certo:** os **Termos de Uso §7** já diziam exatamente isso
("A Nexvel atua como operadora dos dados (art. 39), sendo o nutricionista o
controlador") — e são aceitos no cadastro, obrigatoriamente, desde 2026-07-12. Ou
seja, **a cláusula contratual de operador já existe e já é aceita**; o problema real
era a **Política de Privacidade contradizer os Termos**, tratando a Nexvel como
controladora única. Dois documentos públicos em contradição são piores que qualquer
um deles isolado.

**Corrigido em 2026-07-21:** Política ganhou a seção **1.1 "Quem responde por quais
dados"** com a divisão acima, e o §11 passou a dirigir o titular ao Encarregado,
avisando que pedido sobre dado clínico vai primeiro ao nutricionista.

**⚠️ AINDA PARA O ADVOGADO:** (a) se as cláusulas do §7 dos Termos bastam como
"contrato de operador" do art. 39 ou se é preciso instrumento próprio com cláusulas
de segurança/subcontratação/incidente; (b) se o modelo misto se sustenta ou se a
gamificação sobre dado de saúde puxa a Nexvel para **co-controladora** do prontuário
inteiro; (c) art. 42 — o operador responde solidariamente em certas hipóteses, então
declarar-se operador **não é blindagem automática**.

---

## 8. ⚠️ Encarregado (DPO) — Art. 41

A LGPD exige que o controlador indique um Encarregado e **divulgue publicamente sua
identidade e informação de contato** (Art. 41, §1º).

**Nuance que precisa de confirmação do advogado:** a Resolução CD/ANPD nº 2/2022
dispensa **agentes de tratamento de pequeno porte** de *indicar* Encarregado,
mantendo a obrigação de oferecer um canal de comunicação. **Porém**, o tratamento de
dados sensíveis em larga escala tende a caracterizar tratamento de **alto risco**, o
que pode afastar esse enquadramento. Esta é a pergunta exata a levar ao advogado:

> *"A Nexvel se enquadra como agente de tratamento de pequeno porte na Res.
> CD/ANPD nº 2/2022, considerando que trata dados de saúde de pacientes? Se sim, a
> dispensa de indicação de Encarregado se aplica, ou o tratamento de dado sensível
> caracteriza alto risco e afasta a dispensa?"*

### ✅ RESOLVIDO em 2026-07-21 — Encarregado indicado

**Gabriel Machado** foi indicado como Encarregado pelo titular do negócio, e a
identidade + contato (`contato@nexvel.tech`) estão **divulgados publicamente** na
Política de Privacidade §1 e §11, como exige o art. 41 §1º.

Indicar o Encarregado **satisfaz a exigência independentemente** da resposta sobre
pequeno porte: a Resolução dispensa a indicação, não a proíbe. A pergunta ao
advogado acima continua valendo para dimensionar as **demais** obrigações de agente
de alto risco (relatório de impacto, por exemplo), não mais para decidir se há ou
não Encarregado.

---

## 9. Retenção e eliminação ✅ verificado

- Dados mantidos enquanto a conta estiver ativa.
- **Exclusão pelo próprio app**, para os dois perfis: `DELETE /api/auth/conta`
  (nutricionista) e `DELETE /api/paciente-app/conta` (paciente).
- A exclusão do paciente **elimina de fato o dado de saúde** (não é só desativação) e
  anonimiza PII, via `lib/anonimizarPaciente.ts`, em transação atômica.
- Backup: dump diário para bucket privado, com verificação semanal de restauração.
  ⚠️ **O backup retém dado já excluído até ser sobrescrito pela rotação** — a
  política menciona isso genericamente; o prazo concreto de rotação deveria constar.

---

## 10. Medidas de segurança ✅ verificado

- Senhas com bcrypt custo 12, com re-hash transparente de hashes antigos no login.
- Resposta de login com tempo constante (impede enumeração de contas por latência).
- Rate limit por IP **e por conta** no login; limites em cadastro, recuperação de
  senha e rotas de token.
- JWT de acesso curto (30 min) + refresh revogável com rotação e detecção de reuso.
- Troca de senha revoga todas as sessões ativas.
- Fotos em bucket **privado**, servidas por URL assinada de 6h, com caminho não
  adivinhável.
- Chaves de terceiros criptografadas em repouso.
- `trust proxy` configurado (sem ele os limites viravam balde global).
- Isolamento por tenant verificado nos 33 routers autenticados.
- CI roda checagem de segurança com 14 travas de regressão a cada push.
- Monitoramento de erros com Sentry, sem envio de PII (`sendDefaultPii: false`).

---

## 11. Incidentes

⚠️ **Não existe procedimento formal documentado** de resposta a incidente de
segurança com dado pessoal (Art. 48 — comunicação à ANPD e ao titular em prazo
razoável). Existe detecção técnica (Sentry, alertas de backup), mas não há: quem
decide se comunica, em quanto tempo, por qual canal, nem modelo de comunicação.
**É uma lacuna real e de baixo custo para fechar.**

---

## Histórico

| Data | Alteração |
|---|---|
| 20/07/2026 | Criação. Fatos técnicos levantados do código; itens jurídicos deixados explicitamente em aberto. |

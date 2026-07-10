import { useState } from "react";
import {
  ButtonNx,
  CardNx,
  CardNxHeader,
  CardNxTitle,
  ChipNx,
  ProgressBarNx,
  StatTileNx,
  XpBarNx,
  LevelUpOverlay,
  LeagueEmblem,
  LeagueBadge,
} from "../components/ui-nx";
import type { LeagueKey } from "../components/ui-nx";

const LIGAS: LeagueKey[] = ["bronze", "silver", "gold", "diamond", "master", "legendary"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-label-md uppercase tracking-wide text-nx-outline">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignShowcase() {
  const [xp, setXp] = useState(320);
  const [levelUp, setLevelUp] = useState(false);

  return (
    <div className="min-h-screen bg-nx-bg text-nx-on-surface">
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-12">
        {/* Cabeçalho */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-display-lg font-extrabold text-nx-on-surface">Nexvel</span>
            <ChipNx tone="evo">DS v0.2 · verde = evolução</ChipNx>
          </div>
          <p className="text-body-md text-nx-on-surface-variant">
            Uma cor, uma função — verde=progresso, azul=água, laranja=sequência, ouro=conquista,
            vermelho=risco, roxo=marca.
          </p>
        </header>

        {/* Paleta funcional */}
        <Section title="Paleta funcional">
          <div className="flex flex-wrap gap-2">
            <ChipNx tone="evo">Evolução</ChipNx>
            <ChipNx tone="water">Água</ChipNx>
            <ChipNx tone="streak">Sequência</ChipNx>
            <ChipNx tone="gold">Conquista</ChipNx>
            <ChipNx tone="danger">Risco</ChipNx>
            <ChipNx tone="warn">Atenção</ChipNx>
            <ChipNx tone="brand">Marca</ChipNx>
            <ChipNx tone="neutral">Neutro</ChipNx>
          </div>
        </Section>

        {/* Botões */}
        <Section title="Botões">
          <div className="flex flex-wrap items-center gap-3">
            <ButtonNx variant="evo">Concluir missão</ButtonNx>
            <ButtonNx variant="surface">Secundário</ButtonNx>
            <ButtonNx variant="ghost">Ghost</ButtonNx>
            <ButtonNx variant="danger">Risco</ButtonNx>
            <ButtonNx variant="brand">Marca</ButtonNx>
            <ButtonNx variant="evo" size="sm">Pequeno</ButtonNx>
            <ButtonNx variant="evo" size="lg">Grande</ButtonNx>
          </div>
        </Section>

        {/* KPIs */}
        <Section title="Números (StatTile)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTileNx label="Nível" value={12} tone="evo" delta="+1 esta semana" />
            <StatTileNx label="Sequência" value={12} unit="dias" tone="streak" />
            <StatTileNx label="Água" value={2.4} unit="L" tone="water" />
            <StatTileNx label="Pontos" value={"1.8k"} tone="gold" />
          </div>
        </Section>

        {/* Progresso e XP */}
        <Section title="Progresso & XP">
          <CardNx className="space-y-5">
            <XpBarNx nivel={12} xpAtual={xp} xpProximo={500} />
            <div className="flex gap-2">
              <ButtonNx variant="surface" size="sm" onClick={() => setXp((v) => Math.min(500, v + 40))}>
                +40 XP
              </ButtonNx>
              <ButtonNx variant="ghost" size="sm" onClick={() => setXp(320)}>
                Resetar
              </ButtonNx>
            </div>
            <div className="space-y-3 pt-2">
              <ProgressBarNx value={78} tone="evo" />
              <ProgressBarNx value={60} tone="water" />
              <ProgressBarNx value={45} tone="streak" />
              <ProgressBarNx value={90} tone="gold" celebrate />
            </div>
          </CardNx>
        </Section>

        {/* Cards com acento */}
        <Section title="Cards">
          <div className="grid gap-3 sm:grid-cols-2">
            <CardNx accent="evo" glow>
              <CardNxHeader>
                <CardNxTitle>Missão do dia</CardNxTitle>
                <ChipNx tone="evo">+20 XP</ChipNx>
              </CardNxHeader>
              <p className="text-body-md text-nx-on-surface-variant">
                Registre suas refeições para manter a evolução.
              </p>
            </CardNx>
            <CardNx accent="streak">
              <CardNxHeader>
                <CardNxTitle>Sequência viva</CardNxTitle>
                <ChipNx tone="streak">12 dias</ChipNx>
              </CardNxHeader>
              <p className="text-body-md text-nx-on-surface-variant">
                Não deixe a chama apagar — falta 1 dia para o recorde.
              </p>
            </CardNx>
          </div>
        </Section>

        {/* Ligas */}
        <Section title="Ligas — brasões (identidade + escalada)">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {LIGAS.map((liga) => (
              <div key={liga} className="flex flex-col items-center gap-2">
                <LeagueEmblem liga={liga} size={84} />
                <LeagueBadge liga={liga} />
              </div>
            ))}
          </div>
        </Section>

        {/* Level-up */}
        <Section title="Momento de recompensa">
          <CardNx className="flex items-center justify-between">
            <div>
              <p className="text-headline-md text-nx-on-surface">Celebração de level-up</p>
              <p className="text-body-md text-nx-on-surface-variant">
                Nenhum clique termina em silêncio.
              </p>
            </div>
            <ButtonNx variant="evo" onClick={() => setLevelUp(true)}>
              Subir de nível
            </ButtonNx>
          </CardNx>
        </Section>
      </div>

      <LevelUpOverlay
        open={levelUp}
        nivel={13}
        titulo="Nível 13 alcançado!"
        descricao="Você entrou na zona de promoção da Liga Ouro."
        onClose={() => setLevelUp(false)}
      />
    </div>
  );
}

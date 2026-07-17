import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080F',
      color: '#E2E8F0',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflowX: 'hidden',
      position: 'relative',
    }}>

      {/* GLOW de fundo no hero */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '600px',
        background: 'radial-gradient(ellipse at 60% 0%, rgba(124,255,91,0.30) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* NAVBAR */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'env(safe-area-inset-top) 48px 0',
        minHeight: '72px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(8,8,15,0.85)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/nexvel-wordmark.png" alt="Nexvel" style={{ height: '22px', width: 'auto', display: 'block' }} />
        </div>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {['Recursos', 'Para nutricionistas', 'Para pacientes', 'Planos', 'Blog'].map(link => (
            <a key={link} href="#" style={{
              color: '#94A3B8', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
            >{link}</a>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'white', padding: '9px 20px',
            borderRadius: '8px', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
          >Entrar</button>
          <button onClick={() => navigate('/cadastro')} style={{
            background: 'linear-gradient(135deg, #7CFF5B, #70F570)',
            border: 'none', color: '#08130A',
            padding: '9px 20px', borderRadius: '8px',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 0 16px rgba(124,255,91,0.4)',
          }}>Criar conta</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        padding: '70px 48px 70px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '60px',
        alignItems: 'center',
        maxWidth: '1280px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left — Copy */}
        <div style={{ maxWidth: '520px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(124,255,91,0.15)',
            border: '1px solid rgba(124,255,91,0.45)',
            borderRadius: '999px', padding: '5px 14px',
            fontSize: '11px', fontWeight: 700,
            color: '#7CFF5B', letterSpacing: '0.1em',
            marginBottom: '24px', textTransform: 'uppercase',
          }}>
            BEM-VINDO AO NEXVEL
          </div>

          {/* H1 — 2 linhas */}
          <h1 style={{
            fontSize: '48px', fontWeight: 700,
            lineHeight: 1.12, letterSpacing: '-1px',
            color: 'white', margin: '0 0 20px',
          }}>
            Transforme sua rotina em{' '}
            <span style={{ color: '#7CFF5B' }}>resultados reais.</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '16px', color: '#94A3B8', fontWeight: 400,
            lineHeight: 1.6, margin: '0 0 36px', maxWidth: '440px',
          }}>
            Gamificação, acompanhamento e motivação para você evoluir com consistência.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '48px' }}>
            <button onClick={() => navigate('/cadastro')} style={{
              background: 'linear-gradient(135deg, #7CFF5B, #70F570)',
              border: 'none', color: '#08130A',
              padding: '14px 28px', borderRadius: '10px',
              fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 0 24px rgba(124,255,91,0.5)', transition: 'all 0.2s',
            }}>Sou nutricionista</button>
            <button onClick={() => navigate('/login?tipo=paciente')} style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white', padding: '14px 28px',
              borderRadius: '10px', fontSize: '15px',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}>Sou paciente</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '40px' }}>
            {[
              { val: '+25K', label: 'Usuários ativos' },
              { val: '+2M', label: 'Registros realizados' },
              { val: '+90%', label: 'Mais adesão' },
              { val: '+200', label: 'Ligas criadas' },
            ].map(stat => (
              <div key={stat.val}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#7CFF5B' }}>{stat.val}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Mockup (tablet + celular) */}
        <div style={{ position: 'relative' }}>
          {/* TABLET */}
          <div style={{
            width: '580px', maxWidth: '100%',
            background: '#13131F',
            border: '1px solid rgba(124,255,91,0.4)',
            borderRadius: '16px', padding: '20px',
            boxShadow: '0 0 60px rgba(124,255,91,0.2), 0 24px 48px rgba(0,0,0,0.5)',
          }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                width: '24px', height: '24px',
                background: '#0A0A0A',
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src="/nexvel-x-512.png" alt="" style={{ height: '13px', width: 'auto', display: 'block' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Dashboard</span>
            </div>

            {/* KPI cards (2x2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {[
                { label: 'Pacientes ativos', val: '128', sub: '+15% vs mês' },
                { label: 'Retenção (30 dias)', val: '87%', sub: '+5% no mês' },
                { label: 'Check-ins hoje', val: '32', sub: '+8% na semana' },
                { label: 'Evolução média', val: '+24%', sub: 'esta semana' },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: '#0F0F1C',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', padding: '12px 14px',
                }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '6px' }}>{kpi.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>{kpi.val}</div>
                  <div style={{ fontSize: '10px', color: '#10B981', marginTop: '6px' }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Duas colunas: Ligas + Desafios */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Ligas em destaque */}
              <div style={{
                background: '#0F0F1C',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '12px 14px',
              }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '10px' }}>Ligas em destaque</div>
                {[
                  { name: 'Elite Nexvel', pts: '1.250 pts', cor: '#F59E0B' },
                  { name: 'Foco e Disciplina', pts: '980 pts', cor: '#F97316' },
                  { name: 'Imbaríveis', pts: '870 pts', cor: '#7CFF5B' },
                ].map(l => (
                  <div key={l.name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.cor }} />
                      <span style={{ fontSize: '11px', color: '#CBD5E1' }}>{l.name}</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>{l.pts}</span>
                  </div>
                ))}
              </div>

              {/* Desafios ativos */}
              <div style={{
                background: '#0F0F1C',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '12px 14px',
              }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '10px' }}>Desafios ativos</div>
                {[
                  { name: 'Desafio 7 dias', pct: 28 },
                  { name: 'Desafio Treino', pct: 55 },
                  { name: 'Desafio Água', pct: 71 },
                ].map(d => (
                  <div key={d.name} style={{ marginBottom: '9px' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: '11px', color: '#CBD5E1', marginBottom: '4px',
                    }}>
                      <span>{d.name}</span>
                      <span style={{ color: '#64748B' }}>{d.pct}%</span>
                    </div>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                      <div style={{
                        height: '100%', width: `${d.pct}%`,
                        background: 'linear-gradient(90deg, #7CFF5B, #70F570)', borderRadius: '2px',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CELULAR sobreposto */}
          <div style={{
            position: 'absolute', bottom: '-20px', right: '-30px', zIndex: 10,
            width: '160px',
            background: '#0F0F1C',
            border: '2px solid rgba(124,255,91,0.5)',
            borderRadius: '24px', padding: '14px 12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'white', marginBottom: '10px' }}>Ligas</div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(124,255,91,0.25), rgba(124,255,91,0.12))',
              borderRadius: '12px', padding: '12px', textAlign: 'center', marginBottom: '10px',
            }}>
              <div style={{ fontSize: '30px', lineHeight: 1 }}>🏆</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', marginTop: '6px' }}>Elite Nexvel</div>
            </div>
            {[
              { n: 'Lucas A.', p: '2.360' },
              { n: 'Fernanda C.', p: '2.342' },
              { n: 'Rafael L.', p: '1.960' },
            ].map(j => (
              <div key={j.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <span style={{ fontSize: '10px', color: '#CBD5E1' }}>{j.n}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#7CFF5B' }}>{j.p}</span>
              </div>
            ))}
            <button style={{
              width: '100%', marginTop: '4px',
              background: 'linear-gradient(135deg, #7CFF5B, #70F570)',
              border: 'none', color: '#08130A', fontSize: '10px', fontWeight: 600,
              padding: '8px', borderRadius: '8px', cursor: 'pointer',
            }}>Ver ranking completo</button>
          </div>

          {/* Glow embaixo do mockup */}
          <div style={{
            position: 'absolute', bottom: '-30px', left: '50%',
            transform: 'translateX(-50%)', width: '60%', height: '40px',
            background: 'rgba(124,255,91,0.3)', filter: 'blur(24px)', borderRadius: '50%',
          }} />
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section style={{
        background: '#0F0F1C',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '28px 48px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '220px 1fr 1fr 1fr 1fr 1fr',
          gap: '28px', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7CFF5B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
              FUNCIONALIDADES
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              QUE FAZEM A DIFERENÇA
            </div>
          </div>
          {[
            { icon: '🏆', label: 'Ligas e Ranking' },
            { icon: '📋', label: 'Diário de Bordo' },
            { icon: '🎯', label: 'Sistema de Radar' },
            { icon: '📈', label: 'Relatórios Inteligentes' },
            { icon: '🏅', label: 'Gamificação Completa' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{f.icon}</span>
              <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 500 }}>{f.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

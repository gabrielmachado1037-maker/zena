const { execSync } = require('child_process');

function tryRun(cmd) {
  try { execSync(cmd, { stdio: 'pipe' }); } catch (_) {}
}

// Baseline migrations that already exist in the DB but weren't tracked
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260626062036_init');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627000000_add_tipo_profissional');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627010000_add_paciente_dados_clinicos');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627020000_financial_module');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627030000_asaas_subscription');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627040000_foto_evolucao');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627050000_fix_schema');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627060000_fix_schema_v2');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627070000_add_braco_coxa_medicao');

// Apply only new migrations
execSync('./node_modules/.bin/prisma migrate deploy', { stdio: 'inherit' });

// Start server
execSync('node dist/index.js', { stdio: 'inherit' });

const { execSync } = require('child_process');

function tryRun(cmd) {
  try { execSync(cmd, { stdio: 'pipe' }); } catch (_) {}
}

// Baseline migrations that already exist in the DB but weren't tracked
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260626062036_init');
tryRun('./node_modules/.bin/prisma migrate resolve --applied 20260627000000_add_tipo_profissional');

// Apply only new migrations
execSync('./node_modules/.bin/prisma migrate deploy', { stdio: 'inherit' });

// Start server
execSync('node dist/index.js', { stdio: 'inherit' });

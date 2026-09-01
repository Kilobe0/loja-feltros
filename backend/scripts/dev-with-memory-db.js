// Sobe um MongoDB em memória (só para preview local, sem conta real do Atlas)
// e inicia o backend com MONGODB_URI apontando pra ele. Não usar em produção.
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(`[dev-with-memory-db] MongoDB em memória rodando em ${uri}`);

  const child = spawn('npx', ['nest', 'start', '--watch'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, MONGODB_URI: uri },
    stdio: 'inherit',
    shell: true,
  });

  const shutdown = async () => {
    child.kill();
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  child.on('exit', (code) => shutdown());
})();

const { spawn } = require('child_process');

console.log('🚀 Starting ClinicOS backend server and frontend client...');

const server = spawn('npm', ['run', 'dev', '--prefix', 'server'], {
  stdio: 'inherit',
  shell: true,
});

const client = spawn('npm', ['run', 'dev', '--prefix', 'client'], {
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\n🛑 Stopping ClinicOS services...');
  server.kill();
  client.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

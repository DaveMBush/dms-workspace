const { spawn } = require('child_process');
const path = require('path');

const electronBinary = require('electron');

const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;
env.DMS_NODE_EXEC_PATH = process.execPath;
env.DMS_ENABLE_MOCK_AUTH = '1';

const child = spawn(electronBinary, ['.'], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit',
});

child.on('exit', function handleExit(code, signal) {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

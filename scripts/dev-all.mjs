/**
 * Concurrently spawns BOTSKILL FastAPI loopback backend and Next.js frontend.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend', 'botskill');

console.log('[Dev All] Starting BOTSKILL Python backend on 127.0.0.1:8765...');

const backendEnv = {
  ...process.env,
  PYTHONPATH: path.join(backendDir, 'src')
};

const pythonProcess = spawn(
  'python',
  ['-m', 'botskill.main', '--host', '127.0.0.1', '--port', '8765', '--no-browser'],
  {
    cwd: backendDir,
    env: backendEnv,
    stdio: 'inherit',
    shell: true
  }
);

console.log('[Dev All] Starting Next.js frontend on http://localhost:3000...');
const nextProcess = spawn('npx', ['next', 'dev'], {
  cwd: rootDir,
  env: process.env,
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n[Dev All] Shutting down services...');
  pythonProcess.kill();
  nextProcess.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

import { build } from 'vite';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function buildElectron() {
  console.log('Building React app...');
  await build();

  console.log('Compiling Electron TypeScript...');
  try {
    await execAsync('tsc -p tsconfig.electron.json');
    console.log('Electron build complete!');
  } catch (error) {
    console.error('Error building Electron:', error);
    process.exit(1);
  }
}

buildElectron();

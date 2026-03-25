import { execFileSync } from 'child_process';
import { existsSync } from 'fs';

const projectDir = '/vercel/share/v0-project';

try {
  // Check if git is initialized
  if (existsSync(`${projectDir}/.git`)) {
    console.log('[v0] Git repo found, pulling latest changes...');
    const result = execFileSync('git', ['pull', 'origin', 'main'], { cwd: projectDir, encoding: 'utf8' });
    console.log('[v0] Pull result:', result);
  } else {
    console.log('[v0] No git repo found, cloning...');
    const result = execFileSync(
      'git',
      ['clone', 'https://github.com/GuidoS-dev/v0-sistema-ironlifting.git', '.'],
      { cwd: projectDir, encoding: 'utf8' }
    );
    console.log('[v0] Clone result:', result);
  }
  
  // List files after pull
  const files = execFileSync('find', ['.', '-name', '*.tsx', '-not', '-path', '*/node_modules/*', '-not', '-path', '*/.next/*'], 
    { cwd: projectDir, encoding: 'utf8' });
  console.log('[v0] Files found:\n', files);
} catch (error) {
  console.error('[v0] Error:', error.message);
  console.error('[v0] Stderr:', error.stderr);
}

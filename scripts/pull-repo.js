import { execSync } from 'child_process';
import { existsSync } from 'fs';

const projectDir = '/vercel/share/v0-project';

try {
  // Check if git is initialized
  if (existsSync(`${projectDir}/.git`)) {
    console.log('[v0] Git repo found, pulling latest changes...');
    const result = execSync('git pull origin main', { cwd: projectDir, encoding: 'utf8' });
    console.log('[v0] Pull result:', result);
  } else {
    console.log('[v0] No git repo found, cloning...');
    const result = execSync(
      'git clone https://github.com/GuidoS-dev/v0-sistema-ironlifting.git .',
      { cwd: projectDir, encoding: 'utf8' }
    );
    console.log('[v0] Clone result:', result);
  }
  
  // List files after pull
  const files = execSync('find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | head -50', 
    { cwd: projectDir, encoding: 'utf8' });
  console.log('[v0] Files found:\n', files);
} catch (error) {
  console.error('[v0] Error:', error.message);
  console.error('[v0] Stderr:', error.stderr);
}

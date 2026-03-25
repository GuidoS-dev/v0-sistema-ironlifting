import subprocess
import os

project_dir = '/vercel/share/v0-project'

# Check if git is available
try:
    result = subprocess.run(['which', 'git'], capture_output=True, text=True)
    print(f'[v0] git path: {result.stdout.strip()}')
    print(f'[v0] git stderr: {result.stderr.strip()}')
except Exception as e:
    print(f'[v0] which git error: {e}')

# List all binaries in PATH
try:
    path_dirs = os.environ.get('PATH', '').split(':')
    print(f'[v0] PATH dirs: {path_dirs}')
    for d in path_dirs:
        if os.path.exists(d):
            files = os.listdir(d)
            if 'git' in files:
                print(f'[v0] Found git in {d}')
except Exception as e:
    print(f'[v0] Error listing PATH: {e}')

# Try running git directly
try:
    result = subprocess.run(['/usr/bin/git', '--version'], capture_output=True, text=True)
    print(f'[v0] git version: {result.stdout.strip()}')
except Exception as e:
    print(f'[v0] /usr/bin/git error: {e}')

# Try /usr/local/bin/git
try:
    result = subprocess.run(['/usr/local/bin/git', '--version'], capture_output=True, text=True)
    print(f'[v0] git version local: {result.stdout.strip()}')
except Exception as e:
    print(f'[v0] /usr/local/bin/git error: {e}')

# List files already in project
print(f'[v0] Files in {project_dir}:')
for f in os.listdir(project_dir):
    print(f'  {f}')

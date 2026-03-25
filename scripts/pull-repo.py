import subprocess
import os

project_dir = '/vercel/share/v0-project'

os.makedirs(project_dir, exist_ok=True)

# Check if already a git repo
git_dir = os.path.join(project_dir, '.git')

if os.path.exists(git_dir):
    print('[v0] Git repo exists, pulling latest changes...')
    result = subprocess.run(
        ['/usr/bin/git', 'pull', 'origin', 'main'],
        capture_output=True, text=True, cwd=project_dir
    )
    print(f'[v0] stdout: {result.stdout}')
    print(f'[v0] stderr: {result.stderr}')
else:
    print('[v0] Cloning repository...')
    result = subprocess.run(
        ['/usr/bin/git', 'clone', 'https://github.com/GuidoS-dev/v0-sistema-ironlifting.git', '.'],
        capture_output=True, text=True, cwd=project_dir
    )
    print(f'[v0] stdout: {result.stdout}')
    print(f'[v0] stderr: {result.stderr}')
    print(f'[v0] return code: {result.returncode}')

# List TSX files found
print('\n[v0] TSX files in project:')
for root, dirs, files in os.walk(project_dir):
    # Skip hidden and build directories
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.next', '.git', '__pycache__']]
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            rel_path = os.path.relpath(os.path.join(root, f), project_dir)
            print(f'  {rel_path}')

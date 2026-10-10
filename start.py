#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / 'frontend'


def ensure_frontend_bundle() -> None:
    index_file = FRONTEND / 'dist' / 'index.html'
    if index_file.exists():
        return

    print('Frontend bundle not found. Building it now...')
    subprocess.run(['npm', 'install'], cwd=FRONTEND, check=True)
    subprocess.run(['npm', 'run', 'build'], cwd=FRONTEND, check=True)


def main() -> None:
    ensure_frontend_bundle()
    port = int(os.environ.get('PORT', '8000'))
    cmd = [
        sys.executable,
        '-m',
        'uvicorn',
        'backend.main:app',
        '--host',
        '0.0.0.0',
        '--port',
        str(port),
    ]
    print(f'Starting Buffett Advisor on http://localhost:{port}')
    subprocess.run(cmd, cwd=ROOT, check=True)


if __name__ == '__main__':
    main()

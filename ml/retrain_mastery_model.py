#!/usr/bin/env python3
"""Re-run the mastery shadow training workflow with an explicit cutoff."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--dataset-cutoff', required=True)
    parser.add_argument('--feature-set-version', type=int, default=1)
    args = parser.parse_args()
    command = [
        sys.executable,
        str(Path(__file__).with_name('train_mastery_model.py')),
        '--input', str(args.input),
        '--output', str(args.output),
        '--dataset-cutoff', args.dataset_cutoff,
        '--feature-set-version', str(args.feature_set_version),
    ]
    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode != 0:
        print(completed.stderr, file=sys.stderr, end='')
        return completed.returncode
    artifact = json.loads(completed.stdout)
    artifact['retraining'] = True
    artifact['promotion_required'] = True
    args.output.write_text(json.dumps(artifact, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'retraining_candidate_created', 'model_version': artifact.get('model_version'), 'promotion_required': True}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

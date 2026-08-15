#!/usr/bin/env python3
"""Evaluate a Datakwest mastery shadow artifact on a real held-out export."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

TARGET = "target_mastery_30d"


def load_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise ValueError(f"dataset_not_found:{path}")
    if path.suffix.lower() == '.jsonl':
        return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]
    if path.suffix.lower() == '.json':
        payload = json.loads(path.read_text(encoding='utf-8'))
        return payload if isinstance(payload, list) else payload.get('rows', [])
    with path.open('r', encoding='utf-8', newline='') as handle:
        return list(csv.DictReader(handle))


def evaluate(artifact: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        raise ValueError('no_evaluation_rows')
    features = artifact.get('features', [])
    if not features:
        raise ValueError('artifact_has_no_features')
    if any(TARGET not in row for row in rows):
        raise ValueError('missing_target')
    x = np.array([[float(row.get(feature, 0)) for feature in features] for row in rows], dtype=float)
    y = np.array([float(row[TARGET]) for row in rows], dtype=float)
    coefficients = np.array([float(artifact.get('coefficients', {}).get(feature, 0)) for feature in features])
    prediction = np.clip(float(artifact.get('intercept', 0)) + x @ coefficients, 0, 1)
    error = y - prediction
    mean_target = float(np.mean(y))
    rmse = float(np.sqrt(np.mean(error ** 2)))
    baseline_rmse = float(np.sqrt(np.mean((y - mean_target) ** 2)))
    return {
        'model_version': artifact.get('model_version'),
        'row_count': len(rows),
        'mae': round(float(np.mean(np.abs(error))), 6),
        'rmse': round(rmse, 6),
        'baseline_rmse': round(baseline_rmse, 6),
        'beats_baseline': rmse < baseline_rmse,
        'certifiable': bool(rmse < baseline_rmse and artifact.get('serving_mode') == 'shadow' and artifact.get('promotion_status') == 'not_promoted'),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--artifact', required=True, type=Path)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        artifact = json.loads(args.artifact.read_text(encoding='utf-8'))
        result = evaluate(artifact, load_rows(args.input))
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f'EVALUATION_BLOCKED:{error}', file=sys.stderr)
        return 2
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

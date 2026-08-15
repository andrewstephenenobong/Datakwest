#!/usr/bin/env python3
"""Train a bounded mastery shadow model from real feature snapshots.

This script intentionally refuses to generate synthetic rows. It requires a real
export containing verified learner outcomes and feature snapshots. The output is
an auditable JSON artifact suitable for shadow inference, never direct mastery
mutation.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import numpy as np

TARGET = "target_mastery_30d"
IDENTITY_COLUMNS = {"learner_id", "feature_snapshot_id", "snapshot_at", "target_observed_at", TARGET}
MIN_ROWS = 50
MIN_LEARNERS = 10


def load_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise ValueError(f"dataset_not_found:{path}")
    if path.suffix.lower() in {".json", ".jsonl"}:
        raw = path.read_text(encoding="utf-8")
        if path.suffix.lower() == ".jsonl":
            return [json.loads(line) for line in raw.splitlines() if line.strip()]
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else parsed.get("rows", [])
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def number(value: Any, name: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"non_numeric:{name}") from exc
    if not math.isfinite(result):
        raise ValueError(f"non_finite:{name}")
    return result


def design_matrix(rows: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray, list[str], list[str]]:
    if not rows:
        raise ValueError("no_training_rows")
    if any(TARGET not in row for row in rows):
        raise ValueError(f"missing_target:{TARGET}")
    features = sorted({key for row in rows for key in row if key.startswith("feature_")})
    if not features:
        raise ValueError("no_feature_columns")
    learners = sorted({str(row.get("learner_id", "")) for row in rows if row.get("learner_id")})
    if len(rows) < MIN_ROWS:
        raise ValueError(f"insufficient_rows:{len(rows)}<{MIN_ROWS}")
    if len(learners) < MIN_LEARNERS:
        raise ValueError(f"insufficient_learners:{len(learners)}<{MIN_LEARNERS}")
    matrix = np.array([[number(row.get(feature, 0), feature) for feature in features] for row in rows], dtype=float)
    target = np.array([number(row[TARGET], TARGET) for row in rows], dtype=float)
    if np.any(target < 0) or np.any(target > 1):
        raise ValueError("target_out_of_range_0_to_1")
    return matrix, target, features, learners


def split_by_learner(rows: list[dict[str, Any]], learners: list[str]) -> tuple[list[int], list[int]]:
    validation_learners = {
        learner for learner in learners
        if int(hashlib.sha256(learner.encode("utf-8")).hexdigest()[:8], 16) % 5 == 0
    }
    if not validation_learners:
        validation_learners = {learners[-1]}
    train = [index for index, row in enumerate(rows) if str(row.get("learner_id", "")) not in validation_learners]
    validation = [index for index, row in enumerate(rows) if str(row.get("learner_id", "")) in validation_learners]
    if not train or not validation:
        raise ValueError("learner_split_failed")
    return train, validation


def metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    errors = actual - predicted
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    baseline = float(np.mean(actual))
    baseline_rmse = float(np.sqrt(np.mean((actual - baseline) ** 2)))
    return {
        "mae": round(mae, 6),
        "rmse": round(rmse, 6),
        "baseline_rmse": round(baseline_rmse, 6),
        "beats_baseline": rmse < baseline_rmse,
    }


def train(input_path: Path, output_path: Path, feature_set_version: int, dataset_cutoff: str) -> dict[str, Any]:
    rows = load_rows(input_path)
    matrix, target, features, learners = design_matrix(rows)
    train_indices, validation_indices = split_by_learner(rows, learners)
    x_train = np.column_stack([np.ones(len(train_indices)), matrix[train_indices]])
    y_train = target[train_indices]
    regularization = np.eye(x_train.shape[1]) * 0.01
    regularization[0, 0] = 0
    coefficients = np.linalg.solve(x_train.T @ x_train + regularization, x_train.T @ y_train)
    x_validation = np.column_stack([np.ones(len(validation_indices)), matrix[validation_indices]])
    prediction = np.clip(x_validation @ coefficients, 0, 1)
    validation_metrics = metrics(target[validation_indices], prediction)
    if not validation_metrics["beats_baseline"]:
        raise ValueError("candidate_does_not_beat_mean_baseline")
    artifact = {
        "artifact_type": "datakwest_mastery_shadow_regression",
        "artifact_version": 1,
        "model_key": "mastery_prediction",
        "model_version": f"candidate-{dataset_cutoff}",
        "feature_set_version": feature_set_version,
        "target": TARGET,
        "dataset_cutoff": dataset_cutoff,
        "row_count": len(rows),
        "learner_count": len(learners),
        "split": {"train_rows": len(train_indices), "validation_rows": len(validation_indices), "grouped_by": "learner_id"},
        "features": features,
        "intercept": float(coefficients[0]),
        "coefficients": {feature: float(value) for feature, value in zip(features, coefficients[1:])},
        "validation_metrics": validation_metrics,
        "serving_mode": "shadow",
        "promotion_status": "not_promoted",
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return artifact


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--feature-set-version", type=int, default=1)
    parser.add_argument("--dataset-cutoff", required=True)
    args = parser.parse_args()
    try:
        artifact = train(args.input, args.output, args.feature_set_version, args.dataset_cutoff)
    except ValueError as error:
        print(f"TRAINING_BLOCKED:{error}", file=sys.stderr)
        return 2
    print(json.dumps({"status": "candidate_created", "model_version": artifact["model_version"], "metrics": artifact["validation_metrics"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

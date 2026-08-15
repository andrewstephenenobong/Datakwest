# Datakwest ML Shadow Workspace

This directory contains the first bounded machine-learning workflow for Datakwest. It is intentionally **shadow-only**. A candidate model may produce auditable predictions, but it cannot mutate learner mastery, readiness, or recommendations.

## Dataset contract

Training requires a real export of `learner_feature_snapshots` joined to a later verified mastery outcome. The file may be CSV, JSON, or JSONL. It must contain `learner_id`, `feature_snapshot_id`, `snapshot_at`, `target_mastery_30d`, and one or more numeric columns beginning with `feature_`.

The training script refuses to run when the data is absent, contains fewer than 50 rows, contains fewer than 10 distinct learners, has no feature columns, has invalid targets, or fails to beat the mean-prediction baseline on a learner-grouped validation split. No synthetic rows are created.

## Training

```bash
python3 ml/train_mastery_model.py \
  --input exports/mastery_features.jsonl \
  --output artifacts/mastery_prediction_candidate.json \
  --feature-set-version 1 \
  --dataset-cutoff 2026-08-15T00:00:00Z
```

The output includes the feature list, coefficients, dataset cutoff, learner and row counts, grouped split details, validation metrics, and explicit `serving_mode: shadow` and `promotion_status: not_promoted` fields.

## Promotion rule

The candidate must remain in shadow mode until the evaluation service confirms that it beats the deterministic baseline on a locked validation set, is calibrated, has acceptable error by skill and learner segment, passes safety and fairness review, and remains within the approved latency and cost budgets. Promotion must be a separate reviewed migration or administrative workflow; this repository does not implement silent promotion.

## Current status

The live database has the model registry, training-run lineage, feature-bound inference records, and shadow-outcome tables. The live registry intentionally contains `untrained-v0` planned models. A real learner corpus is required before the first candidate can be trained.

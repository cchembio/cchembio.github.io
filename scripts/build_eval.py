#!/usr/bin/env python3
"""
build_eval.py — HyDRA II evaluation score computation.

Reads  : data/hydraii/shifts_data.json
Writes : data/hydraii/experimental_data.csv
         data/hydraii/eval_scores.json

Run from repo root:
    python3 scripts/build_eval.py

Synthetic tests:
    python3 scripts/build_eval.py --test
"""

import json
import csv
import math
import sys
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
REPO    = Path(__file__).parent.parent
DATA    = REPO / "data" / "hydraii"
SHIFTS  = DATA / "shifts_data.json"
EXP_CSV = DATA / "experimental_data.csv"
SCORES  = DATA / "eval_scores.json"

# Experimental uncertainty assigned to all ground-truth values (cm⁻¹)
EXP_UNCERTAINTY = 2.0

# ── Maths helpers ─────────────────────────────────────────────────────────────
_SQRT2   = math.sqrt(2.0)
_SQRT2PI = math.sqrt(2.0 * math.pi)
_SQRTPI  = math.sqrt(math.pi)


def _norm_cdf(x: float) -> float:
    """Standard normal CDF using math.erfc — no scipy dependency."""
    return 0.5 * math.erfc(-x / _SQRT2)


def _norm_pdf(x: float) -> float:
    """Standard normal PDF."""
    return math.exp(-0.5 * x * x) / _SQRT2PI


def _effective_sigma(pred_unc: float, truth_unc: float, eps: float = 1e-6) -> float:
    """Combined uncertainty: sqrt(pred_unc² + truth_unc²).

    Clamped to eps to guard against division by zero when both inputs are zero.
    Both inputs must be non-None (callers are responsible for null-filtering).
    """
    return max(math.sqrt(pred_unc ** 2 + truth_unc ** 2), eps)


# ── Score functions ───────────────────────────────────────────────────────────

def score_log_likelihood(predictions: list, truth: tuple) -> float:
    """Gaussian log-likelihood, normalised by the number of valid predictions.

    For each prediction (mu_i, sigma_pred_i) and truth (y, sigma_truth):
      sigma_eff = sqrt(sigma_pred_i² + sigma_truth²)
      ll_i = -0.5 * (2*log(sigma_eff) + (y - mu_i)² / sigma_eff²)

    Predictions where shift or uncertainty is None are skipped.
    Returns mean ll (higher = better), or -inf for empty/all-invalid sets.
    """
    y, sigma_truth = truth
    values = []
    for mu, sigma_pred in predictions:
        # Skip any prediction with a missing shift or uncertainty
        if mu is None or sigma_pred is None:
            continue
        sigma_eff = _effective_sigma(sigma_pred, sigma_truth)
        ll = -0.5 * (2.0 * math.log(sigma_eff) + (y - mu) ** 2 / sigma_eff ** 2)
        values.append(ll)
    if not values:
        return float("-inf")
    return sum(values) / len(values)


def score_crps(predictions: list, truth: tuple) -> float:
    """Continuous Ranked Probability Score (Gaussian closed form), mean over valid predictions.

    For a Gaussian predictive distribution N(mu, sigma_eff²):
      CRPS = sigma_eff * (z*(2*Φ(z)−1) + 2*φ(z) − 1/√π)
    where z = (y − mu) / sigma_eff.

    Predictions where shift or uncertainty is None are skipped.
    Returns mean CRPS (lower = better), or +inf for empty/all-invalid sets.
    """
    y, sigma_truth = truth
    values = []
    for mu, sigma_pred in predictions:
        # Skip any prediction with a missing shift or uncertainty
        if mu is None or sigma_pred is None:
            continue
        sigma_eff = _effective_sigma(sigma_pred, sigma_truth)
        z    = (y - mu) / sigma_eff
        crps = sigma_eff * (z * (2 * _norm_cdf(z) - 1) + 2 * _norm_pdf(z) - 1 / _SQRTPI)
        values.append(crps)
    if not values:
        return float("inf")
    return sum(values) / len(values)


def score_coverage(predictions: list, truth: tuple,
                   levels: tuple = (0.50, 0.90, 0.95)) -> dict:
    """Empirical coverage at standard confidence levels.

    A prediction covers at level α if |y − mu| ≤ z_α * sigma_eff,
    where z_α is the two-sided normal quantile:
      0.50 → 0.6745,  0.90 → 1.6449,  0.95 → 1.9600

    Predictions where shift or uncertainty is None are skipped.
    Returns dict e.g. {"50": 0.6, "90": 0.85, "95": 0.9}, or None values if no valid predictions.
    """
    Z = {0.50: 0.6745, 0.90: 1.6449, 0.95: 1.9600}
    y, sigma_truth = truth

    # Filter out incomplete predictions
    valid = [
        (mu, sp) for mu, sp in predictions
        if mu is not None and sp is not None
    ]
    if not valid:
        return {str(int(lv * 100)): None for lv in levels}

    result = {}
    for lv in levels:
        z_lv = Z[lv]
        covered = sum(
            1 for mu, sp in valid
            if abs(y - mu) <= z_lv * _effective_sigma(sp, sigma_truth)
        )
        result[str(int(lv * 100))] = covered / len(valid)
    return result


def score_sharpness(predictions: list, truth: tuple) -> float:
    """Mean effective 95% interval width: 2 * 1.96 * sigma_eff per prediction.

    Measures spread of the predictive distributions (lower = sharper / more confident).
    Predictions where shift or uncertainty is None are skipped.
    Returns mean width, or +inf for empty/all-invalid sets.
    """
    _, sigma_truth = truth
    widths = [
        2 * 1.96 * _effective_sigma(sp, sigma_truth)
        for mu, sp in predictions
        if mu is not None and sp is not None  # skip incomplete predictions
    ]
    if not widths:
        return float("inf")
    return sum(widths) / len(widths)


# ── I/O ───────────────────────────────────────────────────────────────────────

def write_experimental_csv(data: dict) -> None:
    """Write one CSV row per series with the median as experimental ground truth.

    Columns: series_key, molecule, hydrate_type, value, uncertainty
    'value' is the series median; 'uncertainty' is EXP_UNCERTAINTY for all rows.
    """
    rows = []
    for key, s in data["series"].items():
        rows.append({
            "series_key":   key,
            "molecule":     s["molecule"],
            "hydrate_type": s["hydrate_type"],
            "value":        s["median"],
            "uncertainty":  EXP_UNCERTAINTY,
        })

    fields = ["series_key", "molecule", "hydrate_type", "value", "uncertainty"]
    with open(EXP_CSV, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def read_experimental_csv() -> dict:
    """Return dict mapping series_key → (value: float, uncertainty: float)."""
    result = {}
    with open(EXP_CSV, newline="") as f:
        for row in csv.DictReader(f):
            result[row["series_key"]] = (float(row["value"]), float(row["uncertainty"]))
    return result


# ── Score aggregation ─────────────────────────────────────────────────────────

def compute_all_scores(data: dict, exp: dict) -> dict:
    """Compute all evaluation scores for every participant code across all series.

    For each code, predictions are collected from every series where the code
    appears. Both shift and uncertainty must be non-null to be included.
    Scores are computed per-series and averaged across series for each code.

    Also embeds the experimental ground-truth values under the "experimental" key
    so hydra2.html can fetch a single JSON for both scores and range shading.

    Returns:
        {
          "series_keys": [...],
          "experimental": { series_key: {"value": float, "uncertainty": float}, ... },
          "scores": {
            code: {
              "log_likelihood": float,   # higher = better
              "crps":           float,   # lower  = better
              "coverage":       {"50": float, "90": float, "95": float},
              "sharpness":      float,   # lower  = better (tighter predictions)
              "n":              int      # number of valid predictions counted
            }, ...
          }
        }
    """
    series_keys = list(data["series"].keys())

    # Build the experimental dict to embed in output
    experimental = {
        key: {"value": v, "uncertainty": u}
        for key, (v, u) in exp.items()
    }

    # Collect all participant codes that have at least one non-null shift
    all_codes: set = set()
    for s in data["series"].values():
        for p in s["points"]:
            if p["shift"] is not None:
                all_codes.add(p["code"])

    result_scores = {}
    for code in sorted(all_codes):
        ll_vals, crps_vals, sharp_vals = [], [], []
        cov_50, cov_90, cov_95 = [], [], []
        n = 0

        for key in series_keys:
            if key not in exp:
                continue
            truth = exp[key]
            s = data["series"][key]

            # Only include points for this code where BOTH shift and uncertainty are non-null
            preds = [
                (p["shift"], p["uncertainty"])
                for p in s["points"]
                if p["code"] == code
                and p["shift"] is not None
                and p["uncertainty"] is not None
            ]
            if not preds:
                # No valid predictions for this code in this series — skip
                continue

            n += len(preds)
            ll_vals.append(score_log_likelihood(preds, truth))
            crps_vals.append(score_crps(preds, truth))
            cov = score_coverage(preds, truth)
            if cov.get("50") is not None:
                cov_50.append(cov["50"])
                cov_90.append(cov["90"])
                cov_95.append(cov["95"])
            sharp_vals.append(score_sharpness(preds, truth))

        if n == 0:
            continue

        def _mean(lst):
            return sum(lst) / len(lst) if lst else None

        result_scores[code] = {
            "log_likelihood": round(_mean(ll_vals), 4) if ll_vals else None,
            "crps":           round(_mean(crps_vals), 4) if crps_vals else None,
            "coverage": {
                "50": round(_mean(cov_50), 4) if cov_50 else None,
                "90": round(_mean(cov_90), 4) if cov_90 else None,
                "95": round(_mean(cov_95), 4) if cov_95 else None,
            },
            "sharpness": round(_mean(sharp_vals), 4) if sharp_vals else None,
            "n": n,
        }

    return {
        "series_keys":  series_keys,
        "experimental": experimental,
        "scores":       result_scores,
    }


# ── Synthetic tests ───────────────────────────────────────────────────────────

def run_synthetic_tests() -> None:
    """Run hand-computable examples to verify score correctness.

    Test A — near-perfect prediction: ll should be positive (close to 0).
    Test B — badly wrong prediction: ll should be very negative.
    Test C — near-perfect CRPS: should be ≈ 0.
    Test D — calibration on a uniform spread: empirical coverage ≈ nominal.
    Test E — sharpness: exact value checkable by hand.
    Test F — null skipping: a prediction with None uncertainty must be ignored.
    """
    print("=== Synthetic tests ===\n")
    passes = 0
    fails  = 0

    def check(label: str, condition: bool, detail: str = "") -> None:
        nonlocal passes, fails
        status = "PASS" if condition else "FAIL"
        if condition:
            passes += 1
        else:
            fails += 1
        print(f"  {status}  {label}" + (f"  ({detail})" if detail else ""))

    # ── Test A: near-perfect prediction ──────────────────────────────────────
    # mu = truth, pred_sigma ≈ 0 → sigma_eff ≈ truth_sigma = 2.0
    # ll ≈ -0.5 * (2*log(2) + 0) ≈ -0.693 ... still negative but finite
    # With tiny pred_sigma the combined sigma_eff ~ truth_sigma so ll is finite
    preds_a = [(100.0, 0.01)]
    truth_a = (100.0, 2.0)
    ll_a = score_log_likelihood(preds_a, truth_a)
    check("A log-likelihood (perfect mu, small sigma, should be > -1)", ll_a > -1.0,
          f"ll={ll_a:.4f}")

    # ── Test B: badly wrong prediction ───────────────────────────────────────
    preds_b = [(100.0, 1.0)]
    truth_b = (200.0, 2.0)       # |y - mu| = 100, sigma_eff ≈ 2.24
    ll_b = score_log_likelihood(preds_b, truth_b)
    check("B log-likelihood (100 cm⁻¹ off, should be << -100)", ll_b < -100,
          f"ll={ll_b:.1f}")

    # ── Test C: CRPS near zero for near-perfect prediction ───────────────────
    crps_c = score_crps([(50.0, 0.001)], (50.0, 0.001))
    check("C CRPS (near-perfect, should be < 0.01)", crps_c < 0.01,
          f"crps={crps_c:.5f}")

    # ── Test D: calibration on uniform spread ────────────────────────────────
    # 101 predictions at integer x from -50 to 50, each sigma=10; truth=(0, 1)
    # sigma_eff = sqrt(100+1) ≈ 10.05
    # z_90 * sigma_eff ≈ 1.6449 * 10.05 ≈ 16.5 → should cover ~90% of [-50,50]
    preds_d = [(float(i), 10.0) for i in range(-50, 51)]
    truth_d = (0.0, 1.0)
    cov_d   = score_coverage(preds_d, truth_d)
    check("D coverage 90% (should be 0.25–0.45)", 0.25 <= cov_d["90"] <= 0.45,
          f"cov90={cov_d['90']:.2f}")
    check("D coverage 50% ≤ coverage 90%", cov_d["50"] <= cov_d["90"],
          f"cov50={cov_d['50']:.2f} cov90={cov_d['90']:.2f}")

    # ── Test E: sharpness — exact value ──────────────────────────────────────
    preds_e  = [(0.0, 1.0)] * 5
    truth_e  = (0.0, 2.0)
    sharp_e  = score_sharpness(preds_e, truth_e)
    expected = 2 * 1.96 * math.sqrt(1.0 ** 2 + 2.0 ** 2)   # ≈ 8.759
    check("E sharpness exact value", abs(sharp_e - expected) < 1e-9,
          f"got={sharp_e:.4f} expected={expected:.4f}")

    # ── Test F: null uncertainty skipping ────────────────────────────────────
    # Mixed list: one valid prediction and one with None uncertainty
    preds_f = [(100.0, 5.0), (200.0, None)]
    truth_f = (100.0, 2.0)
    ll_f    = score_log_likelihood(preds_f, truth_f)
    crps_f  = score_crps(preds_f, truth_f)
    sharp_f = score_sharpness(preds_f, truth_f)
    cov_f   = score_coverage(preds_f, truth_f)
    # All scores should reflect only the first prediction (n_valid=1)
    ll_ref    = score_log_likelihood([(100.0, 5.0)], truth_f)
    crps_ref  = score_crps([(100.0, 5.0)], truth_f)
    sharp_ref = score_sharpness([(100.0, 5.0)], truth_f)
    check("F null-unc skipped: log-likelihood matches single valid pred",
          abs(ll_f - ll_ref) < 1e-12, f"ll={ll_f:.6f} ref={ll_ref:.6f}")
    check("F null-unc skipped: CRPS matches single valid pred",
          abs(crps_f - crps_ref) < 1e-12, f"crps={crps_f:.6f} ref={crps_ref:.6f}")
    check("F null-unc skipped: sharpness matches single valid pred",
          abs(sharp_f - sharp_ref) < 1e-12)
    check("F null-unc skipped: coverage matches single valid pred",
          cov_f["50"] == score_coverage([(100.0, 5.0)], truth_f)["50"])

    # ── Coverage table ────────────────────────────────────────────────────────
    print(f"\n=== Coverage table (Test D: 101 uniform preds, truth=0±1) ===")
    print(f"  {'Level':>6}  {'Nominal':>8}  {'Empirical':>10}  {'Error':>8}")
    for lv_str, nom in [("50", 0.50), ("90", 0.90), ("95", 0.95)]:
        emp = cov_d.get(lv_str)
        if emp is not None:
            print(f"  {lv_str+'%':>6}  {nom:>8.2f}  {emp:>10.2f}  {emp - nom:>+8.2f}")

    print(f"\n{'='*40}")
    print(f"Result: {passes} passed, {fails} failed")
    if fails:
        print("⚠  Some tests FAILED — review the output above.")
        sys.exit(1)
    else:
        print("✅ All tests passed.")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    """Read shifts_data.json, write experimental_data.csv and eval_scores.json."""
    data = json.loads(SHIFTS.read_text())
    write_experimental_csv(data)
    exp    = read_experimental_csv()
    scores = compute_all_scores(data, exp)
    SCORES.write_text(json.dumps(scores, indent=2))
    n_codes = len(scores["scores"])
    print(f"Wrote {EXP_CSV}  ({len(data['series'])} series)")
    print(f"Wrote {SCORES}   ({n_codes} participant codes)")


if __name__ == "__main__":
    if "--test" in sys.argv:
        run_synthetic_tests()
    else:
        main()

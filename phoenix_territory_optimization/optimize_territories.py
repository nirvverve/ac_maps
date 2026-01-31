
#!/usr/bin/env python3
"""Territory Optimization Script."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from pipeline.utils import (
    build_branch_to_area_map,
    clean_zip_code,
    load_branch_definitions,
    load_excel_safe,
    validate_dataframe,
)


PERIPHERAL_CITIES = [
    "CASA GRANDE",
    "MARICOPA",
    "SAN TAN VALLEY",
    "COOLIDGE",
    "ELOY",
    "ARIZONA CITY",
    "STANFIELD",
    "RED ROCK",
]


def parse_args() -> argparse.Namespace:
    default_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description=(
            "Rebalance Phoenix territories and integrate Tucson accounts into "
            "a 4-area territory model."
        )
    )
    parser.add_argument(
        "--data-root",
        default=str(default_root),
        help="Root directory for input data files.",
    )
    parser.add_argument(
        "--config",
        default="config/branch_definitions.json",
        help="Path to branch_definitions.json (relative to data root).",
    )
    parser.add_argument(
        "--phoenix-accounts",
        default="Uploads/Phoenix Account List 10 29.csv",
        help="Phoenix accounts CSV file.",
    )
    parser.add_argument(
        "--tucson-accounts",
        default="Uploads/Tucson CG Active List.csv",
        help="Tucson accounts CSV file.",
    )
    parser.add_argument(
        "--analysis-workbook",
        default="Uploads/SJ Proposed Phoenix Branch Analysis By Zip Code (1).xlsx",
        help="Excel workbook with Phoenix branch analysis by ZIP.",
    )
    parser.add_argument(
        "--analysis-sheet",
        default="#3 - Analysis by Zip Code",
        help="Sheet name for the Phoenix branch analysis.",
    )
    parser.add_argument(
        "--output-dir",
        default="phoenix_territory_optimization/outputs",
        help="Output directory for generated files (relative to data root).",
    )
    parser.add_argument("--target-west", type=int, default=510, help="Target West account count.")
    parser.add_argument(
        "--target-central",
        type=int,
        default=546,
        help="Target Central account count.",
    )
    parser.add_argument("--target-east", type=int, default=585, help="Target East account count.")
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=1000,
        help="Max optimization iterations.",
    )
    return parser.parse_args()


def resolve_path(data_root: Path, value: str) -> Path:
    path = Path(value).expanduser()
    return path if path.is_absolute() else data_root / path


def calculate_distribution(assignments: dict[str, str], zip_counts: dict[str, int]) -> dict[str, int]:
    """Calculate account distribution given zip assignments."""
    dist = {"West": 0, "Central": 0, "East": 0}
    for zip_code, count in zip_counts.items():
        area = assignments.get(zip_code, "East")
        if area in dist:
            dist[area] += count
    return dist


def calculate_score(dist: dict[str, int], targets: dict[str, int]) -> int:
    """Calculate how far we are from targets (lower is better)."""
    return sum(abs(dist[area] - targets[area]) for area in targets)


def load_csv_safe(path: Path, context: str) -> pd.DataFrame:
    try:
        return pd.read_csv(path)
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"{context} file not found: {path}") from exc
    except Exception as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to read {context} file: {path}\n{exc}") from exc


def save_csv_safe(df: pd.DataFrame, path: Path, context: str) -> None:
    try:
        df.to_csv(path, index=False)
    except Exception as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to write {context} CSV: {path}\n{exc}") from exc


def save_json_safe(payload: dict, path: Path, context: str) -> None:
    try:
        with path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
    except Exception as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to write {context} JSON: {path}\n{exc}") from exc


def save_text_safe(path: Path, content: str, context: str) -> None:
    try:
        with path.open("w", encoding="utf-8") as handle:
            handle.write(content)
    except Exception as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to write {context} text: {path}\n{exc}") from exc


def main() -> None:
    args = parse_args()
    data_root = Path(args.data_root).expanduser().resolve()
    config_path = resolve_path(data_root, args.config)
    output_dir = resolve_path(data_root, args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    phoenix_path = resolve_path(data_root, args.phoenix_accounts)
    tucson_path = resolve_path(data_root, args.tucson_accounts)
    analysis_workbook = resolve_path(data_root, args.analysis_workbook)

    branch_definitions = load_branch_definitions(config_path)
    branch_to_area = build_branch_to_area_map(branch_definitions)
    arizona_config = branch_definitions.get("locations", {}).get("arizona", {})
    valid_areas = {
        territory.get("area")
        for territory in arizona_config.get("territories", [])
        if isinstance(territory, dict)
    }

    print("Loading data files...")
    phoenix_accounts = load_csv_safe(phoenix_path, "Phoenix accounts")
    tucson_accounts = load_csv_safe(tucson_path, "Tucson accounts")

    print(f"Loaded {len(phoenix_accounts)} Phoenix accounts")
    print(f"Loaded {len(tucson_accounts)} Tucson accounts")

    validate_dataframe(
        phoenix_accounts,
        ["ShippingPostalCode", "Customer_Number__c", "Name", "ShippingStreet"],
        context="Phoenix accounts",
    )
    validate_dataframe(
        tucson_accounts,
        ["ShippingPostalCode", "ShippingCity", "Customer_Number__c", "Name", "ShippingStreet"],
        context="Tucson accounts",
    )

    if "ShippingStateCode" not in phoenix_accounts.columns:
        if "ShippingState" in phoenix_accounts.columns:
            phoenix_accounts["ShippingStateCode"] = phoenix_accounts["ShippingState"]
        else:
            phoenix_accounts["ShippingStateCode"] = "AZ"

    phoenix_accounts["ZipCode"] = clean_zip_code(phoenix_accounts["ShippingPostalCode"])
    tucson_accounts["ZipCode"] = clean_zip_code(tucson_accounts["ShippingPostalCode"])

    tucson_accounts["City_Upper"] = (
        tucson_accounts["ShippingCity"].fillna("").astype(str).str.upper().str.strip()
    )
    peripheral_accounts = tucson_accounts[tucson_accounts["City_Upper"].isin(PERIPHERAL_CITIES)].copy()
    true_tucson_accounts = tucson_accounts[
        ~tucson_accounts["City_Upper"].isin(PERIPHERAL_CITIES)
    ].copy()

    print("\nSplit Tucson accounts:")
    print(f"  - Peripheral areas (to Phoenix East): {len(peripheral_accounts)}")
    print(f"  - True Tucson: {len(true_tucson_accounts)}")

    print("\nLoading previous Phoenix territory assignments...")
    prev_analysis = load_excel_safe(analysis_workbook, sheet_name=args.analysis_sheet)
    validate_dataframe(
        prev_analysis,
        ["ShippingPostalCode", "ProposedBranch"],
        context="Phoenix branch analysis",
    )

    prev_analysis["ShippingPostalCode"] = clean_zip_code(prev_analysis["ShippingPostalCode"])

    zip_assignments: dict[str, str] = {}
    unknown_branches: set[str] = set()
    for _, row in prev_analysis.iterrows():
        zip_value = row["ShippingPostalCode"]
        branch = row["ProposedBranch"]
        if pd.isna(zip_value) or pd.isna(branch):
            continue

        zip_code = str(zip_value).strip()
        if zip_code in {"nan", "", "<NA>"}:
            continue

        branch_name = str(branch).strip()
        area = branch_to_area.get(branch_name)
        if not area and branch_name in valid_areas:
            area = branch_name
        if not area:
            unknown_branches.add(branch_name)
            area = "West"

        if area not in valid_areas and valid_areas:
            print(f"Warning: area '{area}' not found in branch_definitions.json")

        zip_assignments[zip_code] = area

    if unknown_branches:
        print("\nWarning: Unmapped branches defaulted to West:")
        for branch in sorted(unknown_branches):
            print(f"  - {branch}")
    # Count accounts by zip code for Phoenix
    phoenix_zip_counts = phoenix_accounts.groupby("ZipCode").size().to_dict()

    # Count peripheral accounts by zip code
    peripheral_zip_counts = peripheral_accounts.groupby("ZipCode").size().to_dict()

    # Combine Phoenix and peripheral for optimization
    combined_zip_counts: dict[str, int] = {}
    for zip_code, count in phoenix_zip_counts.items():
        combined_zip_counts[zip_code] = count
    for zip_code, count in peripheral_zip_counts.items():
        combined_zip_counts[zip_code] = combined_zip_counts.get(zip_code, 0) + count

    # Current distribution
    current_dist = {"West": 0, "Central": 0, "East": 0}
    for zip_code, count in combined_zip_counts.items():
        area = zip_assignments.get(zip_code, "East")  # Default peripheral to East
        if area in current_dist:
            current_dist[area] += count

    print("\nCurrent distribution (Phoenix + Peripheral):")
    print(f"  West: {current_dist['West']} accounts")
    print(f"  Central: {current_dist['Central']} accounts")
    print(f"  East: {current_dist['East']} accounts")
    print(f"  Total: {sum(current_dist.values())} accounts")

    # Target distribution
    targets = {"West": args.target_west, "Central": args.target_central, "East": args.target_east}
    print("\nTarget distribution:")
    print(f"  West: {targets['West']} accounts")
    print(f"  Central: {targets['Central']} accounts")
    print(f"  East: {targets['East']} accounts")
    print(f"  Total: {sum(targets.values())} accounts")

    # Calculate gaps
    gaps = {area: targets[area] - current_dist[area] for area in targets}
    print("\nGaps to fill:")
    for area, gap in gaps.items():
        print(f"  {area}: {gap:+d} accounts")

    # Optimization: Move zip codes to achieve targets
    # Strategy: Move entire zip codes between areas to minimize moves while hitting targets

    # Start with current assignments
    optimized_assignments = zip_assignments.copy()

    # Get movable zip codes grouped by current area and size
    movable_zips: dict[str, list[tuple[str, int]]] = {}
    for area in ["West", "Central", "East"]:
        movable_zips[area] = [
            (zip_code, combined_zip_counts[zip_code])
            for zip_code in combined_zip_counts
            if optimized_assignments.get(zip_code) == area
        ]
        movable_zips[area].sort(key=lambda x: x[1])  # Sort by size

    # Simple optimization: Move zip codes to minimize distance from targets
    print("\nOptimizing assignments...")
    max_iterations = args.max_iterations
    best_score = calculate_score(current_dist, targets)
    best_assignments = optimized_assignments.copy()

    for _ in range(max_iterations):
        # Try moving a zip code from areas with surplus to areas with deficit
        improved = False

        for from_area in ["West", "Central", "East"]:
            current = calculate_distribution(optimized_assignments, combined_zip_counts)
            if current[from_area] <= targets[from_area]:
                continue  # This area needs more, not less

            for to_area in ["West", "Central", "East"]:
                if from_area == to_area:
                    continue
                if current[to_area] >= targets[to_area]:
                    continue  # This area has enough

                # Find best zip to move
                candidates = [
                    (zip_code, count)
                    for zip_code, count in movable_zips[from_area]
                    if optimized_assignments.get(zip_code) == from_area
                ]

                for zip_code, count in candidates:
                    # Try moving this zip
                    test_assignments = optimized_assignments.copy()
                    test_assignments[zip_code] = to_area
                    test_dist = calculate_distribution(test_assignments, combined_zip_counts)
                    test_score = calculate_score(test_dist, targets)

                    if test_score < best_score:
                        best_score = test_score
                        best_assignments = test_assignments.copy()
                        optimized_assignments = test_assignments.copy()
                        improved = True
                        print(
                            f"  Moved zip {zip_code} ({count} accounts) "
                            f"from {from_area} to {to_area}"
                        )
                        print(f"    Score improved to {best_score}")
                        break

                if improved:
                    break
            if improved:
                break

        if not improved:
            break

    # Final distribution
    final_dist = calculate_distribution(best_assignments, combined_zip_counts)
    print("\nFinal optimized distribution:")
    print(
        "  West: "
        f"{final_dist['West']} accounts (target: {targets['West']}, diff: {final_dist['West'] - targets['West']:+d})"
    )
    print(
        "  Central: "
        f"{final_dist['Central']} accounts (target: {targets['Central']}, diff: {final_dist['Central'] - targets['Central']:+d})"
    )
    print(
        "  East: "
        f"{final_dist['East']} accounts (target: {targets['East']}, diff: {final_dist['East'] - targets['East']:+d})"
    )
    print(f"  Total: {sum(final_dist.values())} accounts")

    # Assign each account to its area
    print("\nAssigning accounts to areas...")

    # Phoenix accounts
    phoenix_accounts["Area"] = phoenix_accounts["ZipCode"].map(best_assignments)
    phoenix_accounts["Area"] = phoenix_accounts["Area"].fillna("East")  # Default to East

    # Peripheral accounts (all go to East)
    peripheral_accounts["Area"] = "East"
    peripheral_accounts["Source"] = "Tucson (Peripheral)"

    # True Tucson accounts
    true_tucson_accounts["Area"] = "Tucson"
    true_tucson_accounts["Source"] = "Tucson"

    # Phoenix source
    phoenix_accounts["Source"] = "Phoenix"

    # Create final combined account list
    print("\nCreating final account assignments...")

    # Select key columns for output
    phoenix_final = phoenix_accounts[
        [
            "Customer_Number__c",
            "Name",
            "ShippingStreet",
            "ShippingStateCode",
            "ShippingPostalCode",
            "ZipCode",
            "Area",
            "Source",
        ]
    ].copy()

    peripheral_final = peripheral_accounts[
        [
            "Customer_Number__c",
            "Name",
            "ShippingStreet",
            "ShippingCity",
            "ShippingPostalCode",
            "ZipCode",
            "Area",
            "Source",
        ]
    ].copy()
    peripheral_final["ShippingStateCode"] = "AZ"

    tucson_final = true_tucson_accounts[
        [
            "Customer_Number__c",
            "Name",
            "ShippingStreet",
            "ShippingCity",
            "ShippingPostalCode",
            "ZipCode",
            "Area",
            "Source",
        ]
    ].copy()
    tucson_final["ShippingStateCode"] = "AZ"

    # Standardize columns
    for frame in [phoenix_final, peripheral_final, tucson_final]:
        if "ShippingCity" not in frame.columns:
            frame["ShippingCity"] = ""

    # Combine all accounts
    all_accounts = pd.concat([phoenix_final, peripheral_final, tucson_final], ignore_index=True)

    print("\nFinal account distribution:")
    print(all_accounts.groupby("Area").size())

    # Save outputs

    # 1. All accounts with area assignments
    save_csv_safe(
        all_accounts,
        output_dir / "All_Accounts_with_Area_Assignments.csv",
        "all accounts assignments",
    )
    print(f"\nSaved: All_Accounts_with_Area_Assignments.csv ({len(all_accounts)} accounts)")

    # 2. Summary by area
    summary = (
        all_accounts.groupby("Area")
        .agg({"Customer_Number__c": "count", "ZipCode": "nunique"})
        .rename(columns={"Customer_Number__c": "Account_Count", "ZipCode": "Unique_Zip_Codes"})
    )
    save_csv_safe(summary, output_dir / "Territory_Summary.csv", "territory summary")
    print("Saved: Territory_Summary.csv")

    # 3. Zip code assignments for map
    zip_area_map: list[dict[str, object]] = []
    for area in ["West", "Central", "East", "Tucson"]:
        area_accounts = all_accounts[all_accounts["Area"] == area]
        zip_counts = area_accounts.groupby("ZipCode").size().to_dict()

        for zip_code, count in zip_counts.items():
            zip_area_map.append({"Zip Code": zip_code, "Area": area, "Account Count": count})

    zip_area_df = pd.DataFrame(zip_area_map)
    save_csv_safe(
        zip_area_df,
        output_dir / "Zip_Code_Area_Assignments.csv",
        "zip code area assignments",
    )
    print(f"Saved: Zip_Code_Area_Assignments.csv ({len(zip_area_df)} zip codes)")

    # 4. Changes from original assignments
    changes: list[dict[str, object]] = []
    for zip_code in set(list(zip_assignments.keys()) + list(best_assignments.keys())):
        old_area = zip_assignments.get(zip_code, "N/A")
        new_area = best_assignments.get(zip_code, "N/A")
        if old_area != new_area:
            count = combined_zip_counts.get(zip_code, 0)
            changes.append(
                {
                    "Zip Code": zip_code,
                    "Previous Area": old_area,
                    "New Area": new_area,
                    "Accounts Moved": count,
                }
            )

    if changes:
        changes_df = pd.DataFrame(changes)
        save_csv_safe(changes_df, output_dir / "Territory_Changes.csv", "territory changes")
        print(f"Saved: Territory_Changes.csv ({len(changes)} zip codes changed)")

    # 5. Detailed summary report
    report_lines = [
        "PHOENIX TERRITORY OPTIMIZATION REPORT\n",
        "=" * 60 + "\n\n",
        "OBJECTIVE:\n",
        "  Rebalance Phoenix territories to achieve target account distribution\n",
        "  and integrate Tucson as a separate 4th area.\n\n",
        "TARGET DISTRIBUTION:\n",
        f"  West: {targets['West']} accounts\n",
        f"  Central: {targets['Central']} accounts\n",
        f"  East: {targets['East']} accounts (includes peripheral Tucson areas)\n",
        "  Tucson: All true Tucson accounts\n\n",
        "FINAL RESULTS:\n",
    ]

    for area in ["West", "Central", "East", "Tucson"]:
        count = len(all_accounts[all_accounts["Area"] == area])
        zips = all_accounts[all_accounts["Area"] == area]["ZipCode"].nunique()
        report_lines.append(f"  {area}:\n")
        report_lines.append(f"    Accounts: {count}\n")
        report_lines.append(f"    Zip Codes: {zips}\n")
        if area != "Tucson":
            target = targets[area]
            diff = count - target
            report_lines.append(f"    Target: {target}\n")
            report_lines.append(f"    Variance: {diff:+d} ({diff/target*100:+.1f}%)\n")
        report_lines.append("\n")

    report_lines.append(f"TOTAL ACCOUNTS: {len(all_accounts)}\n\n")
    report_lines.append("CHANGES MADE:\n")
    if changes:
        for change in changes:
            report_lines.append(
                f"  Zip {change['Zip Code']}: {change['Previous Area']} → {change['New Area']} "
                f"({change['Accounts Moved']} accounts)\n"
            )
    else:
        report_lines.append("  No zip codes moved (already optimized)\n")

    save_text_safe(
        output_dir / "Optimization_Report.txt",
        "".join(report_lines),
        "optimization report",
    )
    print("Saved: Optimization_Report.txt")

    # 6. Generate JSON data for map update
    map_data = {"territories": []}

    for area in ["West", "Central", "East", "Tucson"]:
        area_accounts = all_accounts[all_accounts["Area"] == area]
        zip_data: list[dict[str, object]] = []

        for zip_code in area_accounts["ZipCode"].unique():
            zip_accounts = area_accounts[area_accounts["ZipCode"] == zip_code]
            zip_data.append(
                {
                    "zip": zip_code,
                    "count": len(zip_accounts),
                    "accounts": zip_accounts[
                        ["Customer_Number__c", "Name", "ShippingStreet"]
                    ].to_dict("records"),
                }
            )

        map_data["territories"].append(
            {
                "area": area,
                "total_accounts": len(area_accounts),
                "zip_codes": zip_data,
            }
        )

    save_json_safe(map_data, output_dir / "map_data.json", "map data")

    print("Saved: map_data.json")

    print("\n" + "=" * 60)
    print("OPTIMIZATION COMPLETE!")
    print(f"All outputs saved to: {output_dir}")
    print("=" * 60)


def run() -> None:
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    run()

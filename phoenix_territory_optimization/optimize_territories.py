
#!/usr/bin/env python3
"""
Territory Optimization Script
Rebalances Phoenix territories and adds Tucson area to achieve target account distributions
"""

import pandas as pd
import numpy as np
from collections import defaultdict
import json

# Load the data files
print("Loading data files...")
phoenix_accounts = pd.read_csv('/home/ubuntu/Uploads/Phoenix Account List 10 29.csv')
tucson_accounts = pd.read_csv('/home/ubuntu/Uploads/Tucson CG Active List.csv')

print(f"Loaded {len(phoenix_accounts)} Phoenix accounts")
print(f"Loaded {len(tucson_accounts)} Tucson accounts")

# Clean zip codes
phoenix_accounts['ZipCode'] = phoenix_accounts['ShippingPostalCode'].astype(str).str.strip().str[:5]
tucson_accounts['ZipCode'] = tucson_accounts['ShippingPostalCode'].astype(str).str.strip().str[:5]

# Identify Tucson peripheral areas (these go to Phoenix East)
PERIPHERAL_CITIES = ['CASA GRANDE', 'MARICOPA', 'SAN TAN VALLEY', 'COOLIDGE', 'ELOY', 
                     'ARIZONA CITY', 'STANFIELD', 'RED ROCK']

tucson_accounts['City_Upper'] = tucson_accounts['ShippingCity'].fillna('').str.upper().str.strip()
peripheral_accounts = tucson_accounts[tucson_accounts['City_Upper'].isin(PERIPHERAL_CITIES)].copy()
true_tucson_accounts = tucson_accounts[~tucson_accounts['City_Upper'].isin(PERIPHERAL_CITIES)].copy()

print(f"\nSplit Tucson accounts:")
print(f"  - Peripheral areas (to Phoenix East): {len(peripheral_accounts)}")
print(f"  - True Tucson: {len(true_tucson_accounts)}")

# Load previous Phoenix consolidation to get current assignments
print("\nLoading previous Phoenix territory assignments...")
prev_analysis = pd.read_excel('/home/ubuntu/Uploads/SJ Proposed Phoenix Branch Analysis By Zip Code (1).xlsx', 
                               sheet_name='#3 - Analysis by Zip Code')

# Get current zip code assignments
zip_assignments = {}
for _, row in prev_analysis.iterrows():
    zip_code = str(row['ShippingPostalCode']).strip()
    area = row['ProposedBranch']
    if pd.notna(zip_code) and pd.notna(area) and zip_code not in ['nan', '']:
        # Map branch names to areas (Branch 1 -> Central, Branches 10, 11 -> East, rest -> West)
        if area == 'Branch 1':
            area = 'Central'
        elif area in ['Branch 10', 'Branch 11']:
            area = 'East'
        elif area in ['Branch 2', 'Branch 3', 'Branch 4', 'Branch 5', 'Branch 6', 'Branch 7', 'Branch 8', 'Branch 9']:
            area = 'West'
        else:
            area = 'West'  # Default
        
        zip_assignments[zip_code] = area

# Count accounts by zip code for Phoenix
phoenix_zip_counts = phoenix_accounts.groupby('ZipCode').size().to_dict()

# Count peripheral accounts by zip code
peripheral_zip_counts = peripheral_accounts.groupby('ZipCode').size().to_dict()

# Combine Phoenix and peripheral for optimization
combined_zip_counts = {}
for zip_code, count in phoenix_zip_counts.items():
    combined_zip_counts[zip_code] = count
for zip_code, count in peripheral_zip_counts.items():
    combined_zip_counts[zip_code] = combined_zip_counts.get(zip_code, 0) + count

# Current distribution
current_dist = {'West': 0, 'Central': 0, 'East': 0}
for zip_code, count in combined_zip_counts.items():
    area = zip_assignments.get(zip_code, 'East')  # Default peripheral to East
    if area in current_dist:
        current_dist[area] += count

print(f"\nCurrent distribution (Phoenix + Peripheral):")
print(f"  West: {current_dist['West']} accounts")
print(f"  Central: {current_dist['Central']} accounts")
print(f"  East: {current_dist['East']} accounts")
print(f"  Total: {sum(current_dist.values())} accounts")

# Target distribution
targets = {'West': 510, 'Central': 546, 'East': 585}
print(f"\nTarget distribution:")
print(f"  West: {targets['West']} accounts")
print(f"  Central: {targets['Central']} accounts")
print(f"  East: {targets['East']} accounts")
print(f"  Total: {sum(targets.values())} accounts")

# Calculate gaps
gaps = {area: targets[area] - current_dist[area] for area in targets}
print(f"\nGaps to fill:")
for area, gap in gaps.items():
    print(f"  {area}: {gap:+d} accounts")

# Optimization: Move zip codes to achieve targets
# Strategy: Move entire zip codes between areas to minimize moves while hitting targets

def calculate_distribution(assignments, zip_counts):
    """Calculate account distribution given zip assignments"""
    dist = {'West': 0, 'Central': 0, 'East': 0}
    for zip_code, count in zip_counts.items():
        area = assignments.get(zip_code, 'East')
        if area in dist:
            dist[area] += count
    return dist

def calculate_score(dist, targets):
    """Calculate how far we are from targets (lower is better)"""
    return sum(abs(dist[area] - targets[area]) for area in targets)

# Start with current assignments
optimized_assignments = zip_assignments.copy()

# Get movable zip codes grouped by current area and size
movable_zips = {}
for area in ['West', 'Central', 'East']:
    movable_zips[area] = [(zip_code, combined_zip_counts[zip_code]) 
                          for zip_code in combined_zip_counts 
                          if optimized_assignments.get(zip_code) == area]
    movable_zips[area].sort(key=lambda x: x[1])  # Sort by size

# Simple optimization: Move zip codes to minimize distance from targets
print("\nOptimizing assignments...")
max_iterations = 1000
best_score = calculate_score(current_dist, targets)
best_assignments = optimized_assignments.copy()

for iteration in range(max_iterations):
    # Try moving a zip code from areas with surplus to areas with deficit
    improved = False
    
    for from_area in ['West', 'Central', 'East']:
        current = calculate_distribution(optimized_assignments, combined_zip_counts)
        if current[from_area] <= targets[from_area]:
            continue  # This area needs more, not less
            
        for to_area in ['West', 'Central', 'East']:
            if from_area == to_area:
                continue
            if current[to_area] >= targets[to_area]:
                continue  # This area has enough
            
            # Find best zip to move
            candidates = [(z, c) for z, c in movable_zips[from_area] 
                         if optimized_assignments.get(z) == from_area]
            
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
                    print(f"  Moved zip {zip_code} ({count} accounts) from {from_area} to {to_area}")
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
print(f"\nFinal optimized distribution:")
print(f"  West: {final_dist['West']} accounts (target: {targets['West']}, diff: {final_dist['West'] - targets['West']:+d})")
print(f"  Central: {final_dist['Central']} accounts (target: {targets['Central']}, diff: {final_dist['Central'] - targets['Central']:+d})")
print(f"  East: {final_dist['East']} accounts (target: {targets['East']}, diff: {final_dist['East'] - targets['East']:+d})")
print(f"  Total: {sum(final_dist.values())} accounts")

# Assign each account to its area
print("\nAssigning accounts to areas...")

# Phoenix accounts
phoenix_accounts['Area'] = phoenix_accounts['ZipCode'].map(best_assignments)
phoenix_accounts['Area'] = phoenix_accounts['Area'].fillna('East')  # Default to East

# Peripheral accounts (all go to East)
peripheral_accounts['Area'] = 'East'
peripheral_accounts['Source'] = 'Tucson (Peripheral)'

# True Tucson accounts
true_tucson_accounts['Area'] = 'Tucson'
true_tucson_accounts['Source'] = 'Tucson'

# Phoenix source
phoenix_accounts['Source'] = 'Phoenix'

# Create final combined account list
print("\nCreating final account assignments...")

# Select key columns for output
phoenix_final = phoenix_accounts[['Customer_Number__c', 'Name', 'ShippingStreet', 
                                   'ShippingStateCode', 'ShippingPostalCode', 'ZipCode',
                                   'Area', 'Source']].copy()

peripheral_final = peripheral_accounts[['Customer_Number__c', 'Name', 'ShippingStreet',
                                        'ShippingCity', 'ShippingPostalCode', 'ZipCode',
                                        'Area', 'Source']].copy()
peripheral_final['ShippingStateCode'] = 'AZ'

tucson_final = true_tucson_accounts[['Customer_Number__c', 'Name', 'ShippingStreet',
                                      'ShippingCity', 'ShippingPostalCode', 'ZipCode',
                                      'Area', 'Source']].copy()
tucson_final['ShippingStateCode'] = 'AZ'

# Standardize columns
for df in [phoenix_final, peripheral_final, tucson_final]:
    if 'ShippingCity' not in df.columns:
        df['ShippingCity'] = ''

# Combine all accounts
all_accounts = pd.concat([phoenix_final, peripheral_final, tucson_final], ignore_index=True)

print(f"\nFinal account distribution:")
print(all_accounts.groupby('Area').size())

# Save outputs
output_dir = '/home/ubuntu/phoenix_territory_optimization/outputs'
import os
os.makedirs(output_dir, exist_ok=True)

# 1. All accounts with area assignments
all_accounts.to_csv(f'{output_dir}/All_Accounts_with_Area_Assignments.csv', index=False)
print(f"\nSaved: All_Accounts_with_Area_Assignments.csv ({len(all_accounts)} accounts)")

# 2. Summary by area
summary = all_accounts.groupby('Area').agg({
    'Customer_Number__c': 'count',
    'ZipCode': 'nunique'
}).rename(columns={'Customer_Number__c': 'Account_Count', 'ZipCode': 'Unique_Zip_Codes'})
summary.to_csv(f'{output_dir}/Territory_Summary.csv')
print(f"Saved: Territory_Summary.csv")

# 3. Zip code assignments for map
zip_area_map = []
for area in ['West', 'Central', 'East', 'Tucson']:
    area_accounts = all_accounts[all_accounts['Area'] == area]
    zip_counts = area_accounts.groupby('ZipCode').size().to_dict()
    
    for zip_code, count in zip_counts.items():
        zip_area_map.append({
            'Zip Code': zip_code,
            'Area': area,
            'Account Count': count
        })

zip_area_df = pd.DataFrame(zip_area_map)
zip_area_df.to_csv(f'{output_dir}/Zip_Code_Area_Assignments.csv', index=False)
print(f"Saved: Zip_Code_Area_Assignments.csv ({len(zip_area_df)} zip codes)")

# 4. Changes from original assignments
changes = []
for zip_code in set(list(zip_assignments.keys()) + list(best_assignments.keys())):
    old_area = zip_assignments.get(zip_code, 'N/A')
    new_area = best_assignments.get(zip_code, 'N/A')
    if old_area != new_area:
        count = combined_zip_counts.get(zip_code, 0)
        changes.append({
            'Zip Code': zip_code,
            'Previous Area': old_area,
            'New Area': new_area,
            'Accounts Moved': count
        })

if changes:
    changes_df = pd.DataFrame(changes)
    changes_df.to_csv(f'{output_dir}/Territory_Changes.csv', index=False)
    print(f"Saved: Territory_Changes.csv ({len(changes)} zip codes changed)")

# 5. Detailed summary report
with open(f'{output_dir}/Optimization_Report.txt', 'w') as f:
    f.write("PHOENIX TERRITORY OPTIMIZATION REPORT\n")
    f.write("=" * 60 + "\n\n")
    
    f.write("OBJECTIVE:\n")
    f.write("  Rebalance Phoenix territories to achieve target account distribution\n")
    f.write("  and integrate Tucson as a separate 4th area.\n\n")
    
    f.write("TARGET DISTRIBUTION:\n")
    f.write(f"  West: {targets['West']} accounts\n")
    f.write(f"  Central: {targets['Central']} accounts\n")
    f.write(f"  East: {targets['East']} accounts (includes peripheral Tucson areas)\n")
    f.write(f"  Tucson: All true Tucson accounts\n\n")
    
    f.write("FINAL RESULTS:\n")
    for area in ['West', 'Central', 'East', 'Tucson']:
        count = len(all_accounts[all_accounts['Area'] == area])
        zips = all_accounts[all_accounts['Area'] == area]['ZipCode'].nunique()
        f.write(f"  {area}:\n")
        f.write(f"    Accounts: {count}\n")
        f.write(f"    Zip Codes: {zips}\n")
        if area != 'Tucson':
            target = targets[area]
            diff = count - target
            f.write(f"    Target: {target}\n")
            f.write(f"    Variance: {diff:+d} ({diff/target*100:+.1f}%)\n")
        f.write("\n")
    
    f.write(f"TOTAL ACCOUNTS: {len(all_accounts)}\n\n")
    
    f.write("CHANGES MADE:\n")
    if changes:
        for change in changes:
            f.write(f"  Zip {change['Zip Code']}: {change['Previous Area']} → {change['New Area']} ")
            f.write(f"({change['Accounts Moved']} accounts)\n")
    else:
        f.write("  No zip codes moved (already optimized)\n")

print(f"Saved: Optimization_Report.txt")

# 6. Generate JSON data for map update
map_data = {
    'territories': []
}

for area in ['West', 'Central', 'East', 'Tucson']:
    area_accounts = all_accounts[all_accounts['Area'] == area]
    zip_data = []
    
    for zip_code in area_accounts['ZipCode'].unique():
        zip_accounts = area_accounts[area_accounts['ZipCode'] == zip_code]
        zip_data.append({
            'zip': zip_code,
            'count': len(zip_accounts),
            'accounts': zip_accounts[['Customer_Number__c', 'Name', 'ShippingStreet']].to_dict('records')
        })
    
    map_data['territories'].append({
        'area': area,
        'total_accounts': len(area_accounts),
        'zip_codes': zip_data
    })

with open(f'{output_dir}/map_data.json', 'w') as f:
    json.dump(map_data, f, indent=2)

print(f"Saved: map_data.json")

print("\n" + "=" * 60)
print("OPTIMIZATION COMPLETE!")
print(f"All outputs saved to: {output_dir}")
print("=" * 60)

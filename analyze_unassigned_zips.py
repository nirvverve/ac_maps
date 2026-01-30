"""
Analyze unassigned ZIP codes and recommend branch assignments
"""

import pandas as pd
import numpy as np

# Load unassigned ZIP codes
df_unassigned = pd.read_csv('/home/ubuntu/unassigned_zip_codes.csv')
df_unassigned = df_unassigned[df_unassigned['ZIP_Code'] != 'nan']  # Remove invalid ZIPs

print("=" * 80)
print("UNASSIGNED ZIP CODE ANALYSIS & RECOMMENDATIONS")
print("=" * 80)

# Manual analysis based on Phoenix metro geography and existing branch territories
# This is based on geographic knowledge of Phoenix area ZIP codes

zip_recommendations = {
    # North Scottsdale area ZIPs
    '85254': {'branch_id': 1, 'branch_name': 'North Scottsdale', 'reason': 'North Scottsdale adjacent area'},
    '85257': {'branch_id': 2, 'branch_name': 'Central Scottsdale / PV', 'reason': 'Central Scottsdale adjacent'},
    '85256': {'branch_id': 2, 'branch_name': 'Central Scottsdale / PV', 'reason': 'Central Scottsdale/PV area'},
    
    # North Phoenix I-17 corridor
    '85024': {'branch_id': 3, 'branch_name': 'North Phoenix I-17', 'reason': 'North Central Phoenix near I-17'},
    '85028': {'branch_id': 3, 'branch_name': 'North Phoenix I-17', 'reason': 'North Phoenix near I-17 corridor'},
    '85032': {'branch_id': 3, 'branch_name': 'North Phoenix I-17', 'reason': 'North Phoenix I-17 corridor'},
    
    # West Valley ZIPs
    '85037': {'branch_id': 6, 'branch_name': 'Glendale / West PHX', 'reason': 'West Phoenix area'},
    '85353': {'branch_id': 5, 'branch_name': 'Peoria / Surprise North', 'reason': 'Surprise/Sun City area'},
    '85388': {'branch_id': 5, 'branch_name': 'Peoria / Surprise North', 'reason': 'Surprise/El Mirage area'},
    '85335': {'branch_id': 7, 'branch_name': 'Southwest Valley / Laveen', 'reason': 'Southwest Valley area'},
    '85307': {'branch_id': 6, 'branch_name': 'Glendale / West PHX', 'reason': 'West Glendale area'},
    '85355': {'branch_id': 7, 'branch_name': 'Southwest Valley / Laveen', 'reason': 'Southwest/Goodyear area'},
    '85378': {'branch_id': 5, 'branch_name': 'Peoria / Surprise North', 'reason': 'North Peoria/Sun City area'},
    '85387': {'branch_id': 7, 'branch_name': 'Southwest Valley / Laveen', 'reason': 'Buckeye/Southwest area'},
    
    # East Valley ZIPs  
    '85045': {'branch_id': 8, 'branch_name': 'Tempe / Chandler West', 'reason': 'Tempe/Chandler area'},
    '85212': {'branch_id': 10, 'branch_name': 'Mesa Central / Gilbert East', 'reason': 'Central Mesa area'},
    '85248': {'branch_id': 9, 'branch_name': 'Chandler / Gilbert South', 'reason': 'South Chandler area'},
    '85268': {'branch_id': 1, 'branch_name': 'North Scottsdale', 'reason': 'North Scottsdale/Fountain Hills area'},
    '85236': {'branch_id': 9, 'branch_name': 'Chandler / Gilbert South', 'reason': 'South Chandler area'},
}

# Create recommendations dataframe
recommendations = []
for idx, row in df_unassigned.iterrows():
    try:
        zip_code = str(int(float(row['ZIP_Code'])))  # Convert from float to string
    except (ValueError, TypeError):
        continue  # Skip invalid ZIP codes
    
    if zip_code in zip_recommendations:
        rec = zip_recommendations[zip_code]
        recommendations.append({
            'ZIP_Code': zip_code,
            'Total_Accounts': row['Total_Accounts'],
            'Current_Active': row['Current_Active'],
            'Terminated': row['Terminated'],
            'Recommended_Branch_ID': rec['branch_id'],
            'Recommended_Branch_Name': rec['branch_name'],
            'Reasoning': rec['reason']
        })
    else:
        recommendations.append({
            'ZIP_Code': zip_code,
            'Total_Accounts': row['Total_Accounts'],
            'Current_Active': row['Current_Active'],
            'Terminated': row['Terminated'],
            'Recommended_Branch_ID': 'NEEDS_REVIEW',
            'Recommended_Branch_Name': 'NEEDS_REVIEW',
            'Reasoning': 'Requires geographic review'
        })

df_recommendations = pd.DataFrame(recommendations)
df_recommendations = df_recommendations.sort_values('Total_Accounts', ascending=False)

# Save recommendations
df_recommendations.to_csv('/home/ubuntu/zip_code_recommendations.csv', index=False)

print(f"\nTotal unassigned ZIP codes: {len(df_recommendations)}")
print(f"ZIP codes with recommendations: {len(df_recommendations[df_recommendations['Recommended_Branch_ID'] != 'NEEDS_REVIEW'])}")
print(f"ZIP codes needing review: {len(df_recommendations[df_recommendations['Recommended_Branch_ID'] == 'NEEDS_REVIEW'])}")

print("\n" + "-" * 80)
print("TOP UNASSIGNED ZIP CODES WITH RECOMMENDATIONS:")
print("-" * 80)
print(df_recommendations.head(15).to_string(index=False))

# Calculate impact of adding unassigned ZIPs to branches
print("\n" + "=" * 80)
print("IMPACT ANALYSIS: Adding Unassigned ZIP Codes to Branches")
print("=" * 80)

impact_by_branch = df_recommendations[df_recommendations['Recommended_Branch_ID'] != 'NEEDS_REVIEW'].groupby(
    'Recommended_Branch_Name').agg({
        'Current_Active': 'sum',
        'Terminated': 'sum',
        'Total_Accounts': 'sum'
    }).sort_values('Total_Accounts', ascending=False)

print("\nAdditional accounts to be added to each branch:")
print(impact_by_branch.to_string())

# Load existing branch stats and recalculate with assignments
df_branch_stats = pd.read_csv('/home/ubuntu/branch_statistics.csv')

# Add the unassigned accounts to branch stats
for idx, row in df_recommendations.iterrows():
    if row['Recommended_Branch_ID'] != 'NEEDS_REVIEW':
        branch_id = row['Recommended_Branch_ID']
        branch_idx = df_branch_stats[df_branch_stats['Branch_ID'] == branch_id].index[0]
        
        df_branch_stats.at[branch_idx, 'Current_Accounts'] += row['Current_Active']
        df_branch_stats.at[branch_idx, 'Terminated_Accounts'] += row['Terminated']
        df_branch_stats.at[branch_idx, 'Total_Historical_Accounts'] += row['Total_Accounts']

# Recalculate retention rates
df_branch_stats['Retention_Rate_%'] = (
    df_branch_stats['Current_Accounts'] / df_branch_stats['Total_Historical_Accounts']
) * 100
df_branch_stats['Retention_Rate_%'] = df_branch_stats['Retention_Rate_%'].round(2)

df_branch_stats['Market_Penetration_%'] = (
    df_branch_stats['Current_Accounts'] / df_branch_stats['Market_Potential']
) * 100
df_branch_stats['Market_Penetration_%'] = df_branch_stats['Market_Penetration_%'].round(2)

# Save updated stats
df_branch_stats.to_csv('/home/ubuntu/branch_statistics_with_assignments.csv', index=False)

print("\n" + "=" * 80)
print("UPDATED BRANCH STATISTICS (With Unassigned ZIP Code Assignments)")
print("=" * 80)
print(df_branch_stats[['Branch_Name', 'Current_Accounts', 'Terminated_Accounts', 
                       'Retention_Rate_%', 'Total_Historical_Accounts']].to_string(index=False))

print("\n✓ Saved: zip_code_recommendations.csv")
print("✓ Saved: branch_statistics_with_assignments.csv")

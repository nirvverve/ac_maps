import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json

# Load the data
file_path = '/home/ubuntu/Uploads/SJ Proposed Phoenix Branch Analysis By Zip Code (1).xlsx'

# Disable truncation
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)

# Load all sheets
df_active = pd.read_excel(file_path, sheet_name='#1 - Active Current Accounts')
df_terminated = pd.read_excel(file_path, sheet_name='#2 - Terminated Accounts')
df_analysis = pd.read_excel(file_path, sheet_name='#3 - Analysis by Zip Code')

print("="*100)
print("PHOENIX BRANCH CONSOLIDATION ANALYSIS")
print("3-Branch Structure (West, Central, East)")
print("="*100)

# Define the optimal consolidation mapping (Option 7)
consolidation_map = {
    # West Valley
    'Branch 5 - Peoria/Surprise North': 'West',
    'Branch 6 - Glendale/West PHX': 'West',
    'Branch 7 - Southwest Valley/Laveen': 'West',
    'Branch 10 - Mesa Central/Gilbert East': 'West',  # Geographic flexibility
    
    # Central Phoenix/Scottsdale
    'Branch 2 - Central Scottsdale/PV': 'Central',
    'Branch 3 - North Phoenix I-17': 'Central',
    'Branch 4 - Central PHX/South': 'Central',
    'Branch 11 - Mesa East/Pinal Outliers': 'Central',  # Outliers - flexible assignment
    
    # East Valley
    'Branch 1 - North Scottsdale': 'East',
    'Branch 8 - Tempe/Chandler West': 'East',
    'Branch 9 - Chandler/Gilbert South': 'East'
}

# Apply the mapping
df_analysis['New3BranchStructure'] = df_analysis['ProposedBranch'].map(consolidation_map)

# ============================================================================
# 1. CURRENT 11-TERRITORY STRUCTURE ANALYSIS
# ============================================================================
print("\n" + "="*100)
print("1. CURRENT 11-TERRITORY STRUCTURE")
print("="*100)

branch_11_summary = df_analysis.groupby('ProposedBranch').agg({
    'ActiveAccounts': 'sum',
    'TerminatedAccounts': 'sum',
    'LostRevenue': 'sum',
    'TotalHistorical': 'sum',
    'ShippingPostalCode': 'count'
}).round(2)

branch_11_summary.rename(columns={'ShippingPostalCode': 'ZipCodeCount'}, inplace=True)
branch_11_summary['5YR Churn Rate'] = (branch_11_summary['TerminatedAccounts'] / branch_11_summary['TotalHistorical'] * 100).round(2)
branch_11_summary['AvgLostRevenuePerAccount'] = (branch_11_summary['LostRevenue'] / branch_11_summary['TerminatedAccounts']).round(2)

branch_11_summary = branch_11_summary[['ActiveAccounts', 'TerminatedAccounts', 'TotalHistorical', '5YR Churn Rate', 'LostRevenue', 'AvgLostRevenuePerAccount', 'ZipCodeCount']]
branch_11_summary = branch_11_summary.sort_values('ActiveAccounts', ascending=False)

print("\n11-Branch Summary Statistics:")
print(branch_11_summary)

print(f"\nTotal Active Accounts: {df_analysis['ActiveAccounts'].sum():,}")
print(f"Total Terminated Accounts: {df_analysis['TerminatedAccounts'].sum():,}")
print(f"Total Historical Accounts: {df_analysis['TotalHistorical'].sum():,}")
print(f"Overall 5YR Churn Rate: {(df_analysis['TerminatedAccounts'].sum() / df_analysis['TotalHistorical'].sum() * 100):.2f}%")
print(f"Total Lost Revenue: ${df_analysis['LostRevenue'].sum():,.2f}")

# ============================================================================
# 2. PROPOSED 3-BRANCH CONSOLIDATION
# ============================================================================
print("\n" + "="*100)
print("2. PROPOSED 3-BRANCH CONSOLIDATION (RECOMMENDED)")
print("="*100)

new_branch_summary = df_analysis.groupby('New3BranchStructure').agg({
    'ActiveAccounts': 'sum',
    'TerminatedAccounts': 'sum',
    'LostRevenue': 'sum',
    'TotalHistorical': 'sum',
    'ShippingPostalCode': 'count'
}).round(2)

new_branch_summary.rename(columns={'ShippingPostalCode': 'ZipCodeCount'}, inplace=True)
new_branch_summary['5YR Churn Rate'] = (new_branch_summary['TerminatedAccounts'] / new_branch_summary['TotalHistorical'] * 100).round(2)
new_branch_summary['AvgLostRevenuePerAccount'] = (new_branch_summary['LostRevenue'] / new_branch_summary['TerminatedAccounts']).round(2)

new_branch_summary = new_branch_summary[['ActiveAccounts', 'TerminatedAccounts', 'TotalHistorical', '5YR Churn Rate', 'LostRevenue', 'AvgLostRevenuePerAccount', 'ZipCodeCount']]

print("\n3-Branch Summary Statistics:")
print(new_branch_summary)

# Balance analysis
target = df_analysis['ActiveAccounts'].sum() / 3
print("\n" + "="*100)
print("BALANCE ANALYSIS:")
print(f"Target Active Accounts per Branch: {target:.0f}")
print("="*100)
for branch in new_branch_summary.index:
    count = new_branch_summary.loc[branch, 'ActiveAccounts']
    diff = count - target
    pct_diff = (diff / target * 100)
    print(f"{branch:10} : {count:4} accounts  (Diff: {diff:+.0f}, {pct_diff:+.1f}%)")

# ============================================================================
# 3. CONSOLIDATION MAPPING DETAIL
# ============================================================================
print("\n" + "="*100)
print("3. DETAILED CONSOLIDATION MAPPING")
print("="*100)

for new_branch in ['West', 'Central', 'East']:
    print(f"\n{new_branch.upper()} BRANCH:")
    print("-" * 80)
    branch_total = 0
    for old_branch, mapped_branch in sorted(consolidation_map.items()):
        if mapped_branch == new_branch:
            accounts = df_analysis[df_analysis['ProposedBranch'] == old_branch]['ActiveAccounts'].sum()
            zip_count = df_analysis[df_analysis['ProposedBranch'] == old_branch].shape[0]
            churn = df_analysis[df_analysis['ProposedBranch'] == old_branch]['5YR Churn Rate'].mean()
            print(f"  {old_branch:50} {accounts:4} accounts, {zip_count:3} zips, {churn:.1f}% churn")
            branch_total += accounts
    print(f"  {'TOTAL':50} {branch_total:4} accounts")

# ============================================================================
# 4. RETENTION PATTERN ANALYSIS
# ============================================================================
print("\n" + "="*100)
print("4. RETENTION PATTERN ANALYSIS BY NEW BRANCH")
print("="*100)

retention_analysis = df_analysis.groupby('New3BranchStructure').agg({
    '5YR Churn Rate': 'mean',
    'ActiveAccounts': 'sum',
    'TerminatedAccounts': 'sum',
    'LostRevenue': 'sum'
}).round(2)

retention_analysis['Retention Rate'] = (100 - retention_analysis['5YR Churn Rate']).round(2)
retention_analysis['Avg Lost Revenue Per Terminated'] = (retention_analysis['LostRevenue'] / retention_analysis['TerminatedAccounts']).round(2)

print(retention_analysis)

print("\n" + "="*100)
print("RETENTION INSIGHTS:")
print("="*100)
best_retention_branch = retention_analysis['Retention Rate'].idxmax()
worst_retention_branch = retention_analysis['Retention Rate'].idxmin()
print(f"Best Retention: {best_retention_branch} ({retention_analysis.loc[best_retention_branch, 'Retention Rate']:.2f}%)")
print(f"Worst Retention: {worst_retention_branch} ({retention_analysis.loc[worst_retention_branch, 'Retention Rate']:.2f}%)")
print(f"\nRetention Improvement Opportunity: {retention_analysis.loc[worst_retention_branch, 'Retention Rate'] - retention_analysis.loc[best_retention_branch, 'Retention Rate']:.2f} percentage points")

# Save data for visualizations
consolidation_data = {
    'branch_11_summary': branch_11_summary.to_dict(),
    'new_branch_summary': new_branch_summary.to_dict(),
    'consolidation_map': consolidation_map,
    'df_analysis': df_analysis.to_dict('records')
}

with open('/home/ubuntu/consolidation_data.json', 'w') as f:
    json.dump(consolidation_data, f, default=str)

print("\n" + "="*100)
print("Analysis complete! Data saved for visualization generation.")
print("="*100)

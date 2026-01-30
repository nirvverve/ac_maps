import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json

# Disable truncation
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

# Load the data
df = pd.read_csv('/home/ubuntu/Uploads/Tucson CG List Active and InActive.csv')

# Clean ZIP codes - remove any extensions (like -6121)
df['ZIP_Clean'] = df['ShippingPostalCode'].astype(str).str.split('-').str[0]

# Define the proposed branch territories from the PDF
branch_territories = {
    'Branch 1 - Tucson East & North (Foothills)': [
        '85718', '85749', '85750', '85710', '85748', 
        '85730', '85715', '85711'
    ],
    'Branch 2 - Tucson West & Central (Urban & Growth)': [
        '85737', '85704', '85742', '85745', '85743', 
        '85741', '85712', '85755', '85719', '85716', '85705'
    ]
}

# Create a reverse mapping for easy lookup
zip_to_branch = {}
for branch, zips in branch_territories.items():
    for zip_code in zips:
        zip_to_branch[zip_code] = branch

# Assign branch to each account
df['Proposed_Branch'] = df['ZIP_Clean'].map(zip_to_branch)

# Separate active and terminated accounts
df_active = df[df['Status'] == 'Active'].copy()
df_terminated = df[df['Status'] == 'Expired'].copy()

# Identify unassigned ZIP codes
all_zips_in_data = df['ZIP_Clean'].unique()
assigned_zips = set(zip_to_branch.keys())
unassigned_zips = set(all_zips_in_data) - assigned_zips

print("=" * 80)
print("TUCSON BRANCH DECENTRALIZATION ANALYSIS")
print("=" * 80)

print("\n1. DATA OVERVIEW")
print("-" * 80)
print(f"Total Accounts: {len(df)}")
print(f"  - Active: {len(df_active)} ({len(df_active)/len(df)*100:.1f}%)")
print(f"  - Terminated: {len(df_terminated)} ({len(df_terminated)/len(df)*100:.1f}%)")
print(f"\nOverall Retention Rate: {len(df_active)/(len(df_active)+len(df_terminated))*100:.2f}%")

print("\n2. PROPOSED BRANCH TERRITORIES")
print("-" * 80)
for branch, zips in branch_territories.items():
    print(f"\n{branch}:")
    print(f"  ZIP Codes: {', '.join(zips)}")
    print(f"  Total ZIP Codes: {len(zips)}")

print("\n3. ACCOUNT MAPPING TO PROPOSED BRANCHES")
print("-" * 80)

# Calculate stats by branch
branch_stats = []
for branch in branch_territories.keys():
    active_count = len(df_active[df_active['Proposed_Branch'] == branch])
    terminated_count = len(df_terminated[df_terminated['Proposed_Branch'] == branch])
    total_count = active_count + terminated_count
    
    if total_count > 0:
        retention_rate = (active_count / total_count) * 100
    else:
        retention_rate = 0
    
    active_revenue = df_active[df_active['Proposed_Branch'] == branch]['Sum of xAnnualValue__c'].sum()
    
    branch_stats.append({
        'Branch': branch,
        'Active_Accounts': active_count,
        'Terminated_Accounts': terminated_count,
        'Total_Accounts': total_count,
        'Retention_Rate': retention_rate,
        'Active_Revenue': active_revenue
    })

branch_stats_df = pd.DataFrame(branch_stats)

for idx, row in branch_stats_df.iterrows():
    print(f"\n{row['Branch']}:")
    print(f"  Active Accounts: {row['Active_Accounts']}")
    print(f"  Terminated Accounts: {row['Terminated_Accounts']}")
    print(f"  Total Accounts: {row['Total_Accounts']}")
    print(f"  Retention Rate: {row['Retention_Rate']:.2f}%")
    print(f"  Active Annual Revenue: ${row['Active_Revenue']:,.2f}")

print("\n4. UNASSIGNED ZIP CODES")
print("-" * 80)
print(f"Total Unassigned ZIP Codes: {len(unassigned_zips)}")
print(f"\nUnassigned ZIP Codes: {sorted(unassigned_zips)}")

# Analyze unassigned ZIP codes
unassigned_analysis = []
for zip_code in sorted(unassigned_zips):
    df_zip = df[df['ZIP_Clean'] == zip_code]
    active_count = len(df_zip[df_zip['Status'] == 'Active'])
    terminated_count = len(df_zip[df_zip['Status'] == 'Expired'])
    total_count = len(df_zip)
    city = df_zip['ShippingCity'].mode().iloc[0] if len(df_zip) > 0 else 'Unknown'
    
    unassigned_analysis.append({
        'ZIP': zip_code,
        'City': city,
        'Active': active_count,
        'Terminated': terminated_count,
        'Total': total_count
    })

unassigned_df = pd.DataFrame(unassigned_analysis)
print("\nUnassigned ZIP Code Details:")
print(unassigned_df.to_string(index=False))

print("\n5. RETENTION ANALYSIS BY ZIP CODE (ASSIGNED ZIPS ONLY)")
print("-" * 80)

zip_retention = []
for branch, zips in branch_territories.items():
    for zip_code in zips:
        df_zip = df[df['ZIP_Clean'] == zip_code]
        active_count = len(df_zip[df_zip['Status'] == 'Active'])
        terminated_count = len(df_zip[df_zip['Status'] == 'Expired'])
        total_count = active_count + terminated_count
        
        if total_count > 0:
            retention_rate = (active_count / total_count) * 100
        else:
            retention_rate = 0
        
        zip_retention.append({
            'Branch': branch,
            'ZIP': zip_code,
            'Active': active_count,
            'Terminated': terminated_count,
            'Total': total_count,
            'Retention_Rate': retention_rate
        })

zip_retention_df = pd.DataFrame(zip_retention)
zip_retention_df = zip_retention_df.sort_values('Retention_Rate')

# Show top 10 lowest retention ZIP codes
print("\nTOP 10 LOWEST RETENTION ZIP CODES (High Risk):")
low_retention = zip_retention_df[zip_retention_df['Total'] > 0].head(10)
print(low_retention.to_string(index=False))

# Show top 10 highest retention ZIP codes
print("\nTOP 10 HIGHEST RETENTION ZIP CODES:")
high_retention = zip_retention_df[zip_retention_df['Total'] > 0].tail(10)
print(high_retention.to_string(index=False))

print("\n6. BRANCH BALANCE ANALYSIS")
print("-" * 80)
print("\nAccount Distribution Comparison:")
for idx, row in branch_stats_df.iterrows():
    pct_of_total = (row['Total_Accounts'] / branch_stats_df['Total_Accounts'].sum()) * 100
    print(f"{row['Branch']}: {row['Total_Accounts']} accounts ({pct_of_total:.1f}% of assigned accounts)")

# Save data for visualizations
branch_stats_df.to_csv('/home/ubuntu/tucson_branch_stats.csv', index=False)
zip_retention_df.to_csv('/home/ubuntu/tucson_zip_retention.csv', index=False)
unassigned_df.to_csv('/home/ubuntu/tucson_unassigned_zips.csv', index=False)

# Save mapping of all accounts
df[['Customer_Number__c', 'Name', 'ShippingCity', 'ZIP_Clean', 'Status', 
    'Proposed_Branch', 'Sum of xAnnualValue__c']].to_csv(
    '/home/ubuntu/tucson_account_mapping.csv', index=False)

print("\n" + "=" * 80)
print("Data files saved for visualization creation")
print("=" * 80)


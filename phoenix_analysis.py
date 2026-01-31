"""
Phoenix Branch Reorganization Strategic Analysis
Comprehensive analysis of proposed 11-branch structure
"""

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json
from collections import defaultdict

# Disable pandas truncation
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

print("=" * 80)
print("PHOENIX BRANCH REORGANIZATION - STRATEGIC ANALYSIS")
print("=" * 80)

# Define the 11 proposed branches with their zip code assignments
# Extracted from Phoenix Branch Breakout.docx

branches = {
    1: {
        'name': 'North Scottsdale',
        'zips': ['85255', '85259', '85260', '85262', '85266', '85331', '85377', '85263', '85252'],
        'market_potential': 22970
    },
    2: {
        'name': 'Central Scottsdale / PV',
        'zips': ['85250', '85251', '85258', '85253', '85018', '85016'],
        'market_potential': 17675
    },
    3: {
        'name': 'North Phoenix I-17',
        'zips': ['85086', '85087', '85085', '85083', '85022', '85027', '85050', '85054'],
        'market_potential': 18769
    },
    4: {
        'name': 'Central PHX / South',
        'zips': ['85012', '85013', '85014', '85020', '85021', '85023', '85029', '85002', 
                 '85003', '85004', '85006', '85007', '85008', '85009', '85015', '85017', 
                 '85019', '85031', '85033', '85034', '85035', '85040', '85041', '85042', '85043'],
        'market_potential': 28591
    },
    5: {
        'name': 'Peoria / Surprise North',
        'zips': ['85383', '85382', '85374', '85379', '85381', '85375', '85351', '85373', '85345'],
        'market_potential': 18582
    },
    6: {
        'name': 'Glendale / West PHX',
        'zips': ['85308', '85304', '85306', '85310', '85302', '85301', '85303', '85305', 
                 '85318', '85051', '85053'],
        'market_potential': 21114
    },
    7: {
        'name': 'Southwest Valley / Laveen',
        'zips': ['85338', '85395', '85340', '85323', '85392', '85326', '85396', '85339'],
        'market_potential': 18485
    },
    8: {
        'name': 'Tempe / Chandler West',
        'zips': ['85281', '85282', '85283', '85284', '85288', '85224', '85044', '85048', 
                 '85286', '85246', '85201', '85202'],
        'market_potential': 23191
    },
    9: {
        'name': 'Chandler / Gilbert South',
        'zips': ['85225', '85226', '85249', '85233', '85234', '85295'],
        'market_potential': 24181
    },
    10: {
        'name': 'Mesa Central / Gilbert East',
        'zips': ['85296', '85297', '85298', '85203', '85204', '85205', '85209', '85210', 
                 '85213', '85215', '85274', '85277'],
        'market_potential': 25488
    },
    11: {
        'name': 'Mesa East / Pinal Outliers',
        'zips': ['85206', '85207', '85208', '85118', '85119', '85120', '85142', '85143', 
                 '85140', '85132', '85122', '85193', '85194', '85138', '85139', '85128', 
                 '85131', '85144', '85211', '85214'],
        'market_potential': 17589
    }
}

# Create a reverse mapping: zip -> branch_id
zip_to_branch = {}
for branch_id, info in branches.items():
    for zip_code in info['zips']:
        zip_to_branch[zip_code] = branch_id

print(f"\n✓ Loaded {len(branches)} proposed branches")
print(f"✓ Total ZIP codes assigned: {len(zip_to_branch)}")

# Load current residential data
print("\n" + "=" * 80)
print("LOADING DATA FILES")
print("=" * 80)

df_current = pd.read_excel('/home/ubuntu/Uploads/Residential Data for Phoenix.xlsx')
print(f"\n✓ Current active accounts: {len(df_current)}")

# Clean zip codes (remove any trailing decimals or spaces, ensure 5 digits)
df_current['ShippingPostalCode'] = df_current['ShippingPostalCode'].astype(str).str.strip()
df_current['ShippingPostalCode'] = df_current['ShippingPostalCode'].str[:5]

# Load terminated accounts data
df_terminated = pd.read_excel('/home/ubuntu/Uploads/Terminated Contract Data for Phoenix.xlsx')
print(f"✓ Terminated accounts: {len(df_terminated)}")

# Clean zip codes
df_terminated['ShippingPostalCode'] = df_terminated['ShippingPostalCode'].astype(str).str.strip()
df_terminated['ShippingPostalCode'] = df_terminated['ShippingPostalCode'].str[:5]

# Map accounts to branches
print("\n" + "=" * 80)
print("MAPPING ACCOUNTS TO PROPOSED BRANCHES")
print("=" * 80)

df_current['Proposed_Branch_ID'] = df_current['ShippingPostalCode'].map(zip_to_branch)
df_terminated['Proposed_Branch_ID'] = df_terminated['ShippingPostalCode'].map(zip_to_branch)

# Identify unassigned zip codes
current_unassigned = df_current[df_current['Proposed_Branch_ID'].isna()]
terminated_unassigned = df_terminated[df_terminated['Proposed_Branch_ID'].isna()]

unassigned_zips_current = current_unassigned['ShippingPostalCode'].value_counts()
unassigned_zips_terminated = terminated_unassigned['ShippingPostalCode'].value_counts()
all_unassigned_zips = pd.concat([unassigned_zips_current, unassigned_zips_terminated]).groupby(level=0).sum().sort_values(ascending=False)

print(f"\n⚠ Unassigned ZIP codes in current accounts: {len(unassigned_zips_current)}")
print(f"⚠ Unassigned ZIP codes in terminated accounts: {len(unassigned_zips_terminated)}")
print(f"⚠ Total unique unassigned ZIP codes: {len(all_unassigned_zips)}")
print(f"⚠ Total accounts in unassigned ZIPs: {len(current_unassigned) + len(terminated_unassigned)}")

if len(all_unassigned_zips) > 0:
    print("\nTop unassigned ZIP codes by account volume:")
    print(all_unassigned_zips.head(20))

# Save unassigned zip codes for analysis
unassigned_df = pd.DataFrame({
    'ZIP_Code': all_unassigned_zips.index,
    'Total_Accounts': all_unassigned_zips.values,
    'Current_Active': [unassigned_zips_current.get(z, 0) for z in all_unassigned_zips.index],
    'Terminated': [unassigned_zips_terminated.get(z, 0) for z in all_unassigned_zips.index]
})
unassigned_df.to_csv('/home/ubuntu/unassigned_zip_codes.csv', index=False)
print("\n✓ Saved unassigned ZIP codes to: unassigned_zip_codes.csv")

# Analyze account distribution by proposed branch
print("\n" + "=" * 80)
print("ACCOUNT DISTRIBUTION BY PROPOSED BRANCH")
print("=" * 80)

branch_stats = []

for branch_id in range(1, 12):
    branch_name = branches[branch_id]['name']
    market_potential = branches[branch_id]['market_potential']
    
    # Current accounts
    current_branch = df_current[df_current['Proposed_Branch_ID'] == branch_id]
    current_count = len(current_branch)
    
    # Terminated accounts
    terminated_branch = df_terminated[df_terminated['Proposed_Branch_ID'] == branch_id]
    terminated_count = len(terminated_branch)
    
    # Total accounts (current + terminated)
    total_historical = current_count + terminated_count
    
    # Retention rate
    if total_historical > 0:
        retention_rate = (current_count / total_historical) * 100
    else:
        retention_rate = 0
    
    # Revenue (only for terminated as it has Annual Contract Value)
    terminated_revenue = terminated_branch['Annual Contract Value'].sum()
    
    # Market penetration
    if market_potential > 0:
        penetration_rate = (current_count / market_potential) * 100
    else:
        penetration_rate = 0
    
    branch_stats.append({
        'Branch_ID': branch_id,
        'Branch_Name': branch_name,
        'Market_Potential': market_potential,
        'Current_Accounts': current_count,
        'Terminated_Accounts': terminated_count,
        'Total_Historical_Accounts': total_historical,
        'Retention_Rate_%': round(retention_rate, 2),
        'Lost_Revenue_Annual': terminated_revenue,
        'Market_Penetration_%': round(penetration_rate, 2)
    })
    
    print(f"\nBranch {branch_id}: {branch_name}")
    print(f"  Current Accounts: {current_count}")
    print(f"  Terminated Accounts: {terminated_count}")
    print(f"  Retention Rate: {retention_rate:.2f}%")
    print(f"  Market Potential: {market_potential:,} pools")
    print(f"  Market Penetration: {penetration_rate:.2f}%")
    print(f"  Lost Annual Revenue: ${terminated_revenue:,.2f}")

df_branch_stats = pd.DataFrame(branch_stats)
df_branch_stats.to_csv('/home/ubuntu/branch_statistics.csv', index=False)
print("\n✓ Saved branch statistics to: branch_statistics.csv")

# Create summary statistics
print("\n" + "=" * 80)
print("SUMMARY STATISTICS")
print("=" * 80)

total_current = df_current[df_current['Proposed_Branch_ID'].notna()].shape[0]
total_terminated = df_terminated[df_terminated['Proposed_Branch_ID'].notna()].shape[0]
overall_retention = (total_current / (total_current + total_terminated)) * 100

print(f"\nTotal Current Accounts (assigned): {total_current}")
print(f"Total Terminated Accounts (assigned): {total_terminated}")
print(f"Overall Retention Rate: {overall_retention:.2f}%")
print(f"\nAverage Retention by Branch: {df_branch_stats['Retention_Rate_%'].mean():.2f}%")
print(f"Highest Retention: {df_branch_stats['Retention_Rate_%'].max():.2f}% ({df_branch_stats.loc[df_branch_stats['Retention_Rate_%'].idxmax(), 'Branch_Name']})")
print(f"Lowest Retention: {df_branch_stats['Retention_Rate_%'].min():.2f}% ({df_branch_stats.loc[df_branch_stats['Retention_Rate_%'].idxmin(), 'Branch_Name']})")
print(f"\nTotal Lost Annual Revenue: ${df_branch_stats['Lost_Revenue_Annual'].sum():,.2f}")

print("\n" + "=" * 80)
print("Analysis complete! Creating visualizations...")
print("=" * 80)

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json
from datetime import datetime

# Disable truncation
pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

print("Loading data files...")

# Load all data files
df_residential = pd.read_excel('/home/ubuntu/Uploads/Residential Data for Phoenix.xlsx')
df_terminated = pd.read_excel('/home/ubuntu/Uploads/Terminated Contract Data for Phoenix.xlsx')

# Clean zip codes - ensure they are strings and standardized
df_residential['ShippingPostalCode'] = df_residential['ShippingPostalCode'].astype(str).str.strip()
df_residential['ShippingPostalCode'] = df_residential['ShippingPostalCode'].str[:5]  # Take first 5 digits

df_terminated['ShippingPostalCode'] = df_terminated['ShippingPostalCode'].astype(str).str.strip()
df_terminated['ShippingPostalCode'] = df_terminated['ShippingPostalCode'].str[:5]

# Define the proposed territory assignments
territory_assignments = {
    'Branch 1 - North Scottsdale': ['85255', '85259', '85260', '85262', '85266', '85331', '85377', '85263', '85252'],
    'Branch 2 - Central Scottsdale/PV': ['85250', '85251', '85258', '85253', '85018', '85016'],
    'Branch 3 - North Phoenix I-17': ['85086', '85087', '85085', '85083', '85022', '85027', '85050', '85054'],
    'Branch 4 - Central PHX/South': ['85012', '85013', '85014', '85020', '85021', '85023', '85029', '85002', 
                                      '85003', '85004', '85006', '85007', '85008', '85009', '85015', '85017', 
                                      '85019', '85031', '85033', '85034', '85035', '85040', '85041', '85042', 
                                      '85043'],
    'Branch 5 - Peoria/Surprise North': ['85383', '85382', '85374', '85379', '85381', '85375', '85351', '85373', '85345'],
    'Branch 6 - Glendale/West PHX': ['85308', '85304', '85306', '85310', '85302', '85301', '85303', '85305', 
                                      '85318', '85051', '85053'],
    'Branch 7 - Southwest Valley/Laveen': ['85338', '85395', '85340', '85323', '85392', '85326', '85396', '85339'],
    'Branch 8 - Tempe/Chandler West': ['85281', '85282', '85283', '85284', '85288', '85224', '85044', '85048', 
                                        '85286', '85246', '85201', '85202'],
    'Branch 9 - Chandler/Gilbert South': ['85225', '85226', '85249', '85233', '85234', '85295'],
    'Branch 10 - Mesa Central/Gilbert East': ['85296', '85297', '85298', '85203', '85204', '85205', '85209', 
                                               '85210', '85213', '85215', '85274', '85277'],
    'Branch 11 - Mesa East/Pinal Outliers': ['85206', '85207', '85208', '85118', '85119', '85120', '85142', 
                                              '85143', '85140', '85132', '85122', '85193', '85194', '85138', 
                                              '85139', '85128', '85131', '85144', '85211', '85214']
}

# Market potential from the document
market_potential = {
    'Branch 1 - North Scottsdale': 22970,
    'Branch 2 - Central Scottsdale/PV': 17675,
    'Branch 3 - North Phoenix I-17': 18769,
    'Branch 4 - Central PHX/South': 28591,
    'Branch 5 - Peoria/Surprise North': 18582,
    'Branch 6 - Glendale/West PHX': 21114,
    'Branch 7 - Southwest Valley/Laveen': 18485,
    'Branch 8 - Tempe/Chandler West': 23191,
    'Branch 9 - Chandler/Gilbert South': 24181,
    'Branch 10 - Mesa Central/Gilbert East': 25488,
    'Branch 11 - Mesa East/Pinal Outliers': 17589
}

# Create reverse mapping (zip to branch)
zip_to_branch = {}
for branch, zips in territory_assignments.items():
    for zip_code in zips:
        zip_to_branch[zip_code] = branch

# Add branch assignment to dataframes
df_residential['ProposedBranch'] = df_residential['ShippingPostalCode'].map(zip_to_branch)
df_terminated['ProposedBranch'] = df_terminated['ShippingPostalCode'].map(zip_to_branch)

print("\n" + "="*80)
print("DATA SUMMARY")
print("="*80)
print(f"Active Accounts: {len(df_residential):,}")
print(f"Terminated Accounts: {len(df_terminated):,}")
print(f"Total ZIP Codes in Active Data: {df_residential['ShippingPostalCode'].nunique()}")
print(f"Total ZIP Codes in Terminated Data: {df_terminated['ShippingPostalCode'].nunique()}")

# 1. CURRENT ACCOUNT DISTRIBUTION BY ZIP CODE
print("\n" + "="*80)
print("ANALYSIS 1: CURRENT ACTIVE ACCOUNT DISTRIBUTION BY ZIP CODE")
print("="*80)

zip_distribution = df_residential.groupby('ShippingPostalCode').agg({
    'Display Name': 'count'
}).rename(columns={'Display Name': 'ActiveAccounts'}).sort_values('ActiveAccounts', ascending=False)

print("\nTop 20 ZIP codes by active account count:")
print(zip_distribution.head(20))

# 2. TERMINATED ACCOUNT DISTRIBUTION BY ZIP CODE
print("\n" + "="*80)
print("ANALYSIS 2: TERMINATED ACCOUNT DISTRIBUTION BY ZIP CODE")
print("="*80)

# Filter to recent churn (last 3 years)
recent_date = pd.Timestamp('2021-10-10')  # 4 years ago from current date
df_terminated_recent = df_terminated[df_terminated['EndDate'] >= recent_date]

terminated_zip_distribution = df_terminated_recent.groupby('ShippingPostalCode').agg({
    'Name': 'count',
    'Annual Contract Value': 'sum'
}).rename(columns={'Name': 'TerminatedAccounts', 'Annual Contract Value': 'LostRevenue'})
terminated_zip_distribution = terminated_zip_distribution.sort_values('TerminatedAccounts', ascending=False)

print(f"\nTerminated accounts in last 4 years: {len(df_terminated_recent):,}")
print("\nTop 20 ZIP codes by terminated account count (last 4 years):")
print(terminated_zip_distribution.head(20))

# 3. CHURN RATE ANALYSIS BY ZIP CODE
print("\n" + "="*80)
print("ANALYSIS 3: CHURN ANALYSIS BY ZIP CODE")
print("="*80)

# Combine active and terminated data
zip_analysis = zip_distribution.join(terminated_zip_distribution, how='outer').fillna(0)
zip_analysis['TotalHistorical'] = zip_analysis['ActiveAccounts'] + zip_analysis['TerminatedAccounts']
zip_analysis['ChurnRate'] = (zip_analysis['TerminatedAccounts'] / zip_analysis['TotalHistorical'] * 100).round(2)
zip_analysis['AvgLostRevenuePerAccount'] = (zip_analysis['LostRevenue'] / zip_analysis['TerminatedAccounts']).round(2)

# Replace inf with 0
zip_analysis = zip_analysis.replace([np.inf, -np.inf], 0)

# Add branch assignments
zip_analysis['ProposedBranch'] = zip_analysis.index.map(zip_to_branch)

print("\nTop 20 ZIP codes by churn rate (minimum 5 total historical accounts):")
high_churn_zips = zip_analysis[zip_analysis['TotalHistorical'] >= 5].sort_values('ChurnRate', ascending=False)
print(high_churn_zips[['ActiveAccounts', 'TerminatedAccounts', 'TotalHistorical', 'ChurnRate', 'ProposedBranch']].head(20))

# 4. PROPOSED TERRITORY ANALYSIS
print("\n" + "="*80)
print("ANALYSIS 4: PROPOSED TERRITORY ALIGNMENT VS ACTUAL DATA")
print("="*80)

# Aggregate by proposed branch
branch_analysis = df_residential.groupby('ProposedBranch').agg({
    'Display Name': 'count'
}).rename(columns={'Display Name': 'CurrentActiveAccounts'})

branch_terminated = df_terminated_recent.groupby('ProposedBranch').agg({
    'Name': 'count',
    'Annual Contract Value': 'sum'
}).rename(columns={'Name': 'TerminatedAccounts', 'Annual Contract Value': 'LostRevenue'})

branch_analysis = branch_analysis.join(branch_terminated, how='outer').fillna(0)
branch_analysis['MarketPotential'] = branch_analysis.index.map(market_potential)
branch_analysis['TotalHistorical'] = branch_analysis['CurrentActiveAccounts'] + branch_analysis['TerminatedAccounts']
branch_analysis['ChurnRate'] = (branch_analysis['TerminatedAccounts'] / branch_analysis['TotalHistorical'] * 100).round(2)
branch_analysis['MarketPenetration'] = (branch_analysis['CurrentActiveAccounts'] / branch_analysis['MarketPotential'] * 100).round(2)
branch_analysis['AvgLostRevenue'] = (branch_analysis['LostRevenue'] / branch_analysis['TerminatedAccounts']).round(2)

# Replace inf with 0
branch_analysis = branch_analysis.replace([np.inf, -np.inf], 0)

# Sort by current active accounts
branch_analysis = branch_analysis.sort_values('CurrentActiveAccounts', ascending=False)

print("\nProposed Branch Performance Summary:")
print(branch_analysis)

# Check for unassigned accounts
unassigned_active = df_residential[df_residential['ProposedBranch'].isna()]
unassigned_terminated = df_terminated_recent[df_terminated_recent['ProposedBranch'].isna()]

print(f"\n⚠️ GAPS IDENTIFIED:")
print(f"Active accounts NOT assigned to any proposed branch: {len(unassigned_active)}")
print(f"Terminated accounts NOT assigned to any proposed branch: {len(unassigned_terminated)}")

if len(unassigned_active) > 0:
    print("\nUnassigned Active Account ZIP Codes:")
    unassigned_zip_summary = unassigned_active.groupby('ShippingPostalCode').size().sort_values(ascending=False)
    print(unassigned_zip_summary.head(20))

# 5. IDENTIFY HIGH-PRIORITY ZIP CODES
print("\n" + "="*80)
print("ANALYSIS 5: HIGH-PRIORITY ZIP CODES")
print("="*80)

# Create a scoring system
zip_analysis_clean = zip_analysis[zip_analysis['TotalHistorical'] >= 3].copy()

# Normalize scores (0-100 scale)
zip_analysis_clean['ActiveScore'] = (zip_analysis_clean['ActiveAccounts'] / zip_analysis_clean['ActiveAccounts'].max() * 100).round(2)
zip_analysis_clean['ChurnScore'] = (zip_analysis_clean['ChurnRate']).round(2)  # Already a percentage
zip_analysis_clean['TerminatedScore'] = (zip_analysis_clean['TerminatedAccounts'] / zip_analysis_clean['TerminatedAccounts'].max() * 100).round(2)

# Composite priority score (weighted)
zip_analysis_clean['PriorityScore'] = (
    zip_analysis_clean['ActiveScore'] * 0.4 +  # Current presence
    zip_analysis_clean['ChurnScore'] * 0.3 +   # Churn risk
    zip_analysis_clean['TerminatedScore'] * 0.3  # Historical loss
).round(2)

zip_analysis_clean = zip_analysis_clean.sort_values('PriorityScore', ascending=False)

print("\nTop 25 High-Priority ZIP Codes (by composite score):")
priority_columns = ['ActiveAccounts', 'TerminatedAccounts', 'ChurnRate', 'PriorityScore', 'ProposedBranch']
print(zip_analysis_clean[priority_columns].head(25))

# Save all analysis data
zip_analysis.to_csv('/home/ubuntu/zip_code_analysis.csv')
branch_analysis.to_csv('/home/ubuntu/branch_analysis.csv')
zip_analysis_clean.to_csv('/home/ubuntu/priority_zip_codes.csv')

print("\n✅ Analysis complete! CSV files saved.")
print("\nProceeding to create visualizations...")

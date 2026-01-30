import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json

# Load data
master = pd.read_excel('/home/ubuntu/Master_Account_Branch_Assignments.xlsx', sheet_name='All Accounts')

# Create figure with subplots
fig = make_subplots(
    rows=2, cols=2,
    subplot_titles=('Phoenix 3-Area Distribution', 'Tucson 2-Area Distribution',
                    'Top 10 Phoenix ZIP Codes', 'Special Account Flags'),
    specs=[[{'type': 'pie'}, {'type': 'pie'}],
           [{'type': 'bar'}, {'type': 'bar'}]]
)

# Phoenix distribution
phoenix_data = master[master['Market'] == 'Phoenix']
phoenix_summary = phoenix_data.groupby('Area').size()
colors_phoenix = ['#FF6B6B', '#4ECDC4', '#45B7D1']

fig.add_trace(
    go.Pie(labels=phoenix_summary.index, values=phoenix_summary.values,
           marker=dict(colors=colors_phoenix),
           textinfo='label+percent+value',
           hovertemplate='<b>%{label}</b><br>Accounts: %{value}<br>Percentage: %{percent}<extra></extra>'),
    row=1, col=1
)

# Tucson distribution  
tucson_data = master[master['Market'] == 'Tucson']
tucson_summary = tucson_data.groupby('Area').size()
colors_tucson = ['#95E1D3', '#F38181']

fig.add_trace(
    go.Pie(labels=tucson_summary.index, values=tucson_summary.values,
           marker=dict(colors=colors_tucson),
           textinfo='label+percent+value',
           hovertemplate='<b>%{label}</b><br>Accounts: %{value}<br>Percentage: %{percent}<extra></extra>'),
    row=1, col=2
)

# Top 10 Phoenix ZIP codes
phoenix_zip_counts = phoenix_data.groupby('Zip_Code').size().sort_values(ascending=False).head(10)
fig.add_trace(
    go.Bar(x=phoenix_zip_counts.index.astype(str), y=phoenix_zip_counts.values,
           marker=dict(color='#4ECDC4'),
           text=phoenix_zip_counts.values,
           textposition='outside',
           hovertemplate='<b>ZIP %{x}</b><br>Accounts: %{y}<extra></extra>'),
    row=2, col=1
)

# Special flags
special_flags = master[master['Special_Flag'] != '']['Special_Flag'].value_counts()
fig.add_trace(
    go.Bar(x=special_flags.values, y=special_flags.index,
           orientation='h',
           marker=dict(color='#FFB6B9'),
           text=special_flags.values,
           textposition='outside',
           hovertemplate='<b>%{y}</b><br>Accounts: %{x}<extra></extra>'),
    row=2, col=2
)

# Update layout
fig.update_layout(
    title_text='<b>Master Account Assignment Summary</b><br><sup>Swimming Pool Service Company - Branch Reorganization</sup>',
    title_font_size=20,
    showlegend=False,
    height=900,
    font=dict(size=11)
)

# Update axes
fig.update_xaxes(title_text="ZIP Code", row=2, col=1)
fig.update_yaxes(title_text="Accounts", row=2, col=1)
fig.update_xaxes(title_text="Accounts", row=2, col=2)
fig.update_yaxes(title_text="", row=2, col=2)

# Save
fig.write_html('/home/ubuntu/Master_Account_Assignment_Summary.html', include_plotlyjs='cdn')
print("✓ Created Master_Account_Assignment_Summary.html")

# Create a detailed breakdown table
print("\n" + "=" * 80)
print("DETAILED BREAKDOWN")
print("=" * 80)

# Phoenix breakdown
print("\nPHOENIX 3-AREA BREAKDOWN:")
print("-" * 80)
phoenix_detailed = phoenix_data.groupby(['Area', 'Branch_Assignment']).agg({
    'Account_ID': 'count',
    'Zip_Code': 'nunique',
    'Special_Flag': lambda x: (x != '').sum()
}).reset_index()
phoenix_detailed.columns = ['Area', 'Branch', 'Accounts', 'ZIP_Codes', 'Special_Flags']
print(phoenix_detailed.to_string(index=False))

print(f"\nPhoenix Total: {len(phoenix_data)} accounts across {phoenix_data['Zip_Code'].nunique()} ZIP codes")

# Tucson breakdown
print("\n" + "=" * 80)
print("TUCSON 2-AREA BREAKDOWN:")
print("-" * 80)
tucson_detailed = tucson_data.groupby(['Area', 'Branch_Assignment']).agg({
    'Account_ID': 'count',
    'Zip_Code': 'nunique',
    'Special_Flag': lambda x: (x != '').sum()
}).reset_index()
tucson_detailed.columns = ['Area', 'Branch', 'Accounts', 'ZIP_Codes', 'Special_Flags']
print(tucson_detailed.to_string(index=False))

print(f"\nTucson Total: {len(tucson_data)} accounts across {tucson_data['Zip_Code'].nunique()} ZIP codes")

# Overall totals
print("\n" + "=" * 80)
print("OVERALL TOTALS")
print("=" * 80)
print(f"Total Accounts: {len(master)}")
print(f"Phoenix Market: {len(phoenix_data)} ({len(phoenix_data)/len(master)*100:.1f}%)")
print(f"Tucson Market: {len(tucson_data)} ({len(tucson_data)/len(master)*100:.1f}%)")
print(f"Total ZIP Codes: {master['Zip_Code'].nunique()}")
print(f"Accounts with Special Flags: {(master['Special_Flag'] != '').sum()}")


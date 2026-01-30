import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json

# Load the data
branch_stats_df = pd.read_csv('/home/ubuntu/tucson_branch_stats.csv')
zip_retention_df = pd.read_csv('/home/ubuntu/tucson_zip_retention.csv')
unassigned_df = pd.read_csv('/home/ubuntu/tucson_unassigned_zips.csv')

# Color scheme
colors = {
    'Branch 1': '#2E86AB',
    'Branch 2': '#A23B72',
    'Active': '#06A77D',
    'Terminated': '#D81159'
}

# 1. Branch Overview - Account Distribution
fig1 = make_subplots(
    rows=1, cols=2,
    subplot_titles=('Total Accounts by Branch', 'Retention Rate by Branch'),
    specs=[[{'type': 'bar'}, {'type': 'bar'}]]
)

# Shorten branch names for visualization
branch_stats_df['Branch_Short'] = branch_stats_df['Branch'].apply(
    lambda x: 'Branch 1\n(East & North)' if 'Branch 1' in x else 'Branch 2\n(West & Central)'
)

# Total accounts
fig1.add_trace(
    go.Bar(
        x=branch_stats_df['Branch_Short'],
        y=branch_stats_df['Total_Accounts'],
        name='Total Accounts',
        marker_color='#2E86AB',
        text=branch_stats_df['Total_Accounts'],
        textposition='outside'
    ),
    row=1, col=1
)

# Retention rate
fig1.add_trace(
    go.Bar(
        x=branch_stats_df['Branch_Short'],
        y=branch_stats_df['Retention_Rate'],
        name='Retention Rate %',
        marker_color='#06A77D',
        text=[f"{val:.1f}%" for val in branch_stats_df['Retention_Rate']],
        textposition='outside'
    ),
    row=1, col=2
)

fig1.update_xaxes(title_text="Branch", row=1, col=1)
fig1.update_xaxes(title_text="Branch", row=1, col=2)
fig1.update_yaxes(title_text="Number of Accounts", row=1, col=1)
fig1.update_yaxes(title_text="Retention Rate (%)", row=1, col=2)

fig1.update_layout(
    title_text="Branch Overview - Account Distribution & Retention",
    showlegend=False,
    height=500,
    font=dict(size=12)
)

fig1.write_image('/home/ubuntu/tucson_branch_overview.png', width=1400, height=500)
print("✓ Created: Branch Overview chart")

# 2. Active vs Terminated by Branch - Stacked Bar
fig2 = go.Figure()

fig2.add_trace(go.Bar(
    name='Active',
    x=branch_stats_df['Branch_Short'],
    y=branch_stats_df['Active_Accounts'],
    marker_color='#06A77D',
    text=branch_stats_df['Active_Accounts'],
    textposition='inside'
))

fig2.add_trace(go.Bar(
    name='Terminated',
    x=branch_stats_df['Branch_Short'],
    y=branch_stats_df['Terminated_Accounts'],
    marker_color='#D81159',
    text=branch_stats_df['Terminated_Accounts'],
    textposition='inside'
))

fig2.update_layout(
    barmode='stack',
    title='Active vs Terminated Accounts by Proposed Branch',
    xaxis_title='Branch',
    yaxis_title='Number of Accounts',
    height=500,
    font=dict(size=12),
    legend=dict(
        orientation="h",
        yanchor="bottom",
        y=1.02,
        xanchor="right",
        x=1
    )
)

fig2.write_image('/home/ubuntu/tucson_active_vs_terminated.png', width=1200, height=500)
print("✓ Created: Active vs Terminated chart")

# 3. ZIP Code Retention Heatmap
# Filter only ZIPs with accounts
zip_retention_with_accounts = zip_retention_df[zip_retention_df['Total'] > 0].copy()

# Sort by retention rate
zip_retention_with_accounts = zip_retention_with_accounts.sort_values('Retention_Rate', ascending=True)

# Create color coding based on retention rate
def get_retention_color(rate):
    if rate < 15:
        return '#D81159'  # Red - Critical
    elif rate < 25:
        return '#F4A259'  # Orange - Warning
    else:
        return '#06A77D'  # Green - Good

zip_retention_with_accounts['Color'] = zip_retention_with_accounts['Retention_Rate'].apply(get_retention_color)
zip_retention_with_accounts['Branch_Short'] = zip_retention_with_accounts['Branch'].apply(
    lambda x: 'Branch 1' if 'Branch 1' in x else 'Branch 2'
)

fig3 = go.Figure()

fig3.add_trace(go.Bar(
    x=zip_retention_with_accounts['Retention_Rate'],
    y=zip_retention_with_accounts['ZIP'],
    orientation='h',
    marker_color=zip_retention_with_accounts['Color'],
    text=[f"{val:.1f}%" for val in zip_retention_with_accounts['Retention_Rate']],
    textposition='outside',
    customdata=zip_retention_with_accounts[['Branch_Short', 'Total', 'Active', 'Terminated']],
    hovertemplate='<b>ZIP %{y}</b><br>' +
                  'Branch: %{customdata[0]}<br>' +
                  'Retention Rate: %{x:.1f}%<br>' +
                  'Total Accounts: %{customdata[1]}<br>' +
                  'Active: %{customdata[2]}<br>' +
                  'Terminated: %{customdata[3]}<br>' +
                  '<extra></extra>'
))

fig3.update_layout(
    title='Retention Rate by ZIP Code (Assigned ZIPs Only)',
    xaxis_title='Retention Rate (%)',
    yaxis_title='ZIP Code',
    height=800,
    font=dict(size=10),
    showlegend=False
)

fig3.write_image('/home/ubuntu/tucson_zip_retention_detail.png', width=1200, height=800)
print("✓ Created: ZIP Code Retention chart")

# 4. Unassigned ZIP Codes Analysis
# Focus on top unassigned ZIPs by total accounts
top_unassigned = unassigned_df.sort_values('Total', ascending=False).head(15)

fig4 = make_subplots(
    rows=1, cols=2,
    subplot_titles=('Top 15 Unassigned ZIPs by Account Count', 'Account Status in Unassigned ZIPs'),
    specs=[[{'type': 'bar'}, {'type': 'bar'}]]
)

# Total accounts in unassigned ZIPs
fig4.add_trace(
    go.Bar(
        x=top_unassigned['ZIP'],
        y=top_unassigned['Total'],
        name='Total Accounts',
        marker_color='#F4A259',
        text=top_unassigned['Total'],
        textposition='outside',
        customdata=top_unassigned['City'],
        hovertemplate='<b>ZIP %{x}</b><br>' +
                      'City: %{customdata}<br>' +
                      'Total Accounts: %{y}<br>' +
                      '<extra></extra>'
    ),
    row=1, col=1
)

# Active vs Terminated in top unassigned ZIPs
fig4.add_trace(
    go.Bar(
        name='Active',
        x=top_unassigned['ZIP'],
        y=top_unassigned['Active'],
        marker_color='#06A77D'
    ),
    row=1, col=2
)

fig4.add_trace(
    go.Bar(
        name='Terminated',
        x=top_unassigned['ZIP'],
        y=top_unassigned['Terminated'],
        marker_color='#D81159'
    ),
    row=1, col=2
)

fig4.update_xaxes(title_text="ZIP Code", row=1, col=1)
fig4.update_xaxes(title_text="ZIP Code", row=1, col=2)
fig4.update_yaxes(title_text="Number of Accounts", row=1, col=1)
fig4.update_yaxes(title_text="Number of Accounts", row=1, col=2)

fig4.update_layout(
    title_text="Unassigned ZIP Codes Analysis",
    showlegend=True,
    height=500,
    font=dict(size=10),
    legend=dict(
        orientation="h",
        yanchor="bottom",
        y=1.05,
        xanchor="right",
        x=1
    )
)

fig4.write_image('/home/ubuntu/tucson_unassigned_zips.png', width=1400, height=500)
print("✓ Created: Unassigned ZIP Codes chart")

# 5. Revenue Distribution
fig5 = go.Figure()

fig5.add_trace(go.Bar(
    x=branch_stats_df['Branch_Short'],
    y=branch_stats_df['Active_Revenue'],
    marker_color='#2E86AB',
    text=['${:,.0f}'.format(val) for val in branch_stats_df['Active_Revenue']],
    textposition='outside'
))

fig5.update_layout(
    title='Active Annual Revenue by Proposed Branch',
    xaxis_title='Branch',
    yaxis_title='Annual Revenue ($)',
    height=500,
    font=dict(size=12),
    showlegend=False
)

fig5.write_image('/home/ubuntu/tucson_revenue_distribution.png', width=1200, height=500)
print("✓ Created: Revenue Distribution chart")

# 6. Summary Statistics for Report
summary_stats = {
    'total_accounts': int(branch_stats_df['Total_Accounts'].sum()),
    'total_active': int(branch_stats_df['Active_Accounts'].sum()),
    'total_terminated': int(branch_stats_df['Terminated_Accounts'].sum()),
    'overall_retention': float((branch_stats_df['Active_Accounts'].sum() / 
                                branch_stats_df['Total_Accounts'].sum()) * 100),
    'total_active_revenue': float(branch_stats_df['Active_Revenue'].sum()),
    'unassigned_accounts': int(unassigned_df['Total'].sum()),
    'unassigned_active': int(unassigned_df['Active'].sum()),
    'unassigned_terminated': int(unassigned_df['Terminated'].sum()),
    'branches': []
}

for idx, row in branch_stats_df.iterrows():
    summary_stats['branches'].append({
        'name': row['Branch'],
        'active': int(row['Active_Accounts']),
        'terminated': int(row['Terminated_Accounts']),
        'total': int(row['Total_Accounts']),
        'retention_rate': float(row['Retention_Rate']),
        'revenue': float(row['Active_Revenue'])
    })

with open('/home/ubuntu/tucson_summary_stats.json', 'w') as f:
    json.dump(summary_stats, f, indent=2)

print("✓ Created: Summary statistics JSON")
print("\nAll visualizations created successfully!")


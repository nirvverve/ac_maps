import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json

# Load the data
file_path = '/home/ubuntu/Uploads/SJ Proposed Phoenix Branch Analysis By Zip Code (1).xlsx'
df_analysis = pd.read_excel(file_path, sheet_name='#3 - Analysis by Zip Code')

# Define the consolidation mapping
consolidation_map = {
    'Branch 5 - Peoria/Surprise North': 'West',
    'Branch 6 - Glendale/West PHX': 'West',
    'Branch 7 - Southwest Valley/Laveen': 'West',
    'Branch 10 - Mesa Central/Gilbert East': 'West',
    'Branch 2 - Central Scottsdale/PV': 'Central',
    'Branch 3 - North Phoenix I-17': 'Central',
    'Branch 4 - Central PHX/South': 'Central',
    'Branch 11 - Mesa East/Pinal Outliers': 'Central',
    'Branch 1 - North Scottsdale': 'East',
    'Branch 8 - Tempe/Chandler West': 'East',
    'Branch 9 - Chandler/Gilbert South': 'East'
}

df_analysis['New3BranchStructure'] = df_analysis['ProposedBranch'].map(consolidation_map)

# Color scheme for consistency
colors = {'West': '#FF6B6B', 'Central': '#4ECDC4', 'East': '#45B7D1'}

# ============================================================================
# VISUALIZATION 1: Account Distribution Comparison
# ============================================================================
new_branch_summary = df_analysis.groupby('New3BranchStructure').agg({
    'ActiveAccounts': 'sum',
    'TerminatedAccounts': 'sum',
    'TotalHistorical': 'sum'
})

fig1 = make_subplots(
    rows=1, cols=2,
    subplot_titles=('Active Accounts by Branch', 'Account Distribution Overview'),
    specs=[[{"type": "bar"}, {"type": "pie"}]]
)

# Bar chart
branches = ['West', 'Central', 'East']
active_counts = [new_branch_summary.loc[b, 'ActiveAccounts'] for b in branches]
target = sum(active_counts) / 3

fig1.add_trace(
    go.Bar(
        x=branches,
        y=active_counts,
        marker_color=[colors[b] for b in branches],
        text=active_counts,
        textposition='outside',
        name='Active Accounts'
    ),
    row=1, col=1
)

# Add target line
fig1.add_hline(y=target, line_dash="dash", line_color="gray", 
               annotation_text=f"Target: {target:.0f}", row=1, col=1)

# Pie chart
fig1.add_trace(
    go.Pie(
        labels=branches,
        values=active_counts,
        marker_colors=[colors[b] for b in branches],
        textinfo='label+value+percent',
        name='Distribution'
    ),
    row=1, col=2
)

fig1.update_layout(
    title_text="Phoenix 3-Branch Consolidation: Account Distribution",
    showlegend=False,
    height=500,
    width=1200
)

fig1.write_html('/home/ubuntu/viz1_account_distribution.html', include_plotlyjs='cdn')
print("Created: viz1_account_distribution.html")

# ============================================================================
# VISUALIZATION 2: Retention & Churn Analysis
# ============================================================================
new_branch_summary['ChurnRate'] = (new_branch_summary['TerminatedAccounts'] / new_branch_summary['TotalHistorical'] * 100).round(2)
new_branch_summary['RetentionRate'] = (100 - new_branch_summary['ChurnRate']).round(2)

fig2 = go.Figure()

fig2.add_trace(go.Bar(
    x=branches,
    y=[new_branch_summary.loc[b, 'RetentionRate'] for b in branches],
    name='Retention Rate',
    marker_color=[colors[b] for b in branches],
    text=[f"{new_branch_summary.loc[b, 'RetentionRate']:.1f}%" for b in branches],
    textposition='outside'
))

fig2.add_trace(go.Bar(
    x=branches,
    y=[new_branch_summary.loc[b, 'ChurnRate'] for b in branches],
    name='Churn Rate',
    marker_color='lightgray',
    text=[f"{new_branch_summary.loc[b, 'ChurnRate']:.1f}%" for b in branches],
    textposition='inside'
))

fig2.update_layout(
    title='Retention vs. Churn Rate by Branch<br><sub>Primary success metric for reorganization</sub>',
    yaxis_title='Percentage (%)',
    barmode='stack',
    height=600,
    width=1000,
    showlegend=True
)

fig2.write_html('/home/ubuntu/viz2_retention_churn.html', include_plotlyjs='cdn')
print("Created: viz2_retention_churn.html")

# ============================================================================
# VISUALIZATION 3: Lost Revenue Analysis
# ============================================================================
lost_revenue_summary = df_analysis.groupby('New3BranchStructure').agg({
    'LostRevenue': 'sum',
    'TerminatedAccounts': 'sum'
})

lost_revenue_summary['AvgLostPerAccount'] = (lost_revenue_summary['LostRevenue'] / lost_revenue_summary['TerminatedAccounts']).round(2)

fig3 = make_subplots(
    rows=1, cols=2,
    subplot_titles=('Total Lost Revenue by Branch', 'Avg Lost Revenue per Terminated Account'),
    specs=[[{"type": "bar"}, {"type": "bar"}]]
)

# Total lost revenue
fig3.add_trace(
    go.Bar(
        x=branches,
        y=[lost_revenue_summary.loc[b, 'LostRevenue'] for b in branches],
        marker_color=[colors[b] for b in branches],
        text=[f"${lost_revenue_summary.loc[b, 'LostRevenue']/1000:.0f}K" for b in branches],
        textposition='outside',
        name='Total Lost Revenue'
    ),
    row=1, col=1
)

# Average lost revenue per account
fig3.add_trace(
    go.Bar(
        x=branches,
        y=[lost_revenue_summary.loc[b, 'AvgLostPerAccount'] for b in branches],
        marker_color=[colors[b] for b in branches],
        text=[f"${lost_revenue_summary.loc[b, 'AvgLostPerAccount']:,.0f}" for b in branches],
        textposition='outside',
        name='Avg per Account'
    ),
    row=1, col=2
)

fig3.update_xaxes(title_text="Branch", row=1, col=1)
fig3.update_xaxes(title_text="Branch", row=1, col=2)
fig3.update_yaxes(title_text="Lost Revenue ($)", row=1, col=1)
fig3.update_yaxes(title_text="Average Lost Revenue ($)", row=1, col=2)

fig3.update_layout(
    title_text="Lost Revenue Analysis by Branch",
    showlegend=False,
    height=500,
    width=1200
)

fig3.write_html('/home/ubuntu/viz3_lost_revenue.html', include_plotlyjs='cdn')
print("Created: viz3_lost_revenue.html")

# ============================================================================
# VISUALIZATION 4: 11-Branch to 3-Branch Consolidation Flow
# ============================================================================
# Create a Sankey diagram showing the consolidation
branch_11_data = df_analysis.groupby('ProposedBranch')['ActiveAccounts'].sum()

sources = []
targets = []
values = []
labels = []

# Create label list
old_branches = sorted(consolidation_map.keys())
new_branches_list = ['West', 'Central', 'East']

for branch in old_branches:
    labels.append(branch.replace('Branch ', 'B'))

for branch in new_branches_list:
    labels.append(f"{branch} (New)")

# Create connections
for old_branch, new_branch in consolidation_map.items():
    source_idx = labels.index(old_branch.replace('Branch ', 'B'))
    target_idx = labels.index(f"{new_branch} (New)")
    value = branch_11_data[old_branch]
    
    sources.append(source_idx)
    targets.append(target_idx)
    values.append(value)

fig4 = go.Figure(data=[go.Sankey(
    node = dict(
        pad = 15,
        thickness = 20,
        line = dict(color = "black", width = 0.5),
        label = labels,
        color = ["lightblue"]*11 + [colors['West'], colors['Central'], colors['East']]
    ),
    link = dict(
        source = sources,
        target = targets,
        value = values
    )
)])

fig4.update_layout(
    title_text="11-Branch to 3-Branch Consolidation Flow<br><sub>Shows how current territories consolidate into new branch structure</sub>",
    font_size=10,
    height=800,
    width=1400
)

fig4.write_html('/home/ubuntu/viz4_consolidation_flow.html', include_plotlyjs='cdn')
print("Created: viz4_consolidation_flow.html")

# ============================================================================
# VISUALIZATION 5: Comprehensive Dashboard
# ============================================================================
fig5 = make_subplots(
    rows=2, cols=2,
    subplot_titles=(
        'Active Accounts by Branch',
        'Retention Rate Comparison', 
        'Zip Code Distribution',
        'Balance vs Target'
    ),
    specs=[
        [{"type": "bar"}, {"type": "bar"}],
        [{"type": "bar"}, {"type": "scatter"}]
    ]
)

# Chart 1: Active accounts
fig5.add_trace(
    go.Bar(
        x=branches,
        y=[new_branch_summary.loc[b, 'ActiveAccounts'] for b in branches],
        marker_color=[colors[b] for b in branches],
        text=[new_branch_summary.loc[b, 'ActiveAccounts'] for b in branches],
        textposition='outside',
        showlegend=False
    ),
    row=1, col=1
)

# Chart 2: Retention rates
fig5.add_trace(
    go.Bar(
        x=branches,
        y=[new_branch_summary.loc[b, 'RetentionRate'] for b in branches],
        marker_color=[colors[b] for b in branches],
        text=[f"{new_branch_summary.loc[b, 'RetentionRate']:.1f}%" for b in branches],
        textposition='outside',
        showlegend=False
    ),
    row=1, col=2
)

# Chart 3: Zip code count
zip_counts = df_analysis.groupby('New3BranchStructure').size()
fig5.add_trace(
    go.Bar(
        x=branches,
        y=[zip_counts[b] for b in branches],
        marker_color=[colors[b] for b in branches],
        text=[zip_counts[b] for b in branches],
        textposition='outside',
        showlegend=False
    ),
    row=2, col=1
)

# Chart 4: Balance vs target
target = new_branch_summary['ActiveAccounts'].sum() / 3
deviations = [(new_branch_summary.loc[b, 'ActiveAccounts'] - target) / target * 100 for b in branches]
deviation_colors = ['green' if abs(d) < 5 else 'orange' for d in deviations]

fig5.add_trace(
    go.Scatter(
        x=branches,
        y=deviations,
        mode='markers+lines+text',
        marker=dict(size=15, color=deviation_colors),
        text=[f"{d:+.1f}%" for d in deviations],
        textposition='top center',
        showlegend=False,
        line=dict(color='gray', dash='dash')
    ),
    row=2, col=2
)

fig5.add_hline(y=0, line_dash="solid", line_color="gray", row=2, col=2)
fig5.add_hrect(y0=-5, y1=5, fillcolor="lightgreen", opacity=0.2, line_width=0, row=2, col=2)

# Update axes
fig5.update_yaxes(title_text="Active Accounts", row=1, col=1)
fig5.update_yaxes(title_text="Retention Rate (%)", row=1, col=2)
fig5.update_yaxes(title_text="Zip Code Count", row=2, col=1)
fig5.update_yaxes(title_text="Deviation from Target (%)", row=2, col=2)

fig5.update_layout(
    title_text="Phoenix 3-Branch Consolidation: Executive Dashboard",
    height=900,
    width=1400,
    showlegend=False
)

fig5.write_html('/home/ubuntu/viz5_executive_dashboard.html', include_plotlyjs='cdn')
print("Created: viz5_executive_dashboard.html")

print("\n" + "="*100)
print("All visualizations created successfully!")
print("="*100)

# Territory Account Density Analysis

## Executive Summary

This analysis provides a comprehensive view of **active and terminated account density** across Phoenix and Tucson territories. The data reveals critical insights into customer concentration patterns, churn rates, and territory performance.

### Key Findings

#### Overall Metrics
- **Active Accounts**: 1,699 customers
- **Terminated Accounts**: 9,417 customers (84.6% churn rate overall)
- **Total Historical**: 11,116 accounts
- **ZIP Codes Covered**: 156

#### Territory Performance

| Territory | ZIP Codes | Active | Terminated | Churn Rate |
|-----------|-----------|--------|------------|------------|
| **West**  | 45 | 529 | 3,599 | **87.2%** ⚠️ |
| **Central** | 49 | 527 | 3,010 | **85.1%** ⚠️ |
| **East** | 36 | 570 | 2,527 | **81.6%** |
| **Tucson** | 26 | 73 | 226 | **75.6%** ✓ |

⚠️ **Critical Issue**: West and Central territories show significantly higher churn rates than East and Tucson, suggesting operational or service quality concerns.

#### Density Hotspots

**Top 5 ZIPs by Active Accounts:**
1. **85122** (Casa Grande/East): 89 active + 333 terminated = 78.9% churn
2. **85254** (North Scottsdale/Central): 56 active + 221 terminated = 79.8% churn
3. **85308** (Glendale/West): 40 active + 267 terminated = **87.0% churn** ⚠️
4. **85255** (Scottsdale/Central): 39 active + 179 terminated = 82.1% churn
5. **85249** (Chandler/East): 33 active + 129 terminated = 79.6% churn

**Top 5 ZIPs by Terminated Accounts:**
1. **85122** (Casa Grande): 333 terminated
2. **85308** (Glendale): 267 terminated
3. **85254** (North Scottsdale): 221 terminated
4. **85339** (Laveen): 195 terminated
5. **85255** (Scottsdale): 179 terminated

---

## Interactive Density Map

### Location
📂 `/home/ubuntu/density_map/nextjs_space/`

### How to Use

1. **Start the Application**
   ```bash
   cd /home/ubuntu/density_map/nextjs_space
   yarn dev
   ```
   Open browser to: `http://localhost:3000`

2. **View Modes**
   - **Active Accounts** (Green gradient): Shows current customer density
     - Darker green = higher active account concentration
     - Range: 0 (light) to 50+ (dark)
   
   - **Terminated Accounts** (Red gradient): Shows lost customer density
     - Darker red = higher terminated account concentration
     - Range: 0 (light) to 250+ (dark)
   
   - **Churn Rate** (Green to Red gradient): Shows retention performance
     - Green = good retention (0-50%)
     - Yellow/Orange = moderate churn (50-85%)
     - Red = high churn (85-95%+)

3. **Interactive Features**
   - **Click any ZIP code** to see detailed statistics:
     - Active account count
     - Terminated account count
     - Total historical accounts
     - Churn rate percentage
   
   - **Filter by Territory**: Click on territory cards in sidebar to focus on specific areas
   
   - **Toggle View Modes**: Switch between Active, Terminated, and Churn Rate views

### Color Legend

#### Active Accounts (Green Scale)
- `#f0fdf4` (Very Light) → 0-3 accounts
- `#d1fae5` → 3-6 accounts
- `#86efac` → 6-10 accounts
- `#4ade80` → 10-17 accounts
- `#22c55e` → 17-30 accounts
- `#16a34a` → 30-50 accounts
- `#15803d` (Dark) → 50+ accounts

#### Terminated Accounts (Red Scale)
- `#fef2f2` (Very Light) → 0-15 accounts
- `#fecaca` → 15-35 accounts
- `#fca5a5` → 35-64 accounts
- `#f87171` → 64-98 accounts
- `#ef4444` → 98-150 accounts
- `#dc2626` → 150-250 accounts
- `#991b1b` (Dark) → 250+ accounts

#### Churn Rate (Multi-Color Scale)
- `#f0fdf4` (Green) → 0-50% (excellent retention)
- `#fef3c7` (Light Yellow) → 50-70%
- `#fbbf24` (Orange) → 70-85%
- `#f97316` (Dark Orange) → 85-90%
- `#dc2626` (Red) → 90-95%
- `#991b1b` (Dark Red) → 95%+ (critical churn)

---

## Static Visualizations

For environments without WebGL support or for presentation purposes, static HTML visualizations are available:

### Available Visualizations

1. **`density_viz_top_30_active.html`**
   - Horizontal bar chart showing top 30 ZIP codes by active account density
   - Color-coded by territory
   - Perfect for identifying growth opportunities

2. **`density_viz_top_30_terminated.html`**
   - Horizontal bar chart showing top 30 ZIP codes by terminated account density
   - Highlights retention problem areas
   - Critical for churn reduction strategy

3. **`density_viz_area_comparison.html`**
   - Side-by-side comparison of territories
   - Shows active vs terminated accounts
   - Displays average churn rates
   - Ideal for executive presentations

4. **`density_viz_scatter_comparison.html`**
   - Bubble chart: Active vs Terminated accounts
   - Bubble size = total historical accounts
   - Color-coded by territory
   - Reveals correlation patterns

5. **`density_viz_churn_distribution.html`**
   - Box plot showing churn rate distribution by territory
   - Displays median, quartiles, and outliers
   - Useful for statistical analysis

### How to View
Simply open any `.html` file in a web browser:
```bash
# From file explorer
open density_viz_top_30_active.html

# Or using browser directly
firefox density_viz_top_30_active.html
```

---

## Strategic Insights

### 🎯 Opportunity Zones (High Active Density)
Focus retention and expansion efforts on:
- **85122** (Casa Grande): Highest concentration (89 active)
- **85254** (North Scottsdale): Strong market presence (56 active)
- **85308** (Glendale): Large customer base despite high churn (40 active)

### ⚠️ Critical Attention Areas (High Churn)
Immediate investigation needed:
- **West Territory**: 87.2% churn rate (highest)
- **Central Territory**: 85.1% churn rate
- **ZIP 85308**: 86.97% churn rate (267 terminated vs 40 active)
- **ZIP 85331**: 87.57% churn rate (148 terminated vs 21 active)

### ✅ Best Practices (Lowest Churn)
Learn from success in:
- **Tucson Territory**: 75.6% churn (12 points better than West)
- **East Territory**: 81.6% churn (5.6 points better than West)
- Apply operational models from these territories to others

### 📊 Resource Allocation Recommendations

1. **Retention Teams**: Deploy to high-churn ZIPs (85308, 85331, 85383)
2. **Quality Audits**: Focus on West and Central territories
3. **Customer Success**: Prioritize high-density ZIPs (85122, 85254)
4. **Win-Back Campaigns**: Target areas with 100+ terminated accounts

---

## Technical Details

### Data Sources
- **Active Accounts**: `Phoenix Breakout of Accounts Detail SJ 10 30.xlsx`
- **Terminated Phoenix**: `Terminated Data for Phoenix.csv` (8,552 records)
- **Terminated Tucson**: `Terminated Data for Tucson CG.csv` (865 records)
- **ZIP Boundaries**: `az-zip-boundaries.json` (Arizona ZIP code polygons)

### Processing
1. ZIP codes normalized across all datasets
2. Density calculated as count of accounts per ZIP
3. Churn rate = (Terminated / Total Historical) × 100
4. Percentile-based color scaling for optimal contrast

### Map Technology
- **Framework**: Next.js 14.2.28 + React 18.2
- **Mapping Library**: Mapbox GL JS 2.15.0
- **Visualization**: Recharts 2.15.3
- **Styling**: TailwindCSS 3.3.3

---

## Next Steps

1. **Immediate Actions**
   - Review service quality in West territory
   - Interview customers in high-churn ZIPs
   - Compare operational procedures across territories

2. **Short-term (30 days)**
   - Launch targeted retention campaigns in top 10 churn ZIPs
   - Deploy customer success teams to density hotspots
   - Implement quarterly density tracking

3. **Long-term (90+ days)**
   - Establish churn reduction targets by territory
   - Develop early warning system for at-risk accounts
   - Create territory-specific best practices playbook

---

## Questions?

For support or questions about this analysis:
- **Interactive Map Issues**: Check browser WebGL support
- **Data Questions**: Review source files in `/home/ubuntu/Uploads/`
- **Visualization Updates**: Re-run Python script in this README

---

**Last Updated**: October 30, 2025  
**Analysis Version**: 1.0  
**Data As Of**: October 30, 2025

import json
import pandas as pd
from datetime import datetime

# Load data
with open('/home/ubuntu/tucson_summary_stats.json', 'r') as f:
    stats = json.load(f)

branch_stats_df = pd.read_csv('/home/ubuntu/tucson_branch_stats.csv')
zip_retention_df = pd.read_csv('/home/ubuntu/tucson_zip_retention.csv')
unassigned_df = pd.read_csv('/home/ubuntu/tucson_unassigned_zips.csv')

# Calculate additional metrics
total_accounts_all = stats['total_accounts'] + stats['unassigned_accounts']
pct_assigned = (stats['total_accounts'] / total_accounts_all) * 100
pct_unassigned = (stats['unassigned_accounts'] / total_accounts_all) * 100

# Identify critical retention ZIPs
critical_zips = zip_retention_df[
    (zip_retention_df['Total'] > 0) & 
    (zip_retention_df['Retention_Rate'] < 15)
].sort_values('Retention_Rate')

# Identify Casa Grande dominance
casa_grande_total = int(unassigned_df[unassigned_df['City'] == 'Casa Grande']['Total'].sum())
casa_grande_pct = (casa_grande_total / total_accounts_all) * 100

# Get Casa Grande retention - fix integer comparison
cg_main = unassigned_df[unassigned_df['ZIP'] == 85122]
if len(cg_main) > 0:
    cg_retention = (cg_main['Active'].values[0] / cg_main['Total'].values[0]) * 100
else:
    cg_retention = 0

report = f"""# Tucson Branch Decentralization
## Strategic Analysis Report

---

**Prepared:** {datetime.now().strftime('%B %d, %Y')}  
**Subject:** Evaluation of Proposed 2-Branch Territory Reorganization  
**Primary Metric:** Customer Retention Improvement

---

## Executive Summary

This analysis evaluates the proposed decentralization of the Tucson service area from a single branch into two geographically-defined territories. The analysis maps current and terminated accounts to the proposed branches, identifies gaps in the territorial plan, and provides strategic recommendations for implementation.

### Key Findings

1. **Overall Portfolio Health**
   - Total accounts in database: **{total_accounts_all:,}**
   - Overall retention rate: **{stats['overall_retention']:.2f}%** (critically low)
   - Active accounts: **{stats['total_active'] + stats['unassigned_active']:,}**
   - Terminated accounts: **{stats['total_terminated'] + stats['unassigned_terminated']:,}**

2. **Territory Coverage Gap**
   - **{pct_unassigned:.1f}% of accounts ({stats['unassigned_accounts']:,} accounts) are in unassigned ZIP codes**
   - Casa Grande alone represents **{casa_grande_pct:.1f}% of all accounts** ({casa_grande_total:,} accounts)
   - The proposed plan covers only **{pct_assigned:.1f}% of the account base**

3. **Retention Crisis**
   - Current retention rate of {stats['overall_retention']:.1f}% indicates severe operational issues
   - Both proposed branches show retention rates below 25%
   - Multiple ZIP codes have 0% retention (all accounts terminated)

4. **Branch Balance**
   - Branch 1 (East & North): {stats['branches'][0]['total']:,} accounts (46.6% of assigned)
   - Branch 2 (West & Central): {stats['branches'][1]['total']:,} accounts (53.4% of assigned)
   - Distribution is reasonably balanced among assigned territories

---

## Detailed Analysis

### 1. Proposed Branch Territories

The decentralization plan divides Tucson into two branches based on geographic and demographic characteristics:

#### Branch 1 - Tucson East & North (The Foothills Branch)
- **Target Market:** High-value Catalina Foothills, Northeast, and established East Side
- **ZIP Codes Assigned:** 85718, 85749, 85750, 85710, 85748, 85730, 85715, 85711 (8 ZIPs)
- **Actual Account Data:**
  - Active accounts: {stats['branches'][0]['active']}
  - Terminated accounts: {stats['branches'][0]['terminated']}
  - Total accounts: {stats['branches'][0]['total']}
  - **Retention rate: {stats['branches'][0]['retention_rate']:.2f}%**
  - Active annual revenue: **${stats['branches'][0]['revenue']:,.2f}**

#### Branch 2 - Tucson West & Central (The Urban & Growth Branch)
- **Target Market:** Rapidly growing Northwest, West Side, and central urban corridors
- **ZIP Codes Assigned:** 85737, 85704, 85742, 85745, 85743, 85741, 85712, 85755, 85719, 85716, 85705 (11 ZIPs)
- **Actual Account Data:**
  - Active accounts: {stats['branches'][1]['active']}
  - Terminated accounts: {stats['branches'][1]['terminated']}
  - Total accounts: {stats['branches'][1]['total']}
  - **Retention rate: {stats['branches'][1]['retention_rate']:.2f}%**
  - Active annual revenue: **${stats['branches'][1]['revenue']:,.2f}**

![Branch Overview](tucson_branch_overview.png)

![Active vs Terminated](tucson_active_vs_terminated.png)

---

### 2. Critical Territory Coverage Gap

**The most significant finding of this analysis is that {pct_unassigned:.1f}% of accounts are located in ZIP codes not included in the proposed 2-branch plan.**

#### Unassigned ZIP Codes: {len(unassigned_df)} ZIPs with {stats['unassigned_accounts']:,} total accounts

**Top 10 Unassigned ZIP Codes by Account Volume:**

"""

# Create table of top 10 unassigned ZIPs
top_10_unassigned = unassigned_df.nlargest(10, 'Total')
report += "| Rank | ZIP Code | City | Active | Terminated | Total | % of All Accounts |\n"
report += "|:----:|:--------:|:-----|-------:|-----------:|------:|------------------:|\n"
for idx, (_, row) in enumerate(top_10_unassigned.iterrows(), 1):
    pct = (row['Total'] / total_accounts_all) * 100
    report += f"| {idx} | {int(row['ZIP'])} | {row['City']} | {int(row['Active'])} | {int(row['Terminated'])} | {int(row['Total'])} | {pct:.1f}% |\n"

report += f"""

**Casa Grande Dominance:**
- Casa Grande ZIP codes contain **{casa_grande_total:,} accounts ({casa_grande_pct:.1f}% of all accounts)**
- This represents the largest concentration of accounts in the entire dataset
- Current retention rate in Casa Grande (85122): **{cg_retention:.1f}%**

![Unassigned ZIP Codes](tucson_unassigned_zips.png)

---

### 3. Retention Analysis by ZIP Code

The following ZIP codes within the proposed territories show critically low retention rates (< 15%):

"""

# Critical retention ZIPs
if len(critical_zips) > 0:
    report += "| ZIP Code | Branch | Active | Terminated | Total | Retention Rate |\n"
    report += "|:--------:|:-------|-------:|-----------:|------:|---------------:|\n"
    for _, row in critical_zips.iterrows():
        branch_short = "Branch 1" if "Branch 1" in row['Branch'] else "Branch 2"
        report += f"| {row['ZIP']} | {branch_short} | {int(row['Active'])} | {int(row['Terminated'])} | {int(row['Total'])} | **{row['Retention_Rate']:.1f}%** |\n"
else:
    report += "No ZIP codes with retention rates below 15% threshold.\n"

report += """

**ZIP codes with 0% retention (all accounts terminated):**
"""

zero_retention = zip_retention_df[(zip_retention_df['Total'] > 0) & (zip_retention_df['Retention_Rate'] == 0)]
if len(zero_retention) > 0:
    for _, row in zero_retention.iterrows():
        branch_short = "Branch 1" if "Branch 1" in row['Branch'] else "Branch 2"
        report += f"- **{row['ZIP']}** ({branch_short}): {int(row['Terminated'])} terminated accounts, 0 active\n"
else:
    report += "None\n"

report += """

![ZIP Retention Detail](tucson_zip_retention_detail.png)

---

### 4. Revenue Distribution

Active annual revenue is distributed as follows across the proposed branches:

"""

total_revenue = stats['total_active_revenue']
for branch in stats['branches']:
    branch_name = "Branch 1" if "Branch 1" in branch['name'] else "Branch 2"
    pct_revenue = (branch['revenue'] / total_revenue) * 100 if total_revenue > 0 else 0
    report += f"- **{branch_name}:** ${branch['revenue']:,.2f} ({pct_revenue:.1f}% of assigned territory revenue)\n"

report += f"""
- **Total Active Revenue (Assigned Territories):** ${total_revenue:,.2f}

![Revenue Distribution](tucson_revenue_distribution.png)

---

## Strategic Recommendations

### Priority 1: Address the Casa Grande Gap (CRITICAL)

**Issue:** Casa Grande represents {casa_grande_pct:.1f}% of all accounts but is completely absent from the 2-branch plan.

**Recommendations:**
1. **Option A - Separate Casa Grande Branch:** Create a third branch specifically for Casa Grande and surrounding areas
   - Would serve {casa_grande_total:,} accounts
   - Allows specialized focus on this large market segment
   - Consistent with the decentralization strategy
   
2. **Option B - Assign to Existing Branch:** Temporarily assign Casa Grande to one of the two Tucson branches
   - Not recommended due to geographic distance (~60 miles from Tucson)
   - Would defeat the purpose of creating focused, high-density territories
   
3. **Option C - Partner Branch or Franchise Model:** Explore local partnership model for Casa Grande
   - Could leverage local expertise and relationships
   - Aligns with the JV framework mentioned in Phoenix analysis

**Recommendation:** **Option A (Separate Branch)** is strongly recommended given the account volume and geographic separation.

### Priority 2: Address Retention Crisis

**Issue:** Overall retention rate of {stats['overall_retention']:.1f}% is critically low and indicates fundamental operational problems.

**Immediate Actions Required:**
1. **Root Cause Analysis:** Conduct comprehensive analysis of terminated accounts
   - Interview former customers to understand reasons for termination
   - Analyze service quality, pricing, and competitive factors
   - Review operational efficiency and customer communication

2. **Focus on High-Risk ZIP Codes:**
"""

# Add high-risk ZIPs
high_risk_zips = zip_retention_df[
    (zip_retention_df['Total'] >= 5) & 
    (zip_retention_df['Retention_Rate'] < 20)
]['ZIP'].tolist()

report += f"   - Immediate retention programs for ZIP codes: {', '.join([str(z) for z in high_risk_zips])}\n"
report += """   - Assign dedicated customer success managers to these territories
   - Implement proactive customer outreach and service quality monitoring

3. **Service Quality Improvements:**
   - Standardize service delivery processes
   - Implement real-time customer feedback systems
   - Enhance technician training and accountability

4. **Competitive Analysis:**
   - Evaluate competitor pricing and service offerings
   - Identify areas where competition may be stronger
   - Develop competitive differentiation strategies

### Priority 3: Optimize Territory Assignments

**Issue:** Several peripheral Tucson ZIP codes remain unassigned.

**Recommendations:**

"""

# Tucson-area unassigned ZIPs
tucson_unassigned = unassigned_df[unassigned_df['City'] == 'Tucson'].sort_values('Total', ascending=False)

if len(tucson_unassigned) > 0:
    report += "**Tucson ZIP Codes to Assign:**\n\n"
    report += "| ZIP Code | Current Accounts | Proposed Assignment | Rationale |\n"
    report += "|:--------:|-----------------:|:--------------------|:----------|\n"
    
    for _, row in tucson_unassigned.iterrows():
        zip_code = int(row['ZIP'])
        total = int(row['Total'])
        
        # Simple geographic assignment logic
        if zip_code in [85746, 85747, 85756, 85757]:
            assignment = "Branch 1 (East & North)"
            rationale = "Geographic proximity to existing Branch 1 territories"
        elif zip_code in [85735, 85739, 85713]:
            assignment = "Branch 2 (West & Central)"
            rationale = "Geographic proximity to existing Branch 2 territories"
        else:
            assignment = "Requires geographic analysis"
            rationale = "Insufficient data for recommendation"
        
        report += f"| {zip_code} | {total} | {assignment} | {rationale} |\n"

report += """

**Other Market Areas to Assign:**

| Area | ZIP Codes | Total Accounts | Recommendation |
|:-----|:----------|---------------:|:---------------|
| Marana | 85653, 85658 | """

marana_total = int(unassigned_df[unassigned_df['City'] == 'Marana']['Total'].sum())
report += f"{marana_total} | Assign to Branch 2 (Northwest proximity) |\n"

report += "| Vail | 85641, 85706 | "
vail_total = int(unassigned_df[unassigned_df['City'] == 'Vail']['Total'].sum())
report += f"{vail_total} | Assign to Branch 1 (Southeast proximity) |\n"

report += "| Green Valley / Sahuarita | 85614, 85629 | "
gv_total = int(unassigned_df[unassigned_df['City'].isin(['Green Valley', 'Sahuarita'])]['Total'].sum())
report += f"{gv_total} | Monitor; consider future expansion |\n"

report += """

### Priority 4: Branch-Specific Strategies

#### Branch 1 - Tucson East & North (Foothills Branch)
- **Strength:** Higher retention rate (25.00%) relative to Branch 2
- **Concern:** ZIP 85748 has 0% retention (7 terminated accounts)
- **Strategy:**
  - Leverage higher-income demographics for premium service offerings
  - Focus on repair and remodel revenue opportunities
  - Investigate and rectify issues in ZIP 85748 before reactivation efforts
  - Target customer base: affluent homeowners seeking premium service

#### Branch 2 - Tucson West & Central (Urban & Growth Branch)
- **Strength:** Covers high-growth Northwest areas
- **Concern:** Lower retention rate (18.55%); multiple ZIPs below 15%
- **Strategy:**
  - Optimize route efficiency in dense urban core
  - Develop competitive pricing strategies for cost-conscious markets
  - Focus heavily on operational excellence and service consistency
  - Consider volume-based efficiency improvements
  - Priority intervention needed in ZIPs: 85719, 85745, 85743, 85742, 85737

---

## Implementation Roadmap

### Phase 1: Immediate (Q1 2026)
1. **Complete territorial planning**
   - Assign all Tucson-area unassigned ZIP codes to appropriate branches
   - Develop detailed Casa Grande strategy (separate branch vs. alternative model)
   - Finalize organizational structure and staffing plans

2. **Launch retention improvement initiative**
   - Begin root cause analysis of terminated accounts
   - Implement customer feedback systems
   - Start reactivation campaigns in high-potential ZIP codes

### Phase 2: Branch Establishment (Q2-Q3 2026)
1. **Launch first branch** (recommend Branch 1 - East & North)
   - Higher retention rate suggests better operational foundation
   - Smaller territory allows focused management
   - Affluent customer base may be more forgiving during transition

2. **Establish performance monitoring systems**
   - Real-time retention tracking by ZIP code
   - Customer satisfaction metrics
   - Service delivery quality indicators
   - Revenue and profitability tracking

### Phase 3: Complete Rollout (Q4 2026)
1. **Launch Branch 2** (West & Central)
   - Incorporate lessons learned from Branch 1 launch
   - Implement enhanced retention programs from day one
   - Focus on operational efficiency given larger territory

2. **Address Casa Grande**
   - Launch separate branch or partnership model
   - Could be the highest-impact initiative given account volume

### Phase 4: Optimization (2027)
1. **Continuous improvement**
   - Monitor retention metrics closely
   - Adjust territories based on operational realities
   - Optimize staffing and resource allocation
   - Consider expansion into currently unassigned peripheral markets

---

## Success Metrics

### Primary Metric: Customer Retention
- **Current Baseline:** {stats['overall_retention']:.1f}%
- **Target Milestones:**
  - 6 months post-launch: 35% retention rate
  - 12 months post-launch: 50% retention rate
  - 24 months post-launch: 65%+ retention rate

### Secondary Metrics:
1. **Revenue Growth**
   - Current active annual revenue (assigned territories): ${stats['total_active_revenue']:,.2f}
   - Target: 20% year-over-year growth from combination of retention and acquisition

2. **Service Quality**
   - Customer satisfaction scores (target: >4.5/5.0)
   - Service delivery consistency (target: >95% on-time)
   - Response time to customer issues (target: <24 hours)

3. **Operational Efficiency**
   - Route density and optimization
   - Revenue per technician
   - Cost per service call

4. **Market Coverage**
   - Percentage of potential market served
   - Geographic expansion into peripheral markets

---

## Risk Assessment

### High-Risk Factors:

1. **Critically Low Baseline Retention ({stats['overall_retention']:.1f}%)**
   - **Risk:** Decentralization alone may not address underlying operational issues
   - **Mitigation:** Parallel focus on service quality improvements and competitive analysis
   - **Impact:** High - could result in continued customer loss even after reorganization

2. **Casa Grande Unaddressed ({casa_grande_pct:.1f}% of accounts)**
   - **Risk:** Leaving major market segment unplanned creates strategic gap
   - **Mitigation:** Prioritize Casa Grande decision in Phase 1 planning
   - **Impact:** High - represents significant revenue opportunity or risk

3. **Multiple Zero-Retention ZIP Codes**
   - **Risk:** Entire territories may have unsalvageable reputation
   - **Mitigation:** May need market re-entry strategy rather than simple reorganization
   - **Impact:** Medium - affects {len(zero_retention)} ZIP codes

4. **Branch 2 Low Retention (18.55%)**
   - **Risk:** Launching a branch with such low baseline retention may set up for failure
   - **Mitigation:** Delay Branch 2 launch until retention improvement programs show results
   - **Impact:** Medium - could delay full rollout by 6-12 months

### Medium-Risk Factors:

1. **Incomplete Territory Coverage**
   - **Risk:** Unassigned peripheral ZIP codes create service gaps
   - **Mitigation:** Quick assignment of remaining Tucson-area ZIPs to appropriate branches
   - **Impact:** Low-Medium - affects small number of accounts

2. **Branch Balance**
   - **Risk:** While numerically balanced, Branch 2 has 53.4% of accounts with worse retention
   - **Mitigation:** Ensure Branch 2 has appropriate resources and management expertise
   - **Impact:** Low - distribution is reasonably balanced

---

## Conclusion

The proposed 2-branch decentralization for Tucson represents a logical geographic split and creates operationally-focused territories. However, this analysis reveals critical challenges that must be addressed for successful implementation:

1. **The retention crisis ({stats['overall_retention']:.1f}%) is the fundamental issue** that decentralization alone cannot solve. Parallel initiatives for service quality improvement, competitive analysis, and customer success are essential.

2. **Casa Grande's absence from the plan is a critical gap** representing {casa_grande_pct:.1f}% of all accounts. This must be addressed immediately with a clear strategic decision.

3. **The proposed branch split is geographically sound and reasonably balanced**, providing a good foundation for implementation once retention improvement programs are in place.

4. **Phased implementation is recommended**, starting with Branch 1 (East & North) due to its higher retention baseline, followed by Branch 2 after proving the model and implementing lessons learned.

5. **Success is achievable but requires more than reorganization** - it demands operational excellence, service quality improvements, competitive positioning, and disciplined execution.

The company should view this reorganization as part of a comprehensive turnaround strategy rather than a simple territorial restructuring. With proper execution, the Tucson market could improve from {stats['overall_retention']:.1f}% to 65%+ retention within 24 months, dramatically improving profitability and market position.

---

## Appendices

### Appendix A: Complete ZIP Code Assignments

**Proposed Branch 1 - Tucson East & North:**
"""

branch1_zips = ['85718', '85749', '85750', '85710', '85748', '85730', '85715', '85711']
for zip_code in branch1_zips:
    zip_data = zip_retention_df[zip_retention_df['ZIP'] == zip_code]
    if len(zip_data) > 0:
        row = zip_data.iloc[0]
        report += f"- {zip_code}: {int(row['Active'])} active, {int(row['Terminated'])} terminated, {row['Retention_Rate']:.1f}% retention\n"

report += """

**Proposed Branch 2 - Tucson West & Central:**
"""

branch2_zips = ['85737', '85704', '85742', '85745', '85743', '85741', '85712', '85755', '85719', '85716', '85705']
for zip_code in branch2_zips:
    zip_data = zip_retention_df[zip_retention_df['ZIP'] == zip_code]
    if len(zip_data) > 0:
        row = zip_data.iloc[0]
        report += f"- {zip_code}: {int(row['Active'])} active, {int(row['Terminated'])} terminated, {row['Retention_Rate']:.1f}% retention\n"

report += """

### Appendix B: Data Files Generated

The following data files have been created for further analysis:
- `tucson_account_mapping.csv` - Complete account mapping to proposed branches
- `tucson_branch_stats.csv` - Branch-level statistics and metrics
- `tucson_zip_retention.csv` - ZIP code level retention analysis
- `tucson_unassigned_zips.csv` - Analysis of unassigned ZIP codes
- `tucson_summary_stats.json` - Summary statistics in JSON format

---

**End of Report**
"""

# Write report
with open('/home/ubuntu/Tucson_Branch_Decentralization_Analysis.md', 'w') as f:
    f.write(report)

print("✓ Comprehensive report created: Tucson_Branch_Decentralization_Analysis.md")


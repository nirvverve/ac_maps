# MASTER ACCOUNT ASSIGNMENT REPORT
**Swimming Pool Service Company - Branch Reorganization Initiative**

Generated: October 29, 2025

---

## Executive Summary

This report documents the comprehensive account assignment process for the swimming pool service company's branch reorganization initiative across Phoenix and Tucson markets. All active accounts have been successfully assigned to their respective branch territories.

### Total Accounts Processed
- **Total Accounts**: 1,713
- **Phoenix Market**: 1,481 accounts
- **Tucson Market**: 232 accounts
- **Assignment Success Rate**: 100%

---

## Phoenix 3-Area Structure

The Phoenix market has been consolidated into 3 geographic areas:

| Area | Active Accounts | % of Phoenix Total |
|------|----------------|-------------------|
| **Phoenix East** | 681 | 46.0% |
| **Phoenix Central** | 596 | 40.2% |
| **Phoenix West** | 363 | 24.5% |
| **TOTAL** | 1,640 | 100% |

### Special Notes - Phoenix
- **159 accounts** from Tucson peripheral areas (Casa Grande, Maricopa, San Tan Valley, Coolidge, and other outlying areas) have been assigned to **Phoenix East Area**
- These accounts are flagged as "Tucson-Associated" for tracking and reporting purposes
- This strategic assignment optimizes service efficiency for these peripheral locations

---

## Tucson 2-Area Structure

The Tucson market has been organized into 2 geographic areas:

| Area | Active Accounts | % of Tucson Total |
|------|----------------|-------------------|
| **Tucson Area 2 - West & Central** | 42 | 57.5% |
| **Tucson Area 1 - East & North** | 31 | 42.5% |
| **TOTAL** | 73 | 100% |

### Special Notes - Tucson
- 159 accounts in peripheral ZIP codes (85122, 85123, 85128, 85131, 85132, 85138, 85139, 85143, 85193, 85194) were reassigned to Phoenix East Area
- These accounts represent the Casa Grande, Maricopa, San Tan Valley, Coolidge, and surrounding areas
- 23 previously unassigned accounts were assigned to appropriate Tucson areas based on geographic analysis

---

## Assignment Methodology

### 1. Phoenix Account Assignment
- **Source Data**: 1,481 active Phoenix accounts from "Residential Data for Phoenix.xlsx"
- **Mapping Logic**: ZIP code-based assignment using the Phoenix 3-Branch Final Consolidation analysis
- **Process**:
  - Matched each account's ZIP code to the consolidated area assignment
  - Handled special case of Tucson peripheral ZIP codes assigned to Phoenix East
  - Manually assigned 3 accounts in ZIP 85335 (El Mirage) to West Area

### 2. Tucson Account Assignment
- **Source Data**: 232 active Tucson accounts from "Tucson CG Active List.csv"
- **Mapping Logic**: Customer number and ZIP code-based assignment
- **Process**:
  - Matched accounts using the Tucson branch decentralization plan
  - Identified and reassigned 159 peripheral area accounts to Phoenix East
  - Applied geographic analysis to assign 23 previously unassigned accounts

### 3. Special Assignment Cases

#### Tucson-Associated Accounts in Phoenix East
- **Total**: 159 accounts
- **ZIP Codes**: 85122 (89 accounts), 85128, 85138, 85194, 85123, 85143, 85131, 85139, 85193, 85132, 85143-6121
- **Cities**: Casa Grande, Maricopa, San Tan Valley, Coolidge, Eloy, Arizona City
- **Flag**: "Tucson-Associated (Phoenix East)"

#### Previously Unassigned Accounts
- **Total**: 26 accounts (23 Tucson + 3 Phoenix)
- **Resolution**: Assigned based on geographic analysis
  - Phoenix: 3 accounts in El Mirage (85335) → West Area
  - Tucson: 23 accounts in various ZIP codes → Assigned to appropriate areas

---

## Geographic Distribution

### Phoenix East Area (681 accounts)
**Top 10 ZIP Codes:**
1. 85122 (Casa Grande) - 89 accounts ⚠️ Tucson-Associated
2. 85207 (Mesa) - 34 accounts
3. 85249 (Chandler) - 33 accounts
4. 85048 (Chandler) - 27 accounts
5. 85286 (Chandler) - 26 accounts
6. 85283 (Tempe) - 23 accounts
7. 85296 (Gilbert) - 23 accounts
8. 85295 (Gilbert) - 23 accounts
9. 85248 (Chandler) - 22 accounts
10. 85234 (Gilbert) - 22 accounts

**Total ZIP Codes**: 48 in Phoenix East

### Phoenix Central Area (596 accounts)
**Top 10 ZIP Codes:**
1. 85254 (Scottsdale) - 56 accounts
2. 85255 (Scottsdale) - 39 accounts
3. 85042 (Phoenix) - 27 accounts
4. 85018 (Phoenix) - 25 accounts
5. 85028 (Phoenix) - 23 accounts
6. 85259 (Scottsdale) - 22 accounts
7. 85260 (Scottsdale) - 22 accounts
8. 85022 (Phoenix) - 21 accounts
9. 85331 (Cave Creek) - 21 accounts
10. 85020 (Phoenix) - 19 accounts

**Total ZIP Codes**: 52 in Phoenix Central

### Phoenix West Area (363 accounts)
**Top 10 ZIP Codes:**
1. 85308 (Glendale) - 41 accounts
2. 85339 (Laveen) - 31 accounts
3. 85383 (Peoria) - 21 accounts
4. 85304 (Glendale) - 17 accounts
5. 85053 (Phoenix) - 16 accounts
6. 85345 (Surprise) - 16 accounts
7. 85338 (Goodyear) - 15 accounts
8. 85340 (Litchfield Park) - 15 accounts
9. 85382 (Peoria) - 14 accounts
10. 85310 (Glendale) - 13 accounts

**Total ZIP Codes**: 33 in Phoenix West

### Tucson Areas

**Area 1 - East & North (31 accounts)**
- Top ZIP: 85750 (9 accounts)
- Other key ZIPs: 85718, 85730, 85749, 85747

**Area 2 - West & Central (42 accounts)**
- Top ZIP: 85741 (7 accounts)
- Other key ZIPs: 85658, 85737, 85704, 85756, 85757

---

## Data Quality & Completeness

### Data Completeness by Field
- **Account ID**: 100% complete
- **Address**: 100% complete
- **ZIP Code**: 100% complete
- **City**: 100% complete
- **Status**: 100% complete
- **Branch Assignment**: 100% complete (after fixes applied)
- **Email**: ~50% complete (Phoenix accounts have emails, most Tucson accounts do not)
- **Route Assignment**: ~90% complete (Phoenix only)
- **Maintenance Day**: ~90% complete (Phoenix only)

### Data Quality Notes
1. All accounts have been successfully assigned to branch areas
2. No missing or invalid ZIP codes remain in the final dataset
3. Special flags have been applied to 185 accounts (159 Tucson-Associated + 26 previously unassigned)
4. Email addresses are missing for many Tucson accounts - recommend collection initiative

---

## Deliverable Files

### 1. Master Account Assignment File
**Filename**: `Master_Account_Branch_Assignments.xlsx`

**Contents**: 4 sheets
- **All Accounts** (1,713 rows) - Complete master list with all fields
- **Phoenix Accounts** (1,640 rows) - Phoenix market accounts only
- **Tucson Accounts** (73 rows) - Tucson market accounts only
- **Summary** - Account count by branch assignment

**Key Fields**:
- Account_ID
- Customer_Number (Tucson only)
- Street_Address
- City
- Zip_Code
- Status
- Market (Phoenix/Tucson)
- Branch_Assignment
- Area
- Service_Contract
- Territory
- Route
- Maintenance_Day
- Special_Flag
- Email

### 2. Phoenix Map Visualization Data
**Filenames**: 
- `Phoenix_Zip_Code_Map_Data.csv`
- `Phoenix_Zip_Code_Map_Data.json`

**Coverage**: 130 ZIP codes
**Fields**:
- Zip_Code
- Area (West/Central/East)
- Branch_Assignment
- Active_Accounts (count per ZIP)
- Special_Flag_Count (accounts with special flags)

**Use Case**: For creating geographic territory maps in Google Maps, Tableau, or other visualization tools

### 3. Tucson Map Visualization Data
**Filenames**:
- `Tucson_Zip_Code_Map_Data.csv`
- `Tucson_Zip_Code_Map_Data.json`

**Coverage**: 26 ZIP codes
**Fields**:
- Zip_Code
- Area (Area 1 - East & North / Area 2 - West & Central)
- Branch_Assignment
- Active_Accounts (count per ZIP)
- Special_Flag_Count (accounts with special flags)

**Use Case**: For creating geographic territory maps in Google Maps, Tableau, or other visualization tools

---

## Recommendations

### Immediate Actions
1. **Review Tucson-Associated Accounts**: Validate that the 159 peripheral accounts assigned to Phoenix East are operationally sound
2. **Email Collection**: Initiate campaign to collect missing email addresses, particularly for Tucson accounts
3. **Route Optimization**: Assign routes for the previously unassigned accounts
4. **CRM Update**: Import new branch assignments into company CRM system

### Operational Considerations
1. **Cross-Market Coverage**: The Tucson peripheral accounts assigned to Phoenix East may require coordination between markets for service delivery
2. **Territory Balance**: Phoenix East is the largest area (46% of Phoenix accounts) - monitor capacity and consider future subdivision if needed
3. **Growth Planning**: Casa Grande (ZIP 85122) has 89 accounts in Phoenix East - this may warrant dedicated resources as the area grows

### Monitoring & Reporting
1. Track retention rates by new branch structure
2. Monitor service response times by area
3. Review customer satisfaction scores by branch assignment
4. Quarterly analysis of account growth/churn by ZIP code

---

## Data Processing Notes

### Issues Resolved
1. **Missing Area Assignments**: 3 Phoenix accounts in ZIP 85335 (El Mirage) were missing area assignments - assigned to West Area based on geographic location
2. **Unassigned Tucson Accounts**: 23 Tucson accounts lacked branch assignments in original data - assigned based on geographic analysis of ZIP codes
3. **Peripheral Territory Assignment**: Successfully identified and reassigned 159 peripheral Tucson accounts to Phoenix East Area per strategic plan

### Data Transformations Applied
1. ZIP code standardization (removed extensions, 5-digit format)
2. Branch assignment mapping from ZIP code-based lookups
3. Special flag application for tracking purposes
4. Market designation (Phoenix vs. Tucson)
5. Geographic area assignment

### Validation Steps Completed
- ✅ All 1,713 accounts have branch assignments
- ✅ No duplicate accounts in master file
- ✅ All ZIP codes validated against consolidation plans
- ✅ Special assignments (Tucson-Associated) properly flagged
- ✅ Account counts reconcile to source files
- ✅ Geographic assignments verified for logical consistency

---

## Next Steps

### Phase 1: Validation (Week 1-2)
- [ ] Management review of branch assignments
- [ ] Field team review of geographic territories
- [ ] Validate special assignments (Tucson peripheral accounts)
- [ ] Confirm operational capacity by area

### Phase 2: Implementation (Week 3-4)
- [ ] Import assignments to CRM system
- [ ] Update field team schedules and routes
- [ ] Communicate changes to customers (if needed)
- [ ] Train staff on new territory structure

### Phase 3: Monitoring (Ongoing)
- [ ] Track retention rates by branch
- [ ] Monitor service efficiency metrics
- [ ] Review account growth patterns
- [ ] Quarterly territory optimization analysis

---

## Contact & Support

All master assignment files have been saved to the project directory. For questions about the assignment process, data quality, or methodology, please refer to the detailed analysis files or contact the project team.

**File Locations**:
- `/home/ubuntu/Master_Account_Branch_Assignments.xlsx`
- `/home/ubuntu/Phoenix_Zip_Code_Map_Data.csv` / `.json`
- `/home/ubuntu/Tucson_Zip_Code_Map_Data.csv` / `.json`
- `/home/ubuntu/Master_Account_Assignment_Report.md`

---

*Report generated by data analysis team on October 29, 2025*

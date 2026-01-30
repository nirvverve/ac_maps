# Master Account Assignment - Quick Reference Guide

## 📊 Summary Statistics

### Total Account Distribution
- **Total Accounts**: 1,713
- **Phoenix Market**: 1,640 accounts (95.7%)
- **Tucson Market**: 73 accounts (4.3%)
- **Total ZIP Codes**: 156

### Phoenix 3-Area Breakdown
| Area | Accounts | % of Phoenix | ZIP Codes |
|------|----------|--------------|-----------|
| Phoenix East | 681 | 41.5% | 47 |
| Phoenix Central | 596 | 36.3% | 49 |
| Phoenix West | 363 | 22.1% | 34 |

### Tucson 2-Area Breakdown
| Area | Accounts | % of Tucson | ZIP Codes |
|------|----------|-------------|-----------|
| Tucson Area 2 - West & Central | 42 | 57.5% | 16 |
| Tucson Area 1 - East & North | 31 | 42.5% | 10 |

## 📁 Deliverable Files

### 1. Master Account File
**File**: `Master_Account_Branch_Assignments.xlsx`
- **Sheet 1**: All Accounts (1,713 rows)
- **Sheet 2**: Phoenix Accounts (1,640 rows)
- **Sheet 3**: Tucson Accounts (73 rows)
- **Sheet 4**: Summary (account counts by branch)

**Key Columns**:
- `Account_ID` - Customer name/identifier
- `Street_Address`, `City`, `Zip_Code` - Full address
- `Branch_Assignment` - New branch/area assignment
- `Area` - Geographic area name
- `Market` - Phoenix or Tucson
- `Special_Flag` - Notes for special cases

### 2. Map Visualization Data

#### Phoenix Map Data
- **Files**: `Phoenix_Zip_Code_Map_Data.csv` and `.json`
- **Coverage**: 130 ZIP codes
- **Use**: Create territory maps showing Phoenix East/Central/West areas

#### Tucson Map Data
- **Files**: `Tucson_Zip_Code_Map_Data.csv` and `.json`
- **Coverage**: 26 ZIP codes  
- **Use**: Create territory maps showing Tucson Area 1 and Area 2

**Data Structure**:
```
Zip_Code | Area | Branch_Assignment | Active_Accounts | Special_Flag_Count
```

### 3. Reports & Visualizations
- `Master_Account_Assignment_Report.md` / `.pdf` - Comprehensive analysis report
- `Master_Account_Assignment_Summary.html` - Interactive visualization dashboard

## 🔍 Special Cases

### Tucson-Associated Accounts in Phoenix East (159 accounts)
These are accounts in peripheral areas that were operationally reassigned from Tucson to Phoenix East:

**ZIP Codes**: 85122, 85128, 85138, 85194, 85123, 85143, 85131, 85139, 85193, 85132
**Cities**: Casa Grande, Maricopa, San Tan Valley, Coolidge, Eloy, Arizona City

**Key Points**:
- Flagged with "Tucson-Associated (Phoenix East)" in Special_Flag column
- Assigned to Phoenix East for operational efficiency
- Should be tracked separately for reporting purposes

### Previously Unassigned Accounts (23 accounts)
Accounts that lacked branch assignments in original data:
- **Phoenix**: 3 accounts in El Mirage (85335) → Assigned to West
- **Tucson**: 23 accounts in various ZIPs → Assigned based on geographic analysis

## 🗺️ Using Map Data for Visualization

### For Google My Maps:
1. Open Google My Maps (https://www.google.com/maps/d/)
2. Click "Create a new map"
3. Import the CSV file (`Phoenix_Zip_Code_Map_Data.csv` or `Tucson_Zip_Code_Map_Data.csv`)
4. Set `Zip_Code` as the location column
5. Use `Area` for color coding
6. Use `Active_Accounts` for marker size

### For Tableau/Power BI:
1. Import the CSV file as data source
2. Use built-in ZIP code geocoding
3. Create a map visualization
4. Color by `Area` field
5. Size markers by `Active_Accounts`

### Color Coding Recommendations:

**Phoenix Areas:**
- West: Red (#FF6B6B)
- Central: Teal (#4ECDC4)  
- East: Blue (#45B7D1)

**Tucson Areas:**
- Area 1 (East & North): Mint (#95E1D3)
- Area 2 (West & Central): Pink (#F38181)

## 📌 Key ZIP Codes to Note

### Highest Account Concentration:
1. **85122 (Casa Grande)** - 89 accounts - ⚠️ Tucson-Associated in Phoenix East
2. **85254 (Scottsdale)** - 56 accounts - Phoenix Central
3. **85308 (Glendale)** - 41 accounts - Phoenix West

### Geographic Boundaries:

**Phoenix West**: Northwest valley (Glendale, Peoria, Surprise, Goodyear, Avondale, Litchfield Park, Buckeye, El Mirage)

**Phoenix Central**: Central Phoenix, Central/North Scottsdale, Paradise Valley, Cave Creek

**Phoenix East**: Mesa, Chandler, Gilbert, Tempe, Queen Creek, Apache Junction, Gold Canyon, and peripheral areas (Casa Grande, Maricopa, San Tan Valley)

**Tucson Area 1 (East & North)**: East Tucson, Foothills, Catalina

**Tucson Area 2 (West & Central)**: Central Tucson, West Tucson, Marana, Oro Valley

## ✅ Next Steps Checklist

### Immediate (Week 1-2):
- [ ] Review master assignment file
- [ ] Validate special assignments (Tucson-Associated accounts)
- [ ] Create territory maps using map visualization data
- [ ] Share assignments with field teams for feedback

### Implementation (Week 3-4):
- [ ] Import assignments to CRM system
- [ ] Update routing and scheduling systems
- [ ] Assign account managers to each area
- [ ] Communicate with customers if needed

### Ongoing:
- [ ] Monitor retention rates by branch
- [ ] Track service efficiency metrics  
- [ ] Review quarterly for territory optimization
- [ ] Analyze growth patterns by ZIP code

## 📧 File Locations

All files are saved in: `/home/ubuntu/`

```
Master_Account_Branch_Assignments.xlsx
Phoenix_Zip_Code_Map_Data.csv
Phoenix_Zip_Code_Map_Data.json
Tucson_Zip_Code_Map_Data.csv
Tucson_Zip_Code_Map_Data.json
Master_Account_Assignment_Report.md
Master_Account_Assignment_Report.pdf
Master_Account_Assignment_Summary.html
Quick_Reference_Guide.md (this file)
```

## 💡 Tips for Using the Data

1. **Filter by Special_Flag** to identify accounts needing special attention
2. **Sort by Active_Accounts** in map data to prioritize high-density ZIP codes
3. **Use the Summary sheet** in Excel for quick counts and pivot tables
4. **Reference the detailed report** (PDF/MD) for methodology and context
5. **Open the HTML summary** for an interactive visual overview

---

*Generated: October 29, 2025*

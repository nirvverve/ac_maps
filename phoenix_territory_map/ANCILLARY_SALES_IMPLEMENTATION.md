# Ancillary Sales Analysis Implementation

## Overview
Implemented a comprehensive ancillary sales analysis feature for the Arizona territory, enabling data-driven marketing budget allocation decisions based on ZIP code performance and customer value metrics.

## Data Processing

### Source Data
- **File**: `Total Ancillary Sales Repair OTS Remodel for AP Phoenix.csv`
- **Records**: 27,434 transactions
- **Date Range**: 2020-2026
- **Sale Types**:
  - **OTS (Other Than Service)**: Minor non-repair tasks (originally labeled as "Maintenance" in data)
  - **Repair**: Major repair tasks
  - **Remodel**: Major renovation projects

### Processing Script
**File**: `nextjs_space/process_ancillary_sales.js`

**Key Functions**:
1. **CSV Parsing**: Processes sales data with amount normalization (removes $, commas)
2. **Type Mapping**: Converts "Maintenance" → "OTS" for consistency
3. **Aggregation**:
   - View 1: Groups by ZIP code, year, and sale type
   - View 2: Calculates 2025 totals and averages per active customer
4. **Customer Counts**: Integrates with `route-assignments.json` for active customer counts
5. **Coordinates**: Extracts ZIP centroids from `az-zip-boundaries.json`

**Output**: `public/ancillary-sales-data.json`

### Data Structure

#### View 1: By Year Analysis
```json
{
  "zip": "85122",
  "year": 2025,
  "city": "Casa Grande",
  "ots": 3191.19,
  "repair": 57029.05,
  "remodel": 0,
  "total": 60220.24,
  "latitude": 32.926,
  "longitude": -111.748
}
```

#### View 2: 2025 Detailed Analysis
```json
{
  "zip": "85286",
  "city": "Chandler",
  "activeCustomers": 25,
  "ots": 258.86,
  "repair": 25926.41,
  "remodel": 95570.37,
  "total": 121755.64,
  "avgOts": 10.35,
  "avgRepair": 1037.06,
  "avgRemodel": 3822.81,
  "avgTotal": 4870.23,
  "latitude": 33.269,
  "longitude": -111.824
}
```

## User Interface

### Component: `AncillarySalesView`
**File**: `components/ancillary-sales-view.tsx`

**Features**:
1. **Dual View Mode**:
   - **By Year**: Analyze total sales by ZIP code for any year (2020-2026)
   - **2025 Analysis**: Detailed totals and per-customer averages for 2025

2. **Interactive Map**:
   - Color-coded ZIP boundaries by sales volume (gradient from green to red)
   - Clickable polygons with detailed info windows
   - Automatic centering on Arizona territory

3. **Summary Statistics**:
   - Total Sales card
   - OTS Sales card
   - Repair Sales card
   - Remodel Sales card

4. **Data Table**:
   - Top 20 ZIP codes ranked by total sales
   - Sortable columns for each sale type
   - Currency formatting for all amounts
   - Conditional columns based on view mode:
     - View 1: ZIP, OTS, Repair, Remodel, Total
     - View 2: ZIP, Active Customers, OTS, Repair, Remodel, Total, Avg per Customer

### Navigation
**Integration**: `territory-map.tsx`
- Added "Ancillary Sales" button to Arizona-specific controls
- Button color: Amber (distinguishes from other view types)
- Icon: DollarSign (lucide-react)
- View mode: 'ancillarySales'

## Key Metrics

### 2025 Performance
- **Total Ancillary Sales**: $1,288,773.43
- **Top 5 ZIP Codes**:
  1. 85286 (Chandler): $121,755.64 (25 customers, $4,870 avg)
  2. 85122 (Casa Grande): $60,220.24 (89 customers, $677 avg)
  3. 85255 (Scottsdale): $51,341.38 (38 customers, $1,351 avg)
  4. 85009 (Phoenix): $30,434.40 (1 customer)
  5. 85018 (Phoenix): $29,270.19 (25 customers, $1,171 avg)

### Sales Type Breakdown (2025)
- **OTS**: Minor revenue stream
- **Repair**: Consistent across territories
- **Remodel**: High-value opportunities, concentrated in specific ZIPs

## Business Value

### Marketing Allocation Insights
1. **High-Value ZIP Codes**: 
   - ZIP 85286 shows exceptional remodel revenue ($95,570) with strong per-customer average
   - Ideal target for premium service promotions

2. **Volume vs. Value Analysis**:
   - ZIP 85122 has 89 customers but lower average ($677)
   - Opportunity for upselling repair and remodel services

3. **Trend Analysis**:
   - View 1 enables year-over-year comparison
   - Identify growing/declining territories
   - Adjust marketing spend accordingly

## Technical Implementation

### Dependencies Added
- `csv-parser@3.2.0`: CSV file parsing

### File Modifications
1. **New Files**:
   - `process_ancillary_sales.js`: Data processing script
   - `components/ancillary-sales-view.tsx`: Main component (456 lines)
   - `public/ancillary-sales-data.json`: Processed data output

2. **Modified Files**:
   - `components/territory-map.tsx`:
     - Added 'ancillarySales' to ViewMode type
     - Imported AncillarySalesView component
     - Added navigation button
     - Added rendering logic

### Data Flow
1. User uploads CSV → `/Uploads/Total Ancillary Sales...csv`
2. Processing script reads CSV and integrates with existing data
3. Script outputs JSON to `public/ancillary-sales-data.json`
4. Component loads JSON and boundaries on mount
5. User interacts with view modes and filters
6. Map and table update dynamically

## Usage Instructions

### Accessing the Feature
1. Log in to the application
2. Ensure location is set to "Arizona"
3. Click "Ancillary Sales" button (amber-colored)

### Using View 1 (By Year)
1. Select year from dropdown (2020-2026)
2. View color-coded map showing sales intensity
3. Click ZIP codes for detailed breakdown
4. Review top 20 ZIPs in table below map

### Using View 2 (2025 Analysis)
1. Automatically shows 2025 data
2. Map displays sales density with customer count context
3. Click ZIP codes to see:
   - Active customer count
   - Total sales by type
   - Average per customer (key metric for marketing ROI)
4. Sort table by any column to find:
   - Highest total sales
   - Best per-customer averages
   - Remodel opportunities

## Future Enhancements

### Potential Improvements
1. **Filtering**:
   - Filter by sale type (OTS only, Repair only, etc.)
   - Filter by sales threshold (e.g., ZIPs > $10k)
   - Territory filter integration

2. **Visualizations**:
   - Trend charts showing YoY growth
   - Sale type distribution pie charts
   - Customer lifetime value calculations

3. **Export**:
   - CSV export of filtered data
   - PDF reports for executives
   - Marketing territory recommendations

4. **Automation**:
   - Scheduled data refresh from updated CSV
   - Automatic anomaly detection (sudden drops/spikes)
   - Predictive modeling for 2026 budget planning

## Deployment Notes

### Files to Deploy
- `nextjs_space/components/ancillary-sales-view.tsx`
- `nextjs_space/components/territory-map.tsx` (modified)
- `nextjs_space/public/ancillary-sales-data.json`
- `nextjs_space/process_ancillary_sales.js` (for future updates)

### Environment Requirements
- Node.js with csv-parser package
- Access to route-assignments.json for customer counts
- Access to az-zip-boundaries.json for coordinates

### Data Refresh Process
1. Replace CSV file in `/Uploads/`
2. Run: `cd nextjs_space && node process_ancillary_sales.js`
3. Verify output in `public/ancillary-sales-data.json`
4. Restart application or hard refresh browser

## Summary

This implementation provides comprehensive ancillary sales analysis capabilities, enabling APS to make data-driven decisions about marketing budget allocation. The dual-view approach offers both historical trend analysis and detailed per-customer metrics, supporting both strategic planning and tactical marketing optimization.

**Key Success Metrics**:
- ✅ 794 view1 records (ZIP + Year + Type combinations)
- ✅ 155 view2 records (2025 ZIP-level analysis)
- ✅ 172 unique ZIP codes analyzed
- ✅ 7 years of historical data (2020-2026)
- ✅ Full integration with existing customer and territory data

**Business Impact**:
- Identify $1.3M in annual ancillary revenue opportunities
- Target high-value ZIP codes with avg customer value up to $4,870
- Optimize marketing spend across 172 ZIP codes
- Enable year-over-year performance tracking

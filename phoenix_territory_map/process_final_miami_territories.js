const fs = require('fs');
const path = require('path');

// Load territory assignments (the final North/Central/South assignments)
const territoryAssignments = JSON.parse(
  fs.readFileSync('/home/ubuntu/Uploads/miami-territory-assignments-2026-01-22.json', 'utf8')
);

// Create ZIP to territory lookup
const zipToTerritory = {};
territoryAssignments.forEach(t => {
  zipToTerritory[t.zip] = t.territory;
});

console.log('Territory assignments loaded:', Object.keys(zipToTerritory).length, 'ZIPs');

// Load existing geocoded data
const existingData = JSON.parse(
  fs.readFileSync('./nextjs_space/public/miami-route-assignments.json', 'utf8')
);

console.log('Existing geocoded data:', existingData.length, 'records');

// Create lookup by customer number
const geocodedLookup = {};
existingData.forEach(r => {
  geocodedLookup[r.customerNumber] = r;
});

// Read Excel file using Python
const { execSync } = require('child_process');
const pythonScript = `
import openpyxl
import json

wb = openpyxl.load_workbook('/home/ubuntu/Uploads/Miami Service Days and Routes.xlsx')
ws = wb['Miami Service Days']

customers = []
for row_idx in range(2, ws.max_row + 1):
    customer = {
        'customerNumber': ws.cell(row=row_idx, column=1).value,
        'accountName': ws.cell(row=row_idx, column=2).value,
        'address': ws.cell(row=row_idx, column=3).value,
        'city': ws.cell(row=row_idx, column=4).value,
        'state': ws.cell(row=row_idx, column=5).value,
        'zip': str(ws.cell(row=row_idx, column=6).value).strip() if ws.cell(row=row_idx, column=6).value else '',
        'route': ws.cell(row=row_idx, column=7).value,
        'serviceDays': ws.cell(row=row_idx, column=8).value
    }
    if customer['customerNumber']:
        customers.append(customer)

print(json.dumps(customers))
`;

const excelData = JSON.parse(execSync(`python3 -c '${pythonScript}'`).toString());
console.log('Excel data loaded:', excelData.length, 'customers');

// Process customers - merge with geocoded data and assign territories
const finalCustomers = [];
let missingGeocode = 0;
let missingTerritory = 0;

excelData.forEach(customer => {
  const geocoded = geocodedLookup[customer.customerNumber];
  const zip = customer.zip.toString().padStart(5, '0');
  const territory = zipToTerritory[zip];
  
  if (!geocoded) {
    missingGeocode++;
    console.log('Missing geocode for:', customer.customerNumber, customer.address);
  }
  
  if (!territory) {
    missingTerritory++;
    console.log('Missing territory for ZIP:', zip, '- Customer:', customer.customerNumber);
  }
  
  finalCustomers.push({
    customerNumber: customer.customerNumber,
    accountName: customer.accountName,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: zip,
    route: customer.route,
    serviceDays: customer.serviceDays,
    latitude: geocoded?.latitude || null,
    longitude: geocoded?.longitude || null,
    monthlyPrice: geocoded?.monthlyPrice || 0,
    yearlyPrice: geocoded?.yearlyPrice || 0,
    oldTerritory: geocoded?.territory || '',
    newTerritory: territory || 'Unassigned'
  });
});

console.log('\\nProcessing complete:');
console.log('  Total customers:', finalCustomers.length);
console.log('  Missing geocode:', missingGeocode);
console.log('  Missing territory assignment:', missingTerritory);

// Analyze route conflicts
const routeAnalysis = {};
finalCustomers.forEach(c => {
  if (!c.route) return;
  
  if (!routeAnalysis[c.route]) {
    routeAnalysis[c.route] = {
      route: c.route,
      territories: {},
      customers: []
    };
  }
  
  routeAnalysis[c.route].customers.push(c);
  
  if (!routeAnalysis[c.route].territories[c.newTerritory]) {
    routeAnalysis[c.route].territories[c.newTerritory] = 0;
  }
  routeAnalysis[c.route].territories[c.newTerritory]++;
});

// Identify conflicting routes
const routeConflicts = [];
Object.values(routeAnalysis).forEach(route => {
  const territories = Object.keys(route.territories);
  const hasConflict = territories.length > 1;
  
  routeConflicts.push({
    route: route.route,
    totalCustomers: route.customers.length,
    territories: route.territories,
    hasConflict: hasConflict,
    primaryTerritory: Object.entries(route.territories)
      .sort((a, b) => b[1] - a[1])[0][0]
  });
});

// Sort by conflict status and total customers
routeConflicts.sort((a, b) => {
  if (a.hasConflict !== b.hasConflict) return b.hasConflict ? 1 : -1;
  return b.totalCustomers - a.totalCustomers;
});

console.log('\\n=== Route Conflict Analysis ===');
let conflictCount = 0;
routeConflicts.forEach(r => {
  if (r.hasConflict) {
    conflictCount++;
    console.log(`CONFLICT: ${r.route} - ${r.totalCustomers} customers`);
    Object.entries(r.territories).forEach(([t, count]) => {
      console.log(`    ${t}: ${count}`);
    });
  }
});
console.log(`\\nTotal routes with conflicts: ${conflictCount} / ${routeConflicts.length}`);

// Save final customer data
fs.writeFileSync(
  './nextjs_space/public/miami-final-territory-data.json',
  JSON.stringify(finalCustomers, null, 2)
);
console.log('\\nSaved miami-final-territory-data.json');

// Save route analysis
fs.writeFileSync(
  './nextjs_space/public/miami-route-conflicts.json',
  JSON.stringify(routeConflicts, null, 2)
);
console.log('Saved miami-route-conflicts.json');

// Save the territory assignments (for the map)
fs.writeFileSync(
  './nextjs_space/public/miami-final-territory-assignments.json',
  JSON.stringify(territoryAssignments, null, 2)
);
console.log('Saved miami-final-territory-assignments.json');

// Summary by territory
console.log('\\n=== Territory Summary ===');
const territorySummary = { North: 0, Central: 0, South: 0, Unassigned: 0 };
finalCustomers.forEach(c => {
  if (territorySummary[c.newTerritory] !== undefined) {
    territorySummary[c.newTerritory]++;
  } else {
    territorySummary.Unassigned++;
  }
});
Object.entries(territorySummary).forEach(([t, count]) => {
  console.log(`  ${t}: ${count} customers`);
});

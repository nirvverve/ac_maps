const fs = require('fs');
const path = require('path');
const XLSX = require('/opt/hostedapp/node/root/app/node_modules/xlsx');

// Read the existing Miami customers to get geocoded data
const miamiCustomers = JSON.parse(fs.readFileSync(path.join(__dirname, 'nextjs_space/public/miami-route-assignments.json'), 'utf8'));

// Create a lookup map by customer number
const customerLookup = {};
miamiCustomers.forEach(c => {
  if (c.customerNumber) {
    customerLookup[c.customerNumber] = c;
  }
});

// Read Excel
const workbook = XLSX.readFile('/home/ubuntu/Uploads/Miami Commercial Routes 1 20 2026.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(`Read ${data.length} rows from Excel`);

// Extract individual days from service patterns
function extractDays(daysString) {
  if (!daysString || daysString === 'MISSING') return ['Unknown'];
  
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const foundDays = [];
  
  dayNames.forEach(day => {
    if (daysString.includes(day)) {
      foundDays.push(day);
    }
  });
  
  return foundDays.length > 0 ? foundDays : ['Unknown'];
}

// Process each row
const commercialAccounts = [];
let geocodeNeeded = [];

data.forEach(row => {
  const customerNumber = row['Customer Number'];
  // Handle column with trailing space
  const route = (row['Route '] || row['Route'] || 'MISSING').toString().trim();
  const daysOfService = (row['Days of Service'] || 'MISSING').toString().trim();
  const days = extractDays(daysOfService);
  
  // Try to find existing geocoded data
  const existingCustomer = customerLookup[customerNumber];
  
  const baseRecord = {
    customerNumber: customerNumber,
    accountName: row['Name of Property'] || '',
    address: row['Street'] || '',
    city: row['City'] || '',
    state: row['State'] || 'FL',
    zip: (row['ZIP'] || '').toString(),
    route: route === 'MISSING' ? 'Unassigned' : route,
    routeTech: route === 'MISSING' ? 'Unassigned' : route.replace(/^\d+\s+AFP\s+Route\s+/, ''),
    daysOfServiceRaw: daysOfService,
    days: days,
    monthlyPrice: row['Sum of Total_Monthly_Contract__c'] || 0,
    oldTerritory: row['Name'] || '',
    latitude: existingCustomer?.latitude || null,
    longitude: existingCustomer?.longitude || null,
  };
  
  if (!baseRecord.latitude || !baseRecord.longitude) {
    geocodeNeeded.push(baseRecord);
  }
  
  commercialAccounts.push(baseRecord);
});

console.log(`Processed ${commercialAccounts.length} commercial accounts`);
console.log(`Need geocoding: ${geocodeNeeded.length}`);

// Summary by route
const routeCounts = {};
commercialAccounts.forEach(c => {
  routeCounts[c.route] = (routeCounts[c.route] || 0) + 1;
});
console.log('\nRoute distribution:');
Object.entries(routeCounts).sort((a,b) => b[1] - a[1]).forEach(([route, count]) => {
  console.log(`  ${route}: ${count}`);
});

// Summary by day
const dayCounts = {};
commercialAccounts.forEach(c => {
  c.days.forEach(day => {
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
});
console.log('\nDay distribution (split by individual days):');
Object.entries(dayCounts).sort((a,b) => b[1] - a[1]).forEach(([day, count]) => {
  console.log(`  ${day}: ${count}`);
});

// Save initial data
fs.writeFileSync(
  path.join(__dirname, 'nextjs_space/public/miami-commercial-routes.json'),
  JSON.stringify(commercialAccounts, null, 2)
);
console.log('\n✓ Saved miami-commercial-routes.json');

// Output addresses needing geocoding
if (geocodeNeeded.length > 0) {
  console.log('\nAddresses needing geocoding:');
  geocodeNeeded.slice(0, 10).forEach(c => {
    console.log(`  ${c.customerNumber}: ${c.address}, ${c.city}, ${c.state} ${c.zip}`);
  });
  if (geocodeNeeded.length > 10) {
    console.log(`  ... and ${geocodeNeeded.length - 10} more`);
  }
}

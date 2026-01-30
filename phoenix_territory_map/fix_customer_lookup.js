const fs = require('fs');
const path = require('path');

function regenerateCustomerLookup() {
  // Read route assignments (has correct data)
  const routeAssignments = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'nextjs_space/public/route-assignments.json'), 'utf-8')
  );

  // Create a map of customer data from route assignments
  const customerMap = new Map();

  routeAssignments.forEach(route => {
    const accountNumber = route.customerNumber;
    
    if (!customerMap.has(accountNumber)) {
      customerMap.set(accountNumber, {
        accountNumber: accountNumber,
        customerName: route.customerName || 'Unknown',
        address: route.address || 'Address Not Available',
        zipCode: route.zipCode || '',
        city: route.city || null,
        territory: route.territory || 'Unassigned',
        latitude: route.latitude || null,
        longitude: route.longitude || null,
        status: 'Active'
      });
    }
  });

  // Convert map to array and sort by account number
  const customerLookupData = Array.from(customerMap.values())
    .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));

  // Write the corrected customer lookup file
  fs.writeFileSync(
    path.join(__dirname, 'nextjs_space/public/customer-lookup.json'),
    JSON.stringify(customerLookupData, null, 2)
  );

  console.log(`✅ Generated customer-lookup.json with ${customerLookupData.length} records`);
  
  return customerLookupData.length;
}

// If run directly
if (require.main === module) {
  const count = regenerateCustomerLookup();
  console.log(`\n📊 Sample record (A-002474):`);
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'nextjs_space/public/customer-lookup.json'), 'utf-8'));
  const sampleRecord = data.find(r => r.accountNumber === 'A-002474');
  if (sampleRecord) {
    console.log(JSON.stringify(sampleRecord, null, 2));
  }
}

// Export for use as module
module.exports = regenerateCustomerLookup;

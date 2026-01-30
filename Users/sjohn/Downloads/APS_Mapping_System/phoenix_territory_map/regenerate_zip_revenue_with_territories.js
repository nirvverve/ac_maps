const fs = require('fs');

function processLocation(location) {
  console.log(`\n=== Processing ${location.toUpperCase()} ===`);
  
  const routeFile = `nextjs_space/public/${location}-route-assignments.json`;
  const outputFile = `nextjs_space/public/${location}-zip-revenue-data.json`;
  
  if (!fs.existsSync(routeFile)) {
    console.log(`⚠️  ${routeFile} not found, skipping`);
    return;
  }
  
  const routes = JSON.parse(fs.readFileSync(routeFile, 'utf8'));
  
  // Group by ZIP code
  const zipData = {};
  
  routes.forEach(account => {
    const zip = account.zip;
    if (!zip) return;
    
    if (!zipData[zip]) {
      zipData[zip] = {
        zip: zip,
        city: account.city || '',
        territories: {},
        totalMonthlyRevenue: 0,
        totalYearlyRevenue: 0,
        residentialCount: 0,
        commercialCount: 0,
        totalAccounts: 0
      };
    }
    
    const monthly = account.monthlyPrice || 0;
    const yearly = account.yearlyPrice || 0;
    const territory = account.territory || 'Unknown';
    
    // Count territories
    zipData[zip].territories[territory] = (zipData[zip].territories[territory] || 0) + 1;
    
    zipData[zip].totalMonthlyRevenue += monthly;
    zipData[zip].totalYearlyRevenue += yearly;
    zipData[zip].totalAccounts += 1;
    
    if (account.accountType === 'Residential') {
      zipData[zip].residentialCount += 1;
    } else if (account.accountType === 'Commercial') {
      zipData[zip].commercialCount += 1;
    }
  });
  
  // Convert to array and add dominant territory
  const zipArray = Object.values(zipData).map(zip => {
    // Find the most common territory in this ZIP
    const territories = Object.entries(zip.territories);
    territories.sort((a, b) => b[1] - a[1]); // Sort by count descending
    const dominantTerritory = territories[0] ? territories[0][0] : 'Unknown';
    
    return {
      zip: zip.zip,
      city: zip.city,
      territory: dominantTerritory,
      totalMonthlyRevenue: zip.totalMonthlyRevenue,
      totalYearlyRevenue: zip.totalYearlyRevenue,
      residentialCount: zip.residentialCount,
      commercialCount: zip.commercialCount,
      totalAccounts: zip.totalAccounts,
      accountCount: zip.totalAccounts // Alias for compatibility
    };
  });
  
  // Sort by ZIP code
  zipArray.sort((a, b) => a.zip.localeCompare(b.zip));
  
  fs.writeFileSync(outputFile, JSON.stringify(zipArray, null, 2));
  
  console.log(`✓ Processed ${zipArray.length} ZIPs`);
  console.log(`  Total accounts: ${zipArray.reduce((sum, z) => sum + z.totalAccounts, 0)}`);
  console.log(`  Monthly revenue: $${zipArray.reduce((sum, z) => sum + z.totalMonthlyRevenue, 0).toLocaleString()}`);
  
  // Show territory breakdown
  const territoryCount = {};
  zipArray.forEach(z => {
    territoryCount[z.territory] = (territoryCount[z.territory] || 0) + z.totalAccounts;
  });
  console.log(`  Territories:`);
  Object.entries(territoryCount).sort((a, b) => b[1] - a[1]).forEach(([t, count]) => {
    console.log(`    ${t}: ${count} accounts`);
  });
}

// Process all locations
['dallas', 'orlando', 'portcharlotte', 'miami'].forEach(processLocation);

console.log('\n✅ All locations processed');

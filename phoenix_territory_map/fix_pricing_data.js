const fs = require('fs');
const xlsx = require('./nextjs_space/node_modules/xlsx');

// Helper to safely parse number
function safeParseFloat(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// Fix Dallas pricing
function fixDallasPricing() {
  console.log('Fixing Dallas pricing...');
  
  const workbook = xlsx.readFile('/home/ubuntu/Uploads/Customer List Dallas as of 12 30 2025.xlsx');
  const residential = xlsx.utils.sheet_to_json(workbook.Sheets['Residential']);
  const commercial = xlsx.utils.sheet_to_json(workbook.Sheets['Commercial']);
  
  // Create pricing lookup (note: column names may have spaces)
  const pricingLookup = {};
  residential.forEach(row => {
    const priceKey = Object.keys(row).find(k => k.trim() === 'Total Monthly Contract Price') || 'Total Monthly Contract Price';
    pricingLookup[row['Customer Number']] = safeParseFloat(row[priceKey]);
  });
  commercial.forEach(row => {
    const priceKey = Object.keys(row).find(k => k.trim() === 'Monthly Contract Price') || 'Monthly Contract Price';
    pricingLookup[row['Customer Number']] = safeParseFloat(row[priceKey]);
  });
  
  // Update routes file
  const routes = JSON.parse(fs.readFileSync('nextjs_space/public/dallas-route-assignments.json', 'utf8'));
  routes.forEach(record => {
    const monthlyPrice = pricingLookup[record.customerNumber] || 0;
    record.monthlyPrice = monthlyPrice;
    record.yearlyPrice = monthlyPrice * 12;
  });
  fs.writeFileSync('nextjs_space/public/dallas-route-assignments.json', JSON.stringify(routes, null, 2));
  
  // Recalculate revenue data
  const zipRevenue = {};
  routes.forEach(record => {
    const zip = record.zip;
    if (!zipRevenue[zip]) {
      zipRevenue[zip] = {
        zip: zip,
        totalMonthlyRevenue: 0,
        totalYearlyRevenue: 0,
        residentialCount: 0,
        commercialCount: 0,
        totalAccounts: 0
      };
    }
    zipRevenue[zip].totalMonthlyRevenue += record.monthlyPrice;
    zipRevenue[zip].totalYearlyRevenue += record.yearlyPrice;
    if (record.accountType === 'Residential') {
      zipRevenue[zip].residentialCount++;
    } else {
      zipRevenue[zip].commercialCount++;
    }
    zipRevenue[zip].totalAccounts++;
  });
  fs.writeFileSync('nextjs_space/public/dallas-zip-revenue-data.json', JSON.stringify(Object.values(zipRevenue), null, 2));
  
  console.log(`✓ Dallas: ${routes.length} accounts, $${routes.reduce((sum, r) => sum + r.monthlyPrice, 0).toFixed(2)}/month`);
}

// Fix Orlando pricing
function fixOrlandoPricing() {
  console.log('Fixing Orlando pricing...');
  
  const workbook = xlsx.readFile('/home/ubuntu/Uploads/Customer List Orlando as of 12 30 2025.xlsx');
  const residential = xlsx.utils.sheet_to_json(workbook.Sheets['Residential']);
  
  const pricingLookup = {};
  residential.forEach(row => {
    const priceKey = Object.keys(row).find(k => k.trim() === 'Monthly Price') || 'Monthly Price';
    pricingLookup[row['Customer Number']] = safeParseFloat(row[priceKey]);
  });
  
  const routes = JSON.parse(fs.readFileSync('nextjs_space/public/orlando-route-assignments.json', 'utf8'));
  routes.forEach(record => {
    const monthlyPrice = pricingLookup[record.customerNumber] || 0;
    record.monthlyPrice = monthlyPrice;
    record.yearlyPrice = monthlyPrice * 12;
  });
  fs.writeFileSync('nextjs_space/public/orlando-route-assignments.json', JSON.stringify(routes, null, 2));
  
  const zipRevenue = {};
  routes.forEach(record => {
    const zip = record.zip;
    if (!zipRevenue[zip]) {
      zipRevenue[zip] = {
        zip: zip,
        totalMonthlyRevenue: 0,
        totalYearlyRevenue: 0,
        residentialCount: 0,
        commercialCount: 0,
        totalAccounts: 0
      };
    }
    zipRevenue[zip].totalMonthlyRevenue += record.monthlyPrice;
    zipRevenue[zip].totalYearlyRevenue += record.yearlyPrice;
    if (record.accountType === 'Residential') {
      zipRevenue[zip].residentialCount++;
    } else {
      zipRevenue[zip].commercialCount++;
    }
    zipRevenue[zip].totalAccounts++;
  });
  fs.writeFileSync('nextjs_space/public/orlando-zip-revenue-data.json', JSON.stringify(Object.values(zipRevenue), null, 2));
  
  console.log(`✓ Orlando: ${routes.length} accounts, $${routes.reduce((sum, r) => sum + r.monthlyPrice, 0).toFixed(2)}/month`);
}

// Fix Port Charlotte pricing
function fixPortCharlottePricing() {
  console.log('Fixing Port Charlotte pricing...');
  
  const workbook = xlsx.readFile('/home/ubuntu/Uploads/Customer List Port Charlotte as of 12 30 2025.xlsx');
  const residential = xlsx.utils.sheet_to_json(workbook.Sheets['Residential Only']);
  
  const pricingLookup = {};
  residential.forEach(row => {
    const priceKey = Object.keys(row).find(k => k.trim() === 'Price Per Month') || 'Price Per Month';
    pricingLookup[row['Customer Number']] = safeParseFloat(row[priceKey]);
  });
  
  const routes = JSON.parse(fs.readFileSync('nextjs_space/public/portcharlotte-route-assignments.json', 'utf8'));
  routes.forEach(record => {
    const monthlyPrice = pricingLookup[record.customerNumber] || 0;
    record.monthlyPrice = monthlyPrice;
    record.yearlyPrice = monthlyPrice * 12;
  });
  fs.writeFileSync('nextjs_space/public/portcharlotte-route-assignments.json', JSON.stringify(routes, null, 2));
  
  const zipRevenue = {};
  routes.forEach(record => {
    const zip = record.zip;
    if (!zipRevenue[zip]) {
      zipRevenue[zip] = {
        zip: zip,
        totalMonthlyRevenue: 0,
        totalYearlyRevenue: 0,
        residentialCount: 0,
        commercialCount: 0,
        totalAccounts: 0
      };
    }
    zipRevenue[zip].totalMonthlyRevenue += record.monthlyPrice;
    zipRevenue[zip].totalYearlyRevenue += record.yearlyPrice;
    zipRevenue[zip].residentialCount++;
    zipRevenue[zip].totalAccounts++;
  });
  fs.writeFileSync('nextjs_space/public/portcharlotte-zip-revenue-data.json', JSON.stringify(Object.values(zipRevenue), null, 2));
  
  console.log(`✓ Port Charlotte: ${routes.length} accounts, $${routes.reduce((sum, r) => sum + r.monthlyPrice, 0).toFixed(2)}/month`);
}

// Fix Miami pricing
function fixMiamiPricing() {
  console.log('Fixing Miami pricing...');
  
  const workbook = xlsx.readFile('/home/ubuntu/Uploads/Customer List Miami as of 12 30 2025.xlsx');
  const residential = xlsx.utils.sheet_to_json(workbook.Sheets['Residential Customers']);
  const commercial = xlsx.utils.sheet_to_json(workbook.Sheets['Commercial Customers']);
  
  const pricingLookup = {};
  residential.forEach(row => {
    const priceKey = Object.keys(row).find(k => k.trim() === 'Monthly Contract Price') || 'Monthly Contract Price';
    pricingLookup[row['Customer Number']] = safeParseFloat(row[priceKey]);
  });
  commercial.forEach(row => {
    const priceKey = Object.keys(row).find(k => k.trim() === 'Sum of Total_Monthly_Contract__c') || 'Sum of Total_Monthly_Contract__c';
    pricingLookup[row['Customer Number']] = safeParseFloat(row[priceKey]);
  });
  
  const routes = JSON.parse(fs.readFileSync('nextjs_space/public/miami-route-assignments.json', 'utf8'));
  routes.forEach(record => {
    const monthlyPrice = pricingLookup[record.customerNumber] || 0;
    record.monthlyPrice = monthlyPrice;
    record.yearlyPrice = monthlyPrice * 12;
  });
  fs.writeFileSync('nextjs_space/public/miami-route-assignments.json', JSON.stringify(routes, null, 2));
  
  const zipRevenue = {};
  routes.forEach(record => {
    const zip = record.zip;
    if (!zipRevenue[zip]) {
      zipRevenue[zip] = {
        zip: zip,
        totalMonthlyRevenue: 0,
        totalYearlyRevenue: 0,
        residentialCount: 0,
        commercialCount: 0,
        totalAccounts: 0
      };
    }
    zipRevenue[zip].totalMonthlyRevenue += record.monthlyPrice;
    zipRevenue[zip].totalYearlyRevenue += record.yearlyPrice;
    if (record.accountType === 'Residential') {
      zipRevenue[zip].residentialCount++;
    } else {
      zipRevenue[zip].commercialCount++;
    }
    zipRevenue[zip].totalAccounts++;
  });
  fs.writeFileSync('nextjs_space/public/miami-zip-revenue-data.json', JSON.stringify(Object.values(zipRevenue), null, 2));
  
  console.log(`✓ Miami: ${routes.length} accounts, $${routes.reduce((sum, r) => sum + r.monthlyPrice, 0).toFixed(2)}/month`);
}

// Main
console.log('Fixing pricing data for all locations...');
fixDallasPricing();
fixOrlandoPricing();
fixPortCharlottePricing();
fixMiamiPricing();
console.log('\n✓ All pricing data fixed!');

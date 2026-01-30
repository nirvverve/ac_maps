const fs = require('fs');
const xlsx = require('./nextjs_space/node_modules/xlsx');
const https = require('https');

const API_KEY = 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';
const DELAY_MS = 30; // ~33 requests/second
const MAX_RETRIES = 2;

// Utility function to delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Geocode an address
async function geocodeAddress(address, retryCount = 0) {
  return new Promise((resolve, reject) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${API_KEY}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'OK' && parsed.results.length > 0) {
            const result = parsed.results[0];
            const location = result.geometry.location;
            resolve({
              latitude: location.lat,
              longitude: location.lng,
              formatted_address: result.formatted_address
            });
          } else if (parsed.status === 'OVER_QUERY_LIMIT' && retryCount < MAX_RETRIES) {
            console.log(`Rate limit hit, retrying in 1 second...`);
            setTimeout(() => {
              geocodeAddress(address, retryCount + 1).then(resolve).catch(reject);
            }, 1000);
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// Process Dallas data
async function processDallas() {
  console.log('\n========== Processing Dallas ==========');
  const workbook = xlsx.readFile('/home/ubuntu/Uploads/Customer List Dallas as of 12 30 2025.xlsx');
  
  const residentialSheet = workbook.Sheets['Residential'];
  const commercialSheet = workbook.Sheets['Commercial'];
  
  const residential = xlsx.utils.sheet_to_json(residentialSheet);
  const commercial = xlsx.utils.sheet_to_json(commercialSheet);
  
  console.log(`Dallas Residential: ${residential.length} accounts`);
  console.log(`Dallas Commercial: ${commercial.length} accounts`);
  
  // Process residential
  const residentialData = [];
  const residentialRoutes = [];
  const zipRevenue = {};
  
  for (let i = 0; i < residential.length; i++) {
    const row = residential[i];
    const address = `${row['ShippingStreet']}, ${row['ShippingCity']}, TX ${row['ShippingPostalCode']}`;
    
    console.log(`Geocoding residential ${i + 1}/${residential.length}: ${row['Customer Number']}`);
    
    const geo = await geocodeAddress(address);
    await delay(DELAY_MS);
    
    if (geo) {
      const zipCode = String(row['ShippingPostalCode'] || '').substring(0, 5);
      const monthlyPrice = parseFloat(row['Total Monthly Contract Price']) || 0;
      
      const record = {
        customerNumber: row['Customer Number'],
        accountName: row['Display Name'],
        address: row['ShippingStreet'],
        city: row['ShippingCity'],
        state: 'TX',
        zip: zipCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        monthlyPrice: monthlyPrice,
        yearlyPrice: monthlyPrice * 12,
        routeTech: row['Route Tech Name'] || '',
        territory: row['Service Territory Name'] || '',
        dayOfService: row['Maintenance Plan Day of Week'] || '',
        accountType: 'Residential'
      };
      
      residentialData.push(record);
      residentialRoutes.push(record);
      
      // Aggregate for revenue
      if (!zipRevenue[zipCode]) {
        zipRevenue[zipCode] = {
          zip: zipCode,
          totalMonthlyRevenue: 0,
          totalYearlyRevenue: 0,
          residentialCount: 0,
          commercialCount: 0,
          totalAccounts: 0
        };
      }
      zipRevenue[zipCode].totalMonthlyRevenue += monthlyPrice;
      zipRevenue[zipCode].totalYearlyRevenue += monthlyPrice * 12;
      zipRevenue[zipCode].residentialCount++;
      zipRevenue[zipCode].totalAccounts++;
    }
  }
  
  // Process commercial
  const commercialData = [];
  
  for (let i = 0; i < commercial.length; i++) {
    const row = commercial[i];
    const address = `${row['ShippingStreet']}, ${row['ShippingCity']}, TX ${row['ShippingPostalCode']}`;
    
    console.log(`Geocoding commercial ${i + 1}/${commercial.length}: ${row['Customer Number']}`);
    
    const geo = await geocodeAddress(address);
    await delay(DELAY_MS);
    
    if (geo) {
      const zipCode = String(row['ShippingPostalCode'] || '').substring(0, 5);
      const monthlyPrice = parseFloat(row['Monthly Contract Price']) || 0;
      
      const record = {
        customerNumber: row['Customer Number'],
        accountName: row['Display Name'],
        address: row['ShippingStreet'],
        city: row['ShippingCity'],
        state: 'TX',
        zip: zipCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        monthlyPrice: monthlyPrice,
        yearlyPrice: monthlyPrice * 12,
        routeTech: row['Route Tech'] || '',
        territory: row['Territory Name'] || '',
        dayOfService: row['Maintenance Plan Day of Week'] || '',
        accountType: 'Commercial'
      };
      
      commercialData.push(record);
      residentialRoutes.push(record); // Add to routes for tech assignment
      
      // Aggregate for revenue
      if (!zipRevenue[zipCode]) {
        zipRevenue[zipCode] = {
          zip: zipCode,
          totalMonthlyRevenue: 0,
          totalYearlyRevenue: 0,
          residentialCount: 0,
          commercialCount: 0,
          totalAccounts: 0
        };
      }
      zipRevenue[zipCode].totalMonthlyRevenue += monthlyPrice;
      zipRevenue[zipCode].totalYearlyRevenue += monthlyPrice * 12;
      zipRevenue[zipCode].commercialCount++;
      zipRevenue[zipCode].totalAccounts++;
    }
  }
  
  // Write files
  fs.writeFileSync(
    'nextjs_space/public/dallas-route-assignments.json',
    JSON.stringify(residentialRoutes, null, 2)
  );
  
  fs.writeFileSync(
    'nextjs_space/public/dallas-commercial-accounts.json',
    JSON.stringify(commercialData, null, 2)
  );
  
  fs.writeFileSync(
    'nextjs_space/public/dallas-zip-revenue-data.json',
    JSON.stringify(Object.values(zipRevenue), null, 2)
  );
  
  console.log(`✓ Dallas complete: ${residentialRoutes.length} total accounts`);
}

// Process Orlando data (commercial sheet doesn't exist, only residential)
async function processOrlando() {
  console.log('\n========== Processing Orlando ==========');
  const workbook = xlsx.readFile('/home/ubuntu/Uploads/Customer List Orlando as of 12 30 2025.xlsx');
  
  const residentialSheet = workbook.Sheets['Residential'];
  const residential = xlsx.utils.sheet_to_json(residentialSheet);
  
  console.log(`Orlando Residential: ${residential.length} accounts`);
  
  // Check if there's a Commercial sheet
  let commercial = [];
  if (workbook.SheetNames.includes('Commercial')) {
    const commercialSheet = workbook.Sheets['Commercial'];
    commercial = xlsx.utils.sheet_to_json(commercialSheet);
    console.log(`Orlando Commercial: ${commercial.length} accounts`);
  }
  
  const residentialData = [];
  const residentialRoutes = [];
  const zipRevenue = {};
  
  for (let i = 0; i < residential.length; i++) {
    const row = residential[i];
    const address = `${row['ShippingStreet']}, ${row['ShippingCity']}, FL ${row['ShippingPostalCode']}`;
    
    console.log(`Geocoding residential ${i + 1}/${residential.length}: ${row['Customer Number']}`);
    
    const geo = await geocodeAddress(address);
    await delay(DELAY_MS);
    
    if (geo) {
      const zipCode = String(row['ShippingPostalCode'] || '').substring(0, 5);
      const monthlyPrice = parseFloat(row['Monthly Price']) || 0;
      
      const record = {
        customerNumber: row['Customer Number'],
        accountName: row['Display Name'],
        address: row['ShippingStreet'],
        city: row['ShippingCity'],
        state: 'FL',
        zip: zipCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        monthlyPrice: monthlyPrice,
        yearlyPrice: monthlyPrice * 12,
        routeTech: row['Route Tech'] || '',
        territory: row['Service Territory'] || '',
        dayOfService: row['Maintenance Plan Day of Week'] || '',
        accountType: 'Residential'
      };
      
      residentialData.push(record);
      residentialRoutes.push(record);
      
      if (!zipRevenue[zipCode]) {
        zipRevenue[zipCode] = {
          zip: zipCode,
          totalMonthlyRevenue: 0,
          totalYearlyRevenue: 0,
          residentialCount: 0,
          commercialCount: 0,
          totalAccounts: 0
        };
      }
      zipRevenue[zipCode].totalMonthlyRevenue += monthlyPrice;
      zipRevenue[zipCode].totalYearlyRevenue += monthlyPrice * 12;
      zipRevenue[zipCode].residentialCount++;
      zipRevenue[zipCode].totalAccounts++;
    }
  }
  
  // Process commercial if exists
  const commercialData = [];
  for (let i = 0; i < commercial.length; i++) {
    const row = commercial[i];
    const address = `${row['ShippingStreet']}, ${row['ShippingCity']}, FL ${row['ShippingPostalCode']}`;
    
    console.log(`Geocoding commercial ${i + 1}/${commercial.length}: ${row['Customer Number']}`);
    
    const geo = await geocodeAddress(address);
    await delay(DELAY_MS);
    
    if (geo) {
      const zipCode = String(row['ShippingPostalCode'] || '').substring(0, 5);
      const monthlyPrice = parseFloat(row['Monthly Price'] || row['Monthly Contract Price']) || 0;
      
      const record = {
        customerNumber: row['Customer Number'],
        accountName: row['Display Name'],
        address: row['ShippingStreet'],
        city: row['ShippingCity'],
        state: 'FL',
        zip: zipCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        monthlyPrice: monthlyPrice,
        yearlyPrice: monthlyPrice * 12,
        routeTech: row['Route Tech'] || row['Service Tech'] || '',
        territory: row['Service Territory'] || row['Territory'] || '',
        dayOfService: row['Maintenance Plan Day of Week'] || '',
        accountType: 'Commercial'
      };
      
      commercialData.push(record);
      residentialRoutes.push(record);
      
      if (!zipRevenue[zipCode]) {
        zipRevenue[zipCode] = {
          zip: zipCode,
          totalMonthlyRevenue: 0,
          totalYearlyRevenue: 0,
          residentialCount: 0,
          commercialCount: 0,
          totalAccounts: 0
        };
      }
      zipRevenue[zipCode].totalMonthlyRevenue += monthlyPrice;
      zipRevenue[zipCode].totalYearlyRevenue += monthlyPrice * 12;
      zipRevenue[zipCode].commercialCount++;
      zipRevenue[zipCode].totalAccounts++;
    }
  }
  
  fs.writeFileSync(
    'nextjs_space/public/orlando-route-assignments.json',
    JSON.stringify(residentialRoutes, null, 2)
  );
  
  if (commercialData.length > 0) {
    fs.writeFileSync(
      'nextjs_space/public/orlando-commercial-accounts.json',
      JSON.stringify(commercialData, null, 2)
    );
  }
  
  fs.writeFileSync(
    'nextjs_space/public/orlando-zip-revenue-data.json',
    JSON.stringify(Object.values(zipRevenue), null, 2)
  );
  
  console.log(`✓ Orlando complete: ${residentialRoutes.length} total accounts`);
}

// Process Port Charlotte data (residential only)
async function processPortCharlotte() {
  console.log('\n========== Processing Port Charlotte ==========');
  const workbook = xlsx.readFile('/home/ubuntu/Uploads/Customer List Port Charlotte as of 12 30 2025.xlsx');
  
  const residentialSheet = workbook.Sheets['Residential Only'];
  const residential = xlsx.utils.sheet_to_json(residentialSheet);
  
  console.log(`Port Charlotte Residential: ${residential.length} accounts`);
  
  const residentialData = [];
  const residentialRoutes = [];
  const zipRevenue = {};
  const densityData = {};
  
  for (let i = 0; i < residential.length; i++) {
    const row = residential[i];
    const address = `${row['ShippingStreet']}, ${row['ShippingCity']}, FL ${row['ShippingPostalCode']}`;
    
    console.log(`Geocoding residential ${i + 1}/${residential.length}: ${row['Customer Number']}`);
    
    const geo = await geocodeAddress(address);
    await delay(DELAY_MS);
    
    if (geo) {
      const zipCode = String(row['ShippingPostalCode'] || '').substring(0, 5);
      const monthlyPrice = parseFloat(row['Price Per Month']) || 0;
      
      const record = {
        customerNumber: row['Customer Number'],
        accountName: row['Display Name'],
        address: row['ShippingStreet'],
        city: row['ShippingCity'],
        state: 'FL',
        zip: zipCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        monthlyPrice: monthlyPrice,
        yearlyPrice: monthlyPrice * 12,
        routeTech: row['Service Tech Name'] || '',
        territory: row['Service Territory'] || '',
        dayOfService: row['Day of the Week'] || '',
        accountType: 'Residential'
      };
      
      residentialData.push(record);
      residentialRoutes.push(record);
      
      if (!zipRevenue[zipCode]) {
        zipRevenue[zipCode] = {
          zip: zipCode,
          totalMonthlyRevenue: 0,
          totalYearlyRevenue: 0,
          residentialCount: 0,
          commercialCount: 0,
          totalAccounts: 0
        };
      }
      zipRevenue[zipCode].totalMonthlyRevenue += monthlyPrice;
      zipRevenue[zipCode].totalYearlyRevenue += monthlyPrice * 12;
      zipRevenue[zipCode].residentialCount++;
      zipRevenue[zipCode].totalAccounts++;
      
      // Density data (active accounts only for now)
      if (!densityData[zipCode]) {
        densityData[zipCode] = {
          zipCode: zipCode,
          area: 'Port Charlotte', // Single territory
          activeCount: 0,
          terminatedCount: 0,
          totalHistorical: 0,
          churnRate: 0
        };
      }
      densityData[zipCode].activeCount++;
      densityData[zipCode].totalHistorical++;
    }
  }
  
  fs.writeFileSync(
    'nextjs_space/public/portcharlotte-route-assignments.json',
    JSON.stringify(residentialRoutes, null, 2)
  );
  
  fs.writeFileSync(
    'nextjs_space/public/portcharlotte-zip-revenue-data.json',
    JSON.stringify(Object.values(zipRevenue), null, 2)
  );
  
  fs.writeFileSync(
    'nextjs_space/public/portcharlotte-density-data.json',
    JSON.stringify(Object.values(densityData), null, 2)
  );
  
  console.log(`✓ Port Charlotte complete: ${residentialRoutes.length} total accounts`);
}

// Process Miami data
async function processMiami() {
  console.log('\n========== Processing Miami ==========');
  const workbook = xlsx.readFile('/home/ubuntu/Uploads/Customer List Miami as of 12 30 2025.xlsx');
  
  const residentialSheet = workbook.Sheets['Residential Customers'];
  const commercialSheet = workbook.Sheets['Commercial Customers'];
  
  const residential = xlsx.utils.sheet_to_json(residentialSheet);
  const commercial = xlsx.utils.sheet_to_json(commercialSheet);
  
  console.log(`Miami Residential: ${residential.length} accounts`);
  console.log(`Miami Commercial: ${commercial.length} accounts`);
  
  const residentialData = [];
  const residentialRoutes = [];
  const zipRevenue = {};
  
  for (let i = 0; i < residential.length; i++) {
    const row = residential[i];
    const address = `${row['ShippingStreet']}, ${row['ShippingCity']}, FL ${row['ShippingPostalCode']}`;
    
    console.log(`Geocoding residential ${i + 1}/${residential.length}: ${row['Customer Number']}`);
    
    const geo = await geocodeAddress(address);
    await delay(DELAY_MS);
    
    if (geo) {
      const zipCode = String(row['ShippingPostalCode'] || '').substring(0, 5);
      const monthlyPrice = parseFloat(row['Monthly Contract Price']) || 0;
      
      const record = {
        customerNumber: row['Customer Number'],
        accountName: row['Display Name'],
        address: row['ShippingStreet'],
        city: row['ShippingCity'],
        state: 'FL',
        zip: zipCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        monthlyPrice: monthlyPrice,
        yearlyPrice: monthlyPrice * 12,
        routeTech: row['Route Tech Name'] || '',
        territory: row['Territory Name'] || '',
        dayOfService: row['Maintenance Plan Day of Week'] || '',
        accountType: 'Residential'
      };
      
      residentialData.push(record);
      residentialRoutes.push(record);
      
      if (!zipRevenue[zipCode]) {
        zipRevenue[zipCode] = {
          zip: zipCode,
          totalMonthlyRevenue: 0,
          totalYearlyRevenue: 0,
          residentialCount: 0,
          commercialCount: 0,
          totalAccounts: 0
        };
      }
      zipRevenue[zipCode].totalMonthlyRevenue += monthlyPrice;
      zipRevenue[zipCode].totalYearlyRevenue += monthlyPrice * 12;
      zipRevenue[zipCode].residentialCount++;
      zipRevenue[zipCode].totalAccounts++;
    }
  }
  
  // Process commercial
  const commercialData = [];
  
  for (let i = 0; i < commercial.length; i++) {
    const row = commercial[i];
    const address = `${row['ShippingStreet']}, ${row['ShippingCity']}, FL ${row['ShippingPostalCode']}`;
    
    console.log(`Geocoding commercial ${i + 1}/${commercial.length}: ${row['Customer Number']}`);
    
    const geo = await geocodeAddress(address);
    await delay(DELAY_MS);
    
    if (geo) {
      const zipCode = String(row['ShippingPostalCode'] || '').substring(0, 5);
      const monthlyPrice = parseFloat(row['Sum of Total_Monthly_Contract__c']) || 0;
      
      const record = {
        customerNumber: row['Customer Number'],
        accountName: row['Display Name'],
        address: row['ShippingStreet'],
        city: row['ShippingCity'],
        state: 'FL',
        zip: zipCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        monthlyPrice: monthlyPrice,
        yearlyPrice: monthlyPrice * 12,
        routeTech: row['Service Tech'] || '',
        territory: row['Territory'] || '',
        dayOfService: row['Maintenance Plan Day of Week'] || '',
        accountType: 'Commercial'
      };
      
      commercialData.push(record);
      residentialRoutes.push(record);
      
      if (!zipRevenue[zipCode]) {
        zipRevenue[zipCode] = {
          zip: zipCode,
          totalMonthlyRevenue: 0,
          totalYearlyRevenue: 0,
          residentialCount: 0,
          commercialCount: 0,
          totalAccounts: 0
        };
      }
      zipRevenue[zipCode].totalMonthlyRevenue += monthlyPrice;
      zipRevenue[zipCode].totalYearlyRevenue += monthlyPrice * 12;
      zipRevenue[zipCode].commercialCount++;
      zipRevenue[zipCode].totalAccounts++;
    }
  }
  
  fs.writeFileSync(
    'nextjs_space/public/miami-route-assignments.json',
    JSON.stringify(residentialRoutes, null, 2)
  );
  
  fs.writeFileSync(
    'nextjs_space/public/miami-commercial-accounts.json',
    JSON.stringify(commercialData, null, 2)
  );
  
  fs.writeFileSync(
    'nextjs_space/public/miami-zip-revenue-data.json',
    JSON.stringify(Object.values(zipRevenue), null, 2)
  );
  
  console.log(`✓ Miami complete: ${residentialRoutes.length} total accounts`);
}

// Main execution
async function main() {
  console.log('Starting data processing for all locations...');
  
  try {
    await processDallas();
    await processOrlando();
    await processPortCharlotte();
    await processMiami();
    
    console.log('\n========== ALL PROCESSING COMPLETE ==========');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

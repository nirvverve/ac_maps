const fs = require('fs');
const https = require('https');

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim());
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= headers.length) {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ? values[index].trim() : '';
      });
      records.push(record);
    }
  }
  return records;
}

const GOOGLE_API_KEY = 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';
const DELAY_MS = 30; // 33 requests/second
const MAX_RETRIES = 3;

// Miami office location
const OFFICE_LOCATION = {
  address: '11720 Biscayne Blvd Miami FL 33181',
  lat: null,
  lng: null
};

// Highway boundary coordinates (approximate)
const BOUNDARIES = {
  // NORTH boundary (everything north of these roads)
  NORTH_BOUNDARY: 25.89, // SR 916 / NE 135th St / NW 138th St
  
  // SOUTH boundary (everything south of these roads)  
  SOUTH_BOUNDARY: 25.843, // SR 934 / NW 74th St
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeAddress(address, retries = 0) {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results.length > 0) {
            const result = json.results[0];
            resolve({
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng,
              formatted: result.formatted_address,
              locationType: result.geometry.location_type
            });
          } else if (json.status === 'OVER_QUERY_LIMIT' && retries < MAX_RETRIES) {
            console.log(`Rate limit hit, retrying in 2s... (${retries + 1}/${MAX_RETRIES})`);
            setTimeout(() => {
              geocodeAddress(address, retries + 1).then(resolve).catch(reject);
            }, 2000);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function assignTerritory(lat, lng) {
  // North territory: north of SR 916 / NE 135th St / NW 138th St (lat > 25.89)
  if (lat >= BOUNDARIES.NORTH_BOUNDARY) {
    return 'North';
  }
  
  // South territory: south of SR 934 / NW 74th St (lat < 25.843)
  if (lat <= BOUNDARIES.SOUTH_BOUNDARY) {
    return 'South';
  }
  
  // Central territory: everything in between
  return 'Central';
}

async function processCustomers() {
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync('/home/ubuntu/Uploads/Customer List Miami as of 12 30 2025.csv', 'utf-8');
  
  const records = parseCSV(csvContent);
  
  console.log(`Found ${records.length} customer records`);
  
  // First, geocode the office location
  console.log('\nGeocoding office location...');
  const officeGeo = await geocodeAddress(OFFICE_LOCATION.address);
  if (officeGeo) {
    OFFICE_LOCATION.lat = officeGeo.lat;
    OFFICE_LOCATION.lng = officeGeo.lng;
    console.log(`Office location: ${officeGeo.lat}, ${officeGeo.lng}`);
  } else {
    console.error('Failed to geocode office location!');
    process.exit(1);
  }
  
  // Group by unique addresses to minimize API calls
  const addressMap = new Map();
  records.forEach(record => {
    const fullAddress = `${record.ShippingStreet}, ${record.ShippingCity}, FL ${record.ShippingPostalCode}`;
    if (!addressMap.has(fullAddress)) {
      addressMap.set(fullAddress, []);
    }
    addressMap.get(fullAddress).push(record);
  });
  
  console.log(`\nGeocoding ${addressMap.size} unique addresses...`);
  
  const processedCustomers = [];
  let processed = 0;
  let failed = 0;
  const startTime = Date.now();
  
  for (const [address, customers] of addressMap.entries()) {
    const geo = await geocodeAddress(address);
    
    if (geo) {
      const territory = assignTerritory(geo.lat, geo.lng);
      
      customers.forEach(customer => {
        const monthlyPrice = parseFloat(customer['Sum of Total_Monthly_Contract__c']) || 0;
        
        processedCustomers.push({
          customerNumber: customer.Customer_Number__c,
          customerName: customer['Display Name'] || 'Unknown',
          address: customer.ShippingStreet,
          city: customer.ShippingCity,
          state: 'FL',
          zip: customer.ShippingPostalCode,
          monthlyPrice: monthlyPrice,
          yearlyPrice: monthlyPrice * 12,
          route: customer.Name || '',
          dayOfService: customer['Maintenance Plan Day of Week'] || '',
          territory: territory,
          latitude: geo.lat,
          longitude: geo.lng,
          status: 'Active'
        });
      });
    } else {
      failed++;
      console.log(`Failed to geocode: ${address}`);
    }
    
    processed++;
    if (processed % 50 === 0) {
      const elapsed = Date.now() - startTime;
      const rate = processed / (elapsed / 1000);
      const remaining = addressMap.size - processed;
      const eta = Math.ceil(remaining / rate);
      console.log(`Progress: ${processed}/${addressMap.size} (${Math.round(processed/addressMap.size*100)}%) - ETA: ${eta}s`);
    }
    
    await delay(DELAY_MS);
  }
  
  console.log(`\nGeocoding complete! ${processedCustomers.length} customers processed, ${failed} failed`);
  
  // Generate statistics
  const stats = {
    North: processedCustomers.filter(c => c.territory === 'North').length,
    Central: processedCustomers.filter(c => c.territory === 'Central').length,
    South: processedCustomers.filter(c => c.territory === 'South').length
  };
  
  console.log('\nTerritory Distribution:');
  console.log(`  North: ${stats.North} customers`);
  console.log(`  Central: ${stats.Central} customers`);
  console.log(`  South: ${stats.South} customers`);
  console.log(`  Total: ${processedCustomers.length} customers`);
  
  // Sort by customer number
  processedCustomers.sort((a, b) => a.customerNumber.localeCompare(b.customerNumber));
  
  // Save Miami route assignments
  const outputPath = '/home/ubuntu/phoenix_territory_map/nextjs_space/public/miami-route-assignments.json';
  fs.writeFileSync(outputPath, JSON.stringify(processedCustomers, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
  
  // Generate ZIP code aggregated data
  const zipData = new Map();
  processedCustomers.forEach(customer => {
    if (!zipData.has(customer.zip)) {
      zipData.set(customer.zip, {
        zip: customer.zip,
        territory: customer.territory,
        accountCount: 0,
        city: customer.city,
        latitude: customer.latitude,
        longitude: customer.longitude
      });
    }
    const zip = zipData.get(customer.zip);
    zip.accountCount++;
  });
  
  const zipArray = Array.from(zipData.values()).sort((a, b) => a.zip.localeCompare(b.zip));
  const zipOutputPath = '/home/ubuntu/phoenix_territory_map/nextjs_space/public/miami-map-data.json';
  fs.writeFileSync(zipOutputPath, JSON.stringify(zipArray, null, 2));
  console.log(`Saved ZIP data to: ${zipOutputPath}`);
  
  // Save office location
  const officeData = [{
    zipCode: '33181',
    territory: 'Miami Office',
    fullName: 'APS of Miami',
    category: 'MIAMI',
    label: 'APS of Miami - Central Office',
    lat: OFFICE_LOCATION.lat,
    lng: OFFICE_LOCATION.lng
  }];
  
  const officeOutputPath = '/home/ubuntu/phoenix_territory_map/nextjs_space/public/miami-office-location.json';
  fs.writeFileSync(officeOutputPath, JSON.stringify(officeData, null, 2));
  console.log(`Saved office data to: ${officeOutputPath}`);
  
  console.log('\nProcessing complete!');
}

processCustomers().catch(console.error);

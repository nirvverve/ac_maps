const https = require('https');
const fs = require('fs');
const XLSX = require('xlsx');

const API_KEY = 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';
const DELAY_MS = 100; // Delay between API calls
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results && json.results[0]) {
            const location = json.results[0].geometry.location;
            resolve({ lat: location.lat, lng: location.lng, status: 'OK' });
          } else {
            resolve({ lat: null, lng: null, status: json.status });
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function geocodeWithRetry(address, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await geocodeAddress(address);
      if (result.status === 'OK') {
        return result;
      }
      console.log(`Attempt ${i + 1} failed for ${address}, status: ${result.status}`);
      await sleep(DELAY_MS * 2);
    } catch (error) {
      console.log(`Attempt ${i + 1} error for ${address}:`, error.message);
      await sleep(DELAY_MS * 2);
    }
  }
  return { lat: null, lng: null, status: 'FAILED' };
}

async function processPortCharlotte() {
  console.log('=== Processing Port Charlotte Data ===\n');
  
  // Read the Excel file
  const workbook = XLSX.readFile('/home/ubuntu/Uploads/Customer List Port Charlotte as of 12 30 2025.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Total accounts: ${data.length}\n`);
  
  const routeAssignments = [];
  let geocodedCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const customerNumber = row['Customer Number'];
    const displayName = row['Display Name'] || '';
    const street = (row['ShippingStreet'] || '').trim();
    const city = (row['ShippingCity'] || '').trim();
    const zip = String(row['ShippingPostalCode'] || '').trim();
    const pricePerMonth = row['Price Per Month'] || 140;
    const technician = (row['Service Tech Name'] || '').trim();
    const territory = (row['Service Territory'] || 'All Pool - Outlying Maintenance').trim();
    const dayOfWeek = (row['Day of the Week'] || '').trim();
    
    // Build full address
    const fullAddress = `${street}, ${city}, FL ${zip}`;
    
    console.log(`[${i + 1}/${data.length}] Geocoding: ${customerNumber} - ${fullAddress}`);
    
    // Geocode the address
    const geoResult = await geocodeAddress(fullAddress);
    await sleep(DELAY_MS);
    
    if (geoResult.status === 'OK' && geoResult.lat && geoResult.lng) {
      geocodedCount++;
      routeAssignments.push({
        customerNumber: customerNumber,
        displayName: displayName,
        address: street,
        city: city,
        state: 'FL',
        zipCode: zip,
        territory: territory,
        technician: technician || 'Unassigned',
        dayOfWeek: dayOfWeek,
        latitude: geoResult.lat,
        longitude: geoResult.lng,
        monthlyPrice: pricePerMonth,
        yearlyPrice: pricePerMonth * 12
      });
      console.log(`  ✓ Success: ${geoResult.lat}, ${geoResult.lng}`);
    } else {
      failedCount++;
      console.log(`  ✗ Failed: ${geoResult.status}`);
      // Still add the record with null coordinates
      routeAssignments.push({
        customerNumber: customerNumber,
        displayName: displayName,
        address: street,
        city: city,
        state: 'FL',
        zipCode: zip,
        territory: territory,
        technician: technician || 'Unassigned',
        dayOfWeek: dayOfWeek,
        latitude: null,
        longitude: null,
        monthlyPrice: pricePerMonth,
        yearlyPrice: pricePerMonth * 12
      });
    }
  }
  
  // Write the route assignments file
  const outputPath = '/home/ubuntu/phoenix_territory_map/nextjs_space/public/portcharlotte-route-assignments.json';
  fs.writeFileSync(outputPath, JSON.stringify(routeAssignments, null, 2));
  
  console.log(`\n=== Geocoding Complete ===`);
  console.log(`Successfully geocoded: ${geocodedCount}/${data.length}`);
  console.log(`Failed: ${failedCount}/${data.length}`);
  console.log(`Output: ${outputPath}`);
  console.log(`\nTotal Monthly Revenue: $${routeAssignments.reduce((sum, r) => sum + r.monthlyPrice, 0).toFixed(2)}`);
  console.log(`Total Yearly Revenue: $${routeAssignments.reduce((sum, r) => sum + r.yearlyPrice, 0).toFixed(2)}`);
}

processPortCharlotte().catch(console.error);

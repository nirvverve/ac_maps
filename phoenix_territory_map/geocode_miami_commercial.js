const fs = require('fs');
const path = require('path');
const https = require('https');

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';
const DELAY_MS = 50;

// Read existing data
const commercialAccounts = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'nextjs_space/public/miami-commercial-routes.json'), 'utf8'
));

// Geocode function
function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results.length > 0) {
            const loc = json.results[0].geometry.location;
            resolve({ lat: loc.lat, lng: loc.lng });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function processAll() {
  const needsGeocode = commercialAccounts.filter(c => !c.latitude || !c.longitude);
  console.log(`Geocoding ${needsGeocode.length} addresses...`);
  
  let processed = 0;
  let failed = 0;
  
  for (const account of needsGeocode) {
    const fullAddress = `${account.address}, ${account.city}, ${account.state} ${account.zip}`;
    const result = await geocodeAddress(fullAddress);
    
    if (result) {
      account.latitude = result.lat;
      account.longitude = result.lng;
    } else {
      failed++;
      console.log(`  Failed: ${account.customerNumber} - ${fullAddress}`);
    }
    
    processed++;
    if (processed % 20 === 0) {
      console.log(`  Processed ${processed}/${needsGeocode.length}...`);
    }
    
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  
  console.log(`\nGeocoding complete: ${processed - failed} success, ${failed} failed`);
  
  // Save updated data
  fs.writeFileSync(
    path.join(__dirname, 'nextjs_space/public/miami-commercial-routes.json'),
    JSON.stringify(commercialAccounts, null, 2)
  );
  console.log('✓ Saved updated miami-commercial-routes.json');
  
  // Verify data
  const withCoords = commercialAccounts.filter(c => c.latitude && c.longitude);
  console.log(`\nFinal: ${withCoords.length}/${commercialAccounts.length} have coordinates`);
}

processAll();

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';
const ROUTE_ASSIGNMENTS_FILE = path.join(__dirname, 'nextjs_space/public/route-assignments.json');
const BACKUP_FILE = path.join(__dirname, 'nextjs_space/public/route-assignments-backup.json');

// Rate limiting
const DELAY_MS = 100; // 10 requests per second to stay within API limits
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function geocodeAddress(address, city, state, zipCode) {
  return new Promise((resolve, reject) => {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.status === 'OK' && result.results.length > 0) {
            const location = result.results[0].geometry.location;
            resolve({
              success: true,
              latitude: location.lat,
              longitude: location.lng,
              formattedAddress: result.results[0].formatted_address
            });
          } else if (result.status === 'ZERO_RESULTS') {
            resolve({
              success: false,
              error: 'No results found',
              status: result.status
            });
          } else {
            resolve({
              success: false,
              error: result.error_message || result.status,
              status: result.status
            });
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function geocodeAddressWithRetry(address, city, state, zipCode, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await geocodeAddress(address, city, state, zipCode);
      
      if (result.success) {
        return result;
      } else if (result.status === 'OVER_QUERY_LIMIT') {
        console.log(`  ⏳ Rate limit hit, waiting 2 seconds...`);
        await sleep(2000);
      } else if (result.status === 'ZERO_RESULTS') {
        return result; // Don't retry for no results
      } else {
        console.log(`  ⚠️ Attempt ${i + 1} failed: ${result.error}`);
        await sleep(1000);
      }
    } catch (error) {
      console.log(`  ❌ Error on attempt ${i + 1}: ${error.message}`);
      await sleep(1000);
    }
  }
  
  return {
    success: false,
    error: 'Max retries exceeded'
  };
}

async function main() {
  console.log('📍 Starting address geocoding...\n');
  
  // Read route assignments
  const routeAssignments = JSON.parse(fs.readFileSync(ROUTE_ASSIGNMENTS_FILE, 'utf-8'));
  console.log(`📊 Found ${routeAssignments.length} route assignments\n`);
  
  // Create backup
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(routeAssignments, null, 2));
  console.log(`💾 Backup created at ${BACKUP_FILE}\n`);
  
  const stats = {
    total: routeAssignments.length,
    successful: 0,
    failed: 0,
    unchanged: 0,
    errors: []
  };
  
  // Group by unique addresses to minimize API calls
  const addressMap = new Map();
  routeAssignments.forEach((assignment, index) => {
    const key = `${assignment.address}|${assignment.city}|${assignment.zipCode}`;
    if (!addressMap.has(key)) {
      addressMap.set(key, {
        address: assignment.address,
        city: assignment.city,
        zipCode: assignment.zipCode,
        oldLat: assignment.latitude,
        oldLng: assignment.longitude,
        indices: []
      });
    }
    addressMap.get(key).indices.push(index);
  });
  
  console.log(`🏠 Found ${addressMap.size} unique addresses to geocode\n`);
  console.log(`⏱️  Estimated time: ${Math.ceil(addressMap.size * DELAY_MS / 1000)} seconds\n`);
  
  let processedCount = 0;
  
  for (const [key, addressData] of addressMap) {
    processedCount++;
    const progress = Math.round((processedCount / addressMap.size) * 100);
    
    process.stdout.write(`\r[${progress}%] Processing ${processedCount}/${addressMap.size}: ${addressData.address}...`);
    
    const result = await geocodeAddressWithRetry(
      addressData.address,
      addressData.city,
      'AZ',
      addressData.zipCode
    );
    
    await sleep(DELAY_MS);
    
    if (result.success) {
      // Calculate distance moved
      const latDiff = Math.abs(result.latitude - addressData.oldLat);
      const lngDiff = Math.abs(result.longitude - addressData.oldLng);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Rough miles
      
      // Update all assignments with this address
      addressData.indices.forEach(index => {
        routeAssignments[index].latitude = result.latitude;
        routeAssignments[index].longitude = result.longitude;
      });
      
      stats.successful += addressData.indices.length;
      
      if (distance > 0.1) {
        console.log(`\n  ✅ ${addressData.address}: Moved ${distance.toFixed(2)} miles`);
        console.log(`     Old: (${addressData.oldLat}, ${addressData.oldLng})`);
        console.log(`     New: (${result.latitude}, ${result.longitude})`);
      }
    } else {
      stats.failed += addressData.indices.length;
      stats.errors.push({
        address: `${addressData.address}, ${addressData.city}, AZ ${addressData.zipCode}`,
        customerNumbers: addressData.indices.map(i => routeAssignments[i].customerNumber),
        error: result.error
      });
      console.log(`\n  ❌ Failed: ${addressData.address} - ${result.error}`);
    }
  }
  
  console.log('\n\n📝 Writing updated route assignments...');
  fs.writeFileSync(ROUTE_ASSIGNMENTS_FILE, JSON.stringify(routeAssignments, null, 2));
  
  console.log('\n\n✅ Geocoding complete!\n');
  console.log('📊 Summary:');
  console.log(`   Total addresses: ${addressMap.size}`);
  console.log(`   Total assignments: ${stats.total}`);
  console.log(`   ✅ Successfully geocoded: ${stats.successful}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  Failed addresses:');
    stats.errors.slice(0, 10).forEach(error => {
      console.log(`   - ${error.address}`);
      console.log(`     Customers: ${error.customerNumbers.join(', ')}`);
      console.log(`     Error: ${error.error}`);
    });
    
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`);
    }
  }
  
  console.log('\n🔄 Now regenerating customer-lookup.json...');
  require('./fix_customer_lookup.js');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

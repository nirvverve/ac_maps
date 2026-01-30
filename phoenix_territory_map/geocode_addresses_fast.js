const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';
const ROUTE_ASSIGNMENTS_FILE = path.join(__dirname, 'nextjs_space/public/route-assignments.json');
const BACKUP_FILE = path.join(__dirname, 'nextjs_space/public/route-assignments-backup.json');
const PROGRESS_FILE = path.join(__dirname, 'geocode_progress.json');

// Faster rate limiting - Google allows 50 requests per second
const DELAY_MS = 25; // 40 requests per second (safer than 50)
const MAX_RETRIES = 2;
const BATCH_SIZE = 100; // Save progress every 100 addresses

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
              longitude: location.lng
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
        await sleep(2000);
      } else if (result.status === 'ZERO_RESULTS') {
        return result;
      } else {
        await sleep(500);
      }
    } catch (error) {
      await sleep(500);
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}

async function main() {
  console.log('🚀 Starting FAST address geocoding...\n');
  
  // Read route assignments
  const routeAssignments = JSON.parse(fs.readFileSync(ROUTE_ASSIGNMENTS_FILE, 'utf-8'));
  console.log(`📊 Found ${routeAssignments.length} route assignments\n`);
  
  // Create backup if it doesn't exist
  if (!fs.existsSync(BACKUP_FILE)) {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(routeAssignments, null, 2));
    console.log(`💾 Backup created\n`);
  }
  
  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    significant: 0,
    insignificant: 0,
    errors: []
  };
  
  // Group by unique addresses
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
  
  console.log(`🏠 ${addressMap.size} unique addresses to geocode`);
  console.log(`⏱️  Estimated time: ${Math.ceil(addressMap.size * DELAY_MS / 1000)} seconds (~${Math.ceil(addressMap.size * DELAY_MS / 60000)} minutes)\n`);
  
  const startTime = Date.now();
  let processedCount = 0;
  let batchCount = 0;
  let significantMoves = [];
  
  for (const [key, addressData] of addressMap) {
    processedCount++;
    const progress = Math.round((processedCount / addressMap.size) * 100);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const rate = processedCount / elapsed;
    const remaining = Math.round((addressMap.size - processedCount) / rate);
    
    process.stdout.write(`\r[${progress}%] ${processedCount}/${addressMap.size} | ⏱️${elapsed}s | 🕐${remaining}s left | ${addressData.address.substring(0, 40)}...`);
    
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
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69;
      
      // Update all assignments with this address
      addressData.indices.forEach(index => {
        routeAssignments[index].latitude = result.latitude;
        routeAssignments[index].longitude = result.longitude;
      });
      
      stats.successful += addressData.indices.length;
      
      if (distance > 0.5) {
        stats.significant++;
        significantMoves.push({
          address: addressData.address,
          distance: distance.toFixed(2),
          count: addressData.indices.length
        });
      } else {
        stats.insignificant++;
      }
    } else {
      stats.failed += addressData.indices.length;
      stats.errors.push({
        address: `${addressData.address}, ${addressData.city}`,
        count: addressData.indices.length,
        error: result.error
      });
    }
    
    batchCount++;
    if (batchCount >= BATCH_SIZE) {
      fs.writeFileSync(ROUTE_ASSIGNMENTS_FILE, JSON.stringify(routeAssignments, null, 2));
      batchCount = 0;
    }
  }
  
  // Final save
  console.log('\n\n💾 Saving final results...');
  fs.writeFileSync(ROUTE_ASSIGNMENTS_FILE, JSON.stringify(routeAssignments, null, 2));
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n\n✅ Geocoding complete!\n');
  console.log('═══════════════════════════════════════════');
  console.log('📊 SUMMARY:');
  console.log('═══════════════════════════════════════════');
  console.log(`⏱️  Total time: ${totalTime}s (${Math.round(totalTime / 60)} minutes)`);
  console.log(`🏠 Unique addresses processed: ${addressMap.size}`);
  console.log(`📍 Total assignments updated: ${routeAssignments.length}`);
  console.log(`✅ Successfully geocoded: ${stats.successful}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`📏 Significant moves (>0.5 mi): ${stats.significant}`);
  console.log(`   Minor adjustments (<0.5 mi): ${stats.insignificant}`);
  
  if (significantMoves.length > 0) {
    console.log('\n🎯 TOP 10 LARGEST CORRECTIONS:');
    significantMoves
      .sort((a, b) => parseFloat(b.distance) - parseFloat(a.distance))
      .slice(0, 10)
      .forEach((move, i) => {
        console.log(`   ${i + 1}. ${move.address}`);
        console.log(`      Distance: ${move.distance} miles | ${move.count} customer(s)`);
      });
  }
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  FAILED ADDRESSES:');
    stats.errors.slice(0, 5).forEach(error => {
      console.log(`   - ${error.address} (${error.count} customers)`);
      console.log(`     Error: ${error.error}`);
    });
    
    if (stats.errors.length > 5) {
      console.log(`   ... and ${stats.errors.length - 5} more`);
    }
  }
  
  console.log('\n🔄 Now regenerating customer-lookup.json...');
  require('./fix_customer_lookup.js');
  
  console.log('\n✅ ALL DONE!');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

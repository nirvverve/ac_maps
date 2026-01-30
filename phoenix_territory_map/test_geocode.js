const https = require('https');

const API_KEY = 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';

function geocodeAddress(address, city, state, zipCode) {
  return new Promise((resolve, reject) => {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${API_KEY}`;
    
    console.log(`🔍 Geocoding: ${fullAddress}`);
    console.log(`📍 URL: ${url}\n`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log('📊 API Response:');
          console.log(JSON.stringify(result, null, 2));
          console.log('');
          
          if (result.status === 'OK' && result.results.length > 0) {
            const location = result.results[0].geometry.location;
            resolve({
              success: true,
              latitude: location.lat,
              longitude: location.lng,
              formattedAddress: result.results[0].formatted_address
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

async function testGeocode() {
  console.log('🧪 Testing geocoding with problematic address...\n');
  
  // Test the address that user reported as incorrect
  const result = await geocodeAddress('208 N Cottonwood Dr', 'Gilbert', 'AZ', '85234');
  
  if (result.success) {
    console.log('✅ Geocoding successful!');
    console.log(`   Formatted Address: ${result.formattedAddress}`);
    console.log(`   Latitude: ${result.latitude}`);
    console.log(`   Longitude: ${result.longitude}`);
    console.log('');
    console.log('📍 Old coordinates (incorrect):');
    console.log('   Latitude: 33.362733280834256');
    console.log('   Longitude: -111.73560298867244');
    console.log('');
    
    // Calculate distance moved
    const oldLat = 33.362733280834256;
    const oldLng = -111.73560298867244;
    const latDiff = Math.abs(result.latitude - oldLat);
    const lngDiff = Math.abs(result.longitude - oldLng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Rough miles
    
    console.log(`📏 Distance correction: ${distance.toFixed(3)} miles`);
    
    if (distance > 0.1) {
      console.log('✅ Significant correction needed!');
    } else {
      console.log('⚠️  Coordinates are already accurate');
    }
  } else {
    console.log('❌ Geocoding failed!');
    console.log(`   Error: ${result.error}`);
  }
}

testGeocode().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

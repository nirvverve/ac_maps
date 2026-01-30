const https = require('https');
const fs = require('fs');
const path = require('path');

// Read Port Charlotte ZIP codes from density data
const pcResData = require('./nextjs_space/public/portcharlotte-density-data.json');

// Collect all Port Charlotte ZIPs
const allZips = new Set();
pcResData.forEach(d => allZips.add(d.zipCode));

console.log(`Total unique Port Charlotte ZIP codes: ${allZips.size}`);

// Florida ZCTA GeoJSON URL from Census Bureau
const url = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/fl_florida_zip_codes_geo.min.json';

console.log('Fetching Florida ZCTA data from Census Bureau...');

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Data received, processing...');
    
    const floridaData = JSON.parse(data);
    const pcZips = [];
    
    // Filter for Port Charlotte ZIPs
    if (floridaData.features) {
      floridaData.features.forEach(feature => {
        const zipCode = feature.properties.ZCTA5CE10 || feature.properties.GEOID10 || feature.properties.zip;
        
        if (zipCode && allZips.has(zipCode)) {
          pcZips.push({
            zipCode: zipCode,
            geometry: feature.geometry
          });
        }
      });
    }
    
    console.log(`\nMatched ${pcZips.length}/${allZips.size} ZIP codes`);
    console.log(`Missing ZIPs: ${allZips.size - pcZips.length}`);
    
    // Show some statistics
    if (pcZips.length > 0) {
      const sampleZip = pcZips[0];
      const coordCount = sampleZip.geometry.coordinates[0]?.length || 0;
      console.log(`\nSample ZIP ${sampleZip.zipCode}:`);
      console.log(`- Coordinates: ${coordCount} points`);
      console.log(`- Geometry type: ${sampleZip.geometry.type}`);
    }
    
    // Save to file
    const outputPath = path.join(__dirname, 'nextjs_space/public/portcharlotte-zip-boundaries.json');
    fs.writeFileSync(outputPath, JSON.stringify(pcZips, null, 2));
    
    const fileSize = fs.statSync(outputPath).size;
    console.log(`\n✅ Saved to ${outputPath}`);
    console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    // List missing ZIPs
    const foundZips = new Set(pcZips.map(z => z.zipCode));
    const missing = Array.from(allZips).filter(z => !foundZips.has(z));
    if (missing.length > 0) {
      console.log(`\nMissing ZIPs (will use circle markers): ${missing.join(', ')}`);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching data:', err);
});

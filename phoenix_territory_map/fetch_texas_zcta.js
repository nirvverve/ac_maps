const https = require('https');
const fs = require('fs');
const path = require('path');

// Read Dallas ZIP codes from density data
const dallasResData = require('./nextjs_space/public/dallas-density-data.json');
const dallasComData = require('./nextjs_space/public/dallas-commercial-density-data.json');

// Combine all Dallas ZIPs
const allZips = new Set();
dallasResData.forEach(d => allZips.add(d.zipCode));
dallasComData.forEach(d => allZips.add(d.zipCode));

console.log(`Total unique Dallas ZIP codes: ${allZips.size}`);

// Texas ZCTA GeoJSON URL from Census Bureau
const url = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/tx_texas_zip_codes_geo.min.json';

console.log('Fetching Texas ZCTA data from Census Bureau...');

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Data received, processing...');
    
    const texasData = JSON.parse(data);
    const dallasZips = [];
    
    // Filter for Dallas ZIPs
    if (texasData.features) {
      texasData.features.forEach(feature => {
        const zipCode = feature.properties.ZCTA5CE10 || feature.properties.GEOID10 || feature.properties.zip;
        
        if (zipCode && allZips.has(zipCode)) {
          dallasZips.push({
            zipCode: zipCode,
            geometry: feature.geometry
          });
        }
      });
    }
    
    console.log(`\nMatched ${dallasZips.length}/${allZips.size} ZIP codes`);
    console.log(`Missing ZIPs: ${allZips.size - dallasZips.length}`);
    
    // Show some statistics
    if (dallasZips.length > 0) {
      const sampleZip = dallasZips[0];
      const coordCount = sampleZip.geometry.coordinates[0]?.length || 0;
      console.log(`\nSample ZIP ${sampleZip.zipCode}:`);
      console.log(`- Coordinates: ${coordCount} points`);
      console.log(`- Geometry type: ${sampleZip.geometry.type}`);
    }
    
    // Save to file
    const outputPath = path.join(__dirname, 'nextjs_space/public/dallas-zip-boundaries.json');
    fs.writeFileSync(outputPath, JSON.stringify(dallasZips, null, 2));
    
    const fileSize = fs.statSync(outputPath).size;
    console.log(`\n✅ Saved to ${outputPath}`);
    console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    // List missing ZIPs
    const foundZips = new Set(dallasZips.map(z => z.zipCode));
    const missing = Array.from(allZips).filter(z => !foundZips.has(z));
    if (missing.length > 0) {
      console.log(`\nMissing ZIPs (will use circle markers): ${missing.join(', ')}`);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching data:', err);
});

const fs = require('fs');
const https = require('https');

// Read Miami ZIP codes
const miamiData = JSON.parse(
  fs.readFileSync('/home/ubuntu/phoenix_territory_map/nextjs_space/public/miami-map-data.json', 'utf-8')
);

const zipCodes = miamiData.map(z => z.zip);
console.log(`Fetching boundaries for ${zipCodes.length} ZIP codes...`);

// Fetch ZCTA boundaries from US Census Tiger/Line data
const url = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/fl_florida_zip_codes_geo.min.json';

function fetchBoundaries() {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function processBoundaries() {
  console.log('Downloading Florida ZIP boundaries...');
  const geoJson = await fetchBoundaries();
  
  console.log(`Downloaded ${geoJson.features.length} ZIP boundaries`);
  
  // Filter to only Miami ZIPs
  const miamiZips = new Set(zipCodes);
  const filteredFeatures = geoJson.features.filter(feature => {
    const zip = feature.properties.ZCTA5CE10 || feature.properties.GEOID10 || feature.properties.ZIP;
    return miamiZips.has(zip);
  });
  
  console.log(`Found ${filteredFeatures.length} matching Miami ZIP boundaries`);
  
  // Convert to our format
  const boundaries = {};
  filteredFeatures.forEach(feature => {
    const zip = feature.properties.ZCTA5CE10 || feature.properties.GEOID10 || feature.properties.ZIP;
    boundaries[zip] = feature.geometry;
  });
  
  // Save
  const outputPath = '/home/ubuntu/phoenix_territory_map/nextjs_space/public/miami-zip-boundaries.json';
  fs.writeFileSync(outputPath, JSON.stringify(boundaries, null, 2));
  console.log(`\nSaved ${Object.keys(boundaries).length} boundaries to: ${outputPath}`);
  
  // List missing ZIPs
  const foundZips = new Set(Object.keys(boundaries));
  const missingZips = zipCodes.filter(z => !foundZips.has(z));
  if (missingZips.length > 0) {
    console.log(`\nMissing boundaries for ${missingZips.length} ZIPs:`);
    console.log(missingZips.join(', '));
  }
}

processBoundaries().catch(console.error);

const fs = require('fs');

// Comprehensive list of Miami-Dade County ZIP codes
// Source: USPS and Miami-Dade County records
const allMiamiDadeZips = [
  // Miami proper
  '33101', '33109', '33116', '33122', '33124', '33125', '33126', '33127', '33128', '33129',
  '33130', '33131', '33132', '33133', '33134', '33135', '33136', '33137', '33138', '33139',
  '33140', '33141', '33142', '33143', '33144', '33145', '33146', '33147', '33149', '33150',
  '33151', '33152', '33153', '33154', '33155', '33156', '33157', '33158', '33160', '33161',
  '33162', '33163', '33164', '33165', '33166', '33167', '33168', '33169', '33170', '33172',
  '33173', '33174', '33175', '33176', '33177', '33178', '33179', '33180', '33181', '33182',
  '33183', '33184', '33185', '33186', '33187', '33189', '33190', '33193', '33194', '33196',
  
  // Homestead area
  '33030', '33031', '33032', '33033', '33034', '33035', '33090', '33092',
  
  // North Miami-Dade
  '33004', '33009', '33010', '33012', '33013', '33014', '33015', '33016', '33017', '33018',
  '33019', '33020', '33021', '33023', '33024', '33025', '33026', '33027', '33028', '33029',
  
  // Other areas
  '33054', '33055', '33056', '33060'
];

// Remove duplicates and sort
const uniqueZips = [...new Set(allMiamiDadeZips)].sort();

// Load existing data
const existingMapData = JSON.parse(fs.readFileSync('./public/miami-map-data.json', 'utf-8'));
const boundaries = JSON.parse(fs.readFileSync('./public/miami-zip-boundaries.json', 'utf-8'));
const customers = JSON.parse(fs.readFileSync('./public/miami-route-assignments.json', 'utf-8'));

// Create a map of existing ZIPs
const existingZipMap = new Map();
existingMapData.forEach(zipData => {
  existingZipMap.set(zipData.zip, zipData);
});

// Calculate centroid for territory assignment
function getCentroid(customers, territory) {
  const territoryCustomers = customers.filter(c => c.territory === territory);
  if (territoryCustomers.length === 0) return null;
  
  const sum = territoryCustomers.reduce((acc, c) => {
    acc.lat += c.latitude;
    acc.lng += c.longitude;
    return acc;
  }, { lat: 0, lng: 0 });
  
  return {
    lat: sum.lat / territoryCustomers.length,
    lng: sum.lng / territoryCustomers.length
  };
}

// Get centroids for each territory
const centroids = {
  North: getCentroid(customers, 'North'),
  Central: getCentroid(customers, 'Central'),
  South: getCentroid(customers, 'South')
};

console.log('Territory centroids:');
console.log('  North:', centroids.North);
console.log('  Central:', centroids.Central);
console.log('  South:', centroids.South);

// Function to assign territory based on latitude (simple approach)
function assignTerritory(lat) {
  if (!lat) return 'Central'; // Default
  if (lat >= 25.89) return 'North';
  if (lat <= 25.843) return 'South';
  return 'Central';
}

// Expand the map data with missing ZIPs
const expandedMapData = [];
let addedCount = 0;

// First, add all existing ZIPs from map data
existingMapData.forEach(zipData => {
  expandedMapData.push(zipData);
});

// Then, add ZIPs that have boundaries but no accounts
Object.keys(boundaries).forEach(zip => {
  if (!existingZipMap.has(zip)) {
    const boundary = boundaries[zip];
    
    if (boundary && boundary.geometry && boundary.geometry.coordinates) {
      // Calculate centroid from boundary
      const coords = boundary.geometry.coordinates[0];
      let sumLat = 0, sumLng = 0, count = 0;
      
      coords.forEach(ring => {
        if (Array.isArray(ring) && ring.length === 2) {
          sumLng += ring[0];
          sumLat += ring[1];
          count++;
        }
      });
      
      if (count > 0) {
        const lat = sumLat / count;
        const lng = sumLng / count;
        const territory = assignTerritory(lat);
        
        expandedMapData.push({
          zip: zip,
          area: territory,
          accountCount: 0,
          city: '',
          latitude: lat,
          longitude: lng
        });
        
        addedCount++;
        console.log(`  Added ZIP ${zip}: ${territory} territory (lat: ${lat.toFixed(4)})`);
      }
    }
  }
});

// Sort by ZIP code
expandedMapData.sort((a, b) => a.zip.localeCompare(b.zip));

// Save expanded data
fs.writeFileSync(
  './public/miami-map-data-expanded.json',
  JSON.stringify(expandedMapData, null, 2)
);

console.log(`
Results:`);
console.log(`  Original ZIPs: ${existingMapData.length}`);
console.log(`  Total unique Miami-Dade ZIPs checked: ${uniqueZips.length}`);
console.log(`  Added ${addedCount} new ZIPs with 0 accounts`);
console.log(`  Final total: ${expandedMapData.length}`);

// Show distribution
const distribution = {
  North: expandedMapData.filter(z => z.area === 'North').length,
  Central: expandedMapData.filter(z => z.area === 'Central').length,
  South: expandedMapData.filter(z => z.area === 'South').length
};

console.log(`
Territory distribution (including 0-account ZIPs):`);
console.log(`  North: ${distribution.North} ZIPs`);
console.log(`  Central: ${distribution.Central} ZIPs`);
console.log(`  South: ${distribution.South} ZIPs`);

// Show new ZIPs added
if (addedCount > 0) {
  console.log(`
New ZIPs added (with 0 accounts):`);
  const newZips = expandedMapData.filter(z => z.accountCount === 0);
  newZips.forEach(z => {
    console.log(`  ${z.zip}: ${z.area} territory (lat: ${z.latitude.toFixed(4)})`);
  });
}

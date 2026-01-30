const fs = require('fs');

// Load the data files
const routes = JSON.parse(fs.readFileSync('route-assignments.json', 'utf8'));
const zipData = JSON.parse(fs.readFileSync('phoenix-tucson-map-data.json', 'utf8'));

// Create ZIP to city mapping
const zipToCity = {};
zipData.forEach(entry => {
  zipToCity[entry.zip] = entry.city;
});

// Update routes with city data
let updatedCount = 0;
routes.forEach(route => {
  if (!route.city && route.zipCode && zipToCity[route.zipCode]) {
    route.city = zipToCity[route.zipCode];
    updatedCount++;
  }
});

// Save the updated file
fs.writeFileSync('route-assignments.json', JSON.stringify(routes, null, 2));
console.log(`Updated ${updatedCount} routes with city data`);

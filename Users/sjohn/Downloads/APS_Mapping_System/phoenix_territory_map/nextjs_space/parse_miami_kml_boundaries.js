const fs = require('fs');
const xml2js = require('xml2js');

// Parse KML file and extract boundary coordinates
async function parseKMLBoundaries() {
  const kmlContent = fs.readFileSync('./public/Miami Territory Breakout.kml', 'utf-8');
  const parser = new xml2js.Parser();
  
  const result = await parser.parseStringPromise(kmlContent);
  const placemarks = result.kml.Document[0].Placemark;
  
  const boundaries = {
    north: null,
    south: null
  };
  
  placemarks.forEach(placemark => {
    const name = placemark.name[0];
    const coordinates = placemark.LineString[0].coordinates[0];
    
    // Parse coordinate string into array of [lng, lat] points
    const points = coordinates.trim().split(/\s+/).map(coord => {
      const [lng, lat] = coord.split(',').map(parseFloat);
      return { lng, lat };
    });
    
    if (name === 'NORTH BOUNDARY') {
      boundaries.north = points;
    } else if (name === 'SOUTH BOUNDARY') {
      boundaries.south = points;
    }
  });
  
  return boundaries;
}

// Check if a point is north of a boundary line
function isNorthOfBoundary(point, boundaryLine) {
  // Find the two boundary points that bracket the point's longitude
  let leftPoint = null;
  let rightPoint = null;
  
  for (let i = 0; i < boundaryLine.length - 1; i++) {
    const p1 = boundaryLine[i];
    const p2 = boundaryLine[i + 1];
    
    if (p1.lng <= point.lng && point.lng <= p2.lng) {
      leftPoint = p1;
      rightPoint = p2;
      break;
    } else if (p2.lng <= point.lng && point.lng <= p1.lng) {
      leftPoint = p2;
      rightPoint = p1;
      break;
    }
  }
  
  // If point is outside the boundary line's longitude range, use endpoints
  if (!leftPoint) {
    // Use the westernmost and easternmost points
    const sortedByLng = [...boundaryLine].sort((a, b) => a.lng - b.lng);
    if (point.lng < sortedByLng[0].lng) {
      return point.lat > sortedByLng[0].lat;
    } else {
      return point.lat > sortedByLng[sortedByLng.length - 1].lat;
    }
  }
  
  // Interpolate latitude at point's longitude
  const fraction = (point.lng - leftPoint.lng) / (rightPoint.lng - leftPoint.lng);
  const interpolatedLat = leftPoint.lat + fraction * (rightPoint.lat - leftPoint.lat);
  
  // Point is north if its latitude is greater than the boundary's latitude
  return point.lat > interpolatedLat;
}

// Assign territory based on boundaries
function assignTerritory(point, boundaries) {
  const isNorth = isNorthOfBoundary(point, boundaries.north);
  const isSouth = !isNorthOfBoundary(point, boundaries.south);
  
  if (isNorth) {
    return 'North';
  } else if (isSouth) {
    return 'South';
  } else {
    return 'Central';
  }
}

// Main processing function
async function processAccounts() {
  console.log('Parsing KML boundaries...');
  const boundaries = await parseKMLBoundaries();
  
  console.log(`North boundary: ${boundaries.north.length} points`);
  console.log(`South boundary: ${boundaries.south.length} points`);
  
  // Load Miami customer data
  console.log('\nLoading Miami customer data...');
  const customers = JSON.parse(
    fs.readFileSync('./public/miami-route-assignments.json', 'utf-8')
  );
  
  console.log(`Loaded ${customers.length} customer records`);
  
  // Reassign territories based on KML boundaries
  console.log('\nReassigning territories based on KML boundaries...');
  const updatedCustomers = customers.map(customer => {
    const point = { lng: customer.longitude, lat: customer.latitude };
    const newTerritory = assignTerritory(point, boundaries);
    
    return {
      ...customer,
      kmlTerritory: newTerritory,
      originalTerritory: customer.territory
    };
  });
  
  // Calculate statistics
  const stats = {
    North: updatedCustomers.filter(c => c.kmlTerritory === 'North').length,
    Central: updatedCustomers.filter(c => c.kmlTerritory === 'Central').length,
    South: updatedCustomers.filter(c => c.kmlTerritory === 'South').length
  };
  
  console.log('\nKML Boundary Territory Distribution:');
  console.log(`  North: ${stats.North} accounts`);
  console.log(`  Central: ${stats.Central} accounts`);
  console.log(`  South: ${stats.South} accounts`);
  console.log(`  Total: ${updatedCustomers.length} accounts`);
  
  // Compare with original assignments
  const changes = {
    'North->Central': 0,
    'North->South': 0,
    'Central->North': 0,
    'Central->South': 0,
    'South->North': 0,
    'South->Central': 0,
    unchanged: 0
  };
  
  updatedCustomers.forEach(customer => {
    if (customer.originalTerritory === customer.kmlTerritory) {
      changes.unchanged++;
    } else {
      const key = `${customer.originalTerritory}->${customer.kmlTerritory}`;
      if (changes[key] !== undefined) {
        changes[key]++;
      }
    }
  });
  
  console.log('\nTerritory Assignment Changes:');
  Object.entries(changes).forEach(([change, count]) => {
    if (count > 0) {
      console.log(`  ${change}: ${count} accounts`);
    }
  });
  
  // Save updated data
  const outputPath = './public/miami-kml-scenario.json';
  fs.writeFileSync(outputPath, JSON.stringify(updatedCustomers, null, 2));
  console.log(`\nSaved KML scenario data to: ${outputPath}`);
  
  // Save boundary lines for visualization
  const boundaryPath = './public/miami-kml-boundaries.json';
  fs.writeFileSync(boundaryPath, JSON.stringify(boundaries, null, 2));
  console.log(`Saved boundary lines to: ${boundaryPath}`);
  
  console.log('\nProcessing complete!');
}

processAccounts().catch(console.error);

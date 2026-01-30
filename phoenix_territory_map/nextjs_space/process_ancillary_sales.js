const fs = require('fs');
const csv = require('csv-parser');

// Parse amount string to number
function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  // Remove dollar sign, spaces, and commas, then parse
  const cleaned = amountStr.replace(/[\$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Main processing function
async function processAncillarySales() {
  console.log('Reading ancillary sales CSV...');
  
  const salesData = [];
  const zipYearTypeMap = {}; // For View 1: zip -> year -> type -> total
  const zip2025Map = {};      // For View 2: zip -> type -> total
  
  // Read CSV
  return new Promise((resolve, reject) => {
    fs.createReadStream(__dirname + '/public/ancillary-sales-source.csv')
      .pipe(csv())
      .on('data', (row) => {
        const yearMonth = row['Year-Month'];
        const type = row['Type'];
        const amount = parseAmount(row['Amount']);
        const zip = row['ShippingPostalCode'];
        
        // Skip invalid rows
        if (!yearMonth || !type || !zip || amount === 0) return;
        
        // Map Maintenance to OTS as per user's description
        const saleType = type === 'Maintenance' ? 'OTS' : type;
        
        // Only process OTS, Repair, and Remodel
        if (!['OTS', 'Repair', 'Remodel'].includes(saleType)) return;
        
        const year = yearMonth.split('-')[0];
        
        // Store for View 1: by ZIP, year, and type
        if (!zipYearTypeMap[zip]) zipYearTypeMap[zip] = {};
        if (!zipYearTypeMap[zip][year]) zipYearTypeMap[zip][year] = {};
        if (!zipYearTypeMap[zip][year][saleType]) zipYearTypeMap[zip][year][saleType] = 0;
        zipYearTypeMap[zip][year][saleType] += amount;
        
        // Store for View 2: 2025 only
        if (year === '2025') {
          if (!zip2025Map[zip]) zip2025Map[zip] = {};
          if (!zip2025Map[zip][saleType]) zip2025Map[zip][saleType] = 0;
          zip2025Map[zip][saleType] += amount;
        }
      })
      .on('end', () => {
        console.log(`Processed ${Object.keys(zipYearTypeMap).length} unique ZIP codes`);
        resolve({ zipYearTypeMap, zip2025Map });
      })
      .on('error', reject);
  });
}

// Get active customer counts from route-assignments.json
function getActiveCustomerCounts() {
  console.log('Loading active customer counts...');
  const routeData = JSON.parse(
    fs.readFileSync(__dirname + '/public/route-assignments.json', 'utf8')
  );
  
  const zipCounts = {};
  routeData.forEach(customer => {
    const zip = customer.zipCode || customer.zip;
    if (zip) {
      zipCounts[zip] = (zipCounts[zip] || 0) + 1;
    }
  });
  
  console.log(`Found active customers in ${Object.keys(zipCounts).length} ZIP codes`);
  return zipCounts;
}

// Load ZIP coordinates from az-zip-boundaries.json (calculate centroids)
function getZipCoordinates() {
  console.log('Loading ZIP coordinates...');
  const boundaryData = JSON.parse(
    fs.readFileSync(__dirname + '/public/az-zip-boundaries.json', 'utf8')
  );
  
  const zipCoords = {};
  
  // Parse FeatureCollection
  if (boundaryData.features && Array.isArray(boundaryData.features)) {
    boundaryData.features.forEach(feature => {
      const zip = feature.properties?.ZCTA5CE10 || feature.properties?.ZIP || feature.properties?.zip;
      if (!zip || !feature.geometry || !feature.geometry.coordinates) return;
      
      // Calculate centroid from first polygon
      const coords = feature.geometry.type === 'Polygon' 
        ? feature.geometry.coordinates[0] 
        : feature.geometry.coordinates[0][0]; // MultiPolygon
        
      if (coords && coords.length > 0) {
        let latSum = 0, lngSum = 0, count = 0;
        coords.forEach(coord => {
          if (Array.isArray(coord) && coord.length === 2) {
            lngSum += coord[0];
            latSum += coord[1];
            count++;
          }
        });
        if (count > 0) {
          zipCoords[zip] = {
            latitude: latSum / count,
            longitude: lngSum / count,
            city: '' // We don't have city info in boundary data
          };
        }
      }
    });
  }
  
  // Also load city names from phoenix-tucson-map-data.json
  try {
    const mapData = JSON.parse(
      fs.readFileSync(__dirname + '/public/phoenix-tucson-map-data.json', 'utf8')
    );
    mapData.forEach(item => {
      if (item.zip && zipCoords[item.zip] && item.city) {
        zipCoords[item.zip].city = item.city;
      }
    });
  } catch (err) {
    console.log('Could not load city names');
  }
  
  console.log(`Found coordinates for ${Object.keys(zipCoords).length} ZIP codes`);
  return zipCoords;
}

// Load ZIP to branch mapping
function getZipBranchMapping() {
  console.log('Loading ZIP to branch mapping...');
  try {
    const branchData = JSON.parse(
      fs.readFileSync(__dirname + '/public/zip-branch-mapping.json', 'utf8')
    );
    
    const zipToBranch = {};
    branchData.forEach(item => {
      if (item.zipCode && item.branch) {
        zipToBranch[item.zipCode] = item.branch;
      }
    });
    
    console.log(`Found branch assignments for ${Object.keys(zipToBranch).length} ZIP codes`);
    return zipToBranch;
  } catch (err) {
    console.log('Could not load branch mapping');
    return {};
  }
}

// Main execution
async function main() {
  try {
    const { zipYearTypeMap, zip2025Map } = await processAncillarySales();
    const activeCustomerCounts = getActiveCustomerCounts();
    const zipCoordinates = getZipCoordinates();
    const zipBranches = getZipBranchMapping();
    
    // Build View 1 data: by ZIP, year, and type
    const view1Data = [];
    for (const [zip, yearData] of Object.entries(zipYearTypeMap)) {
      for (const [year, typeData] of Object.entries(yearData)) {
        const entry = {
          zip,
          year: parseInt(year),
          city: zipCoordinates[zip]?.city || '',
          branch: zipBranches[zip] || 'Unassigned',
          ots: typeData.OTS || 0,
          repair: typeData.Repair || 0,
          remodel: typeData.Remodel || 0,
          total: (typeData.OTS || 0) + (typeData.Repair || 0) + (typeData.Remodel || 0),
          latitude: zipCoordinates[zip]?.latitude || null,
          longitude: zipCoordinates[zip]?.longitude || null
        };
        view1Data.push(entry);
      }
    }
    
    // Build View 2 data: 2025 totals and averages by ZIP
    const view2Data = [];
    for (const [zip, typeData] of Object.entries(zip2025Map)) {
      const activeCustomers = activeCustomerCounts[zip] || 0;
      const ots = typeData.OTS || 0;
      const repair = typeData.Repair || 0;
      const remodel = typeData.Remodel || 0;
      const total = ots + repair + remodel;
      
      const entry = {
        zip,
        city: zipCoordinates[zip]?.city || '',
        branch: zipBranches[zip] || 'Unassigned',
        activeCustomers,
        ots,
        repair,
        remodel,
        total,
        // Calculate averages (per active customer)
        avgOts: activeCustomers > 0 ? ots / activeCustomers : 0,
        avgRepair: activeCustomers > 0 ? repair / activeCustomers : 0,
        avgRemodel: activeCustomers > 0 ? remodel / activeCustomers : 0,
        avgTotal: activeCustomers > 0 ? total / activeCustomers : 0,
        latitude: zipCoordinates[zip]?.latitude || null,
        longitude: zipCoordinates[zip]?.longitude || null
      };
      view2Data.push(entry);
    }
    
    // Sort both views by total descending
    view1Data.sort((a, b) => b.total - a.total);
    view2Data.sort((a, b) => b.total - a.total);
    
    // Output result
    const output = {
      view1: view1Data,
      view2: view2Data,
      metadata: {
        generatedAt: new Date().toISOString(),
        view1Records: view1Data.length,
        view2Records: view2Data.length,
        totalZips: Object.keys(zipYearTypeMap).length,
        years: [...new Set(view1Data.map(d => d.year))].sort()
      }
    };
    
    const outputPath = __dirname + '/public/ancillary-sales-data.json';
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log('\n=== Processing Complete ===');
    console.log(`View 1: ${view1Data.length} records (ZIP + Year + Type)`);
    console.log(`View 2: ${view2Data.length} records (2025 ZIP totals/averages)`);
    console.log(`Years covered: ${output.metadata.years.join(', ')}`);
    console.log(`Output saved to: ${outputPath}`);
    
    // Summary statistics
    const view2Total = view2Data.reduce((sum, d) => sum + d.total, 0);
    console.log(`\n2025 Total Ancillary Sales: $${view2Total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Top 5 ZIP codes by 2025 total:`);
    view2Data.slice(0, 5).forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.zip}: $${d.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${d.activeCustomers} customers)`);
    });
    
  } catch (error) {
    console.error('Error processing ancillary sales:', error);
    process.exit(1);
  }
}

main();

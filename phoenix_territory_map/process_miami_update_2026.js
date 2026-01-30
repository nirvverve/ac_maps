const fs = require('fs');
const path = require('path');

// Google Maps API key
const GOOGLE_MAPS_API_KEY = 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';
const DELAY_MS = 30; // 33 requests per second to stay within limits

// Helper function to delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Geocode an address using Google Maps API
async function geocodeAddress(address, city, state, zip) {
  const fullAddress = `${address}, ${city}, ${state} ${zip}`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { latitude: location.lat, longitude: location.lng, success: true };
    } else {
      console.log(`  Warning: Could not geocode "${fullAddress}" - ${data.status}`);
      return { latitude: null, longitude: null, success: false };
    }
  } catch (error) {
    console.log(`  Error geocoding "${fullAddress}": ${error.message}`);
    return { latitude: null, longitude: null, success: false };
  }
}

// Parse the day of service to simple format
function parseDayOfService(dayStr) {
  if (!dayStr) return '';
  // Extract days from patterns like "Every week on Monday, Wednesday, Friday"
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const found = days.filter(d => dayStr.includes(d));
  return found.join(', ') || dayStr;
}

async function processData() {
  console.log('=== Miami Data Update - January 2026 ===\n');
  
  // Read the Excel file using Python helper
  const { execSync } = require('child_process');
  
  // Extract data from Excel using Python
  const pythonScript = `
import pandas as pd
import json
import sys

xlsx = pd.ExcelFile('/home/ubuntu/Uploads/Miami 1 20 2026 Updated Customer List.xlsx')

result = {'Residential': [], 'Commercial': []}

for sheet in ['Residential', 'Commercial']:
    df = pd.read_excel(xlsx, sheet_name=sheet)
    for _, row in df.iterrows():
        record = {
            'customerNumber': str(row.get('Customer Number', '')).strip(),
            'accountName': str(row.get('Customer Name', '')).strip(),
            'address': str(row.get('Street', '')).strip(),
            'city': str(row.get('City', '')).strip(),
            'state': str(row.get('State', 'FL')).strip(),
            'zip': str(row.get('Zip', '')).strip().split('.')[0].zfill(5),
            'routeTech': str(row.get('Technician', '')).strip(),
            'territory': str(row.get('Territory', '')).strip(),
            'dayOfService': str(row.get('Day(s) of Service', '')).strip(),
            'monthlyContract': float(row.get('Monthly Contract', 0)) if pd.notna(row.get('Monthly Contract')) else 0
        }
        result[sheet].append(record)

print(json.dumps(result))
`;
  
  console.log('Reading Excel file...');
  const rawData = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
  const excelData = JSON.parse(rawData);
  
  console.log(`Found ${excelData.Residential.length} residential records`);
  console.log(`Found ${excelData.Commercial.length} commercial records`);
  
  // Create unique address map to minimize API calls
  const allRecords = [
    ...excelData.Residential.map(r => ({...r, accountType: 'Residential'})),
    ...excelData.Commercial.map(r => ({...r, accountType: 'Commercial'}))
  ];
  
  const uniqueAddresses = new Map();
  allRecords.forEach(record => {
    const key = `${record.address}|${record.city}|${record.state}|${record.zip}`;
    if (!uniqueAddresses.has(key)) {
      uniqueAddresses.set(key, { address: record.address, city: record.city, state: record.state, zip: record.zip });
    }
  });
  
  console.log(`\nGeocoding ${uniqueAddresses.size} unique addresses...`);
  
  // Geocode all unique addresses
  const geocodedAddresses = new Map();
  let processed = 0;
  const total = uniqueAddresses.size;
  
  for (const [key, addr] of uniqueAddresses) {
    const result = await geocodeAddress(addr.address, addr.city, addr.state, addr.zip);
    geocodedAddresses.set(key, result);
    processed++;
    
    if (processed % 50 === 0 || processed === total) {
      const pct = ((processed / total) * 100).toFixed(1);
      console.log(`  Progress: ${processed}/${total} (${pct}%)`);
    }
    
    await delay(DELAY_MS);
  }
  
  // Build final records with geocoded data
  const residentialRecords = [];
  const commercialRecords = [];
  
  allRecords.forEach(record => {
    const key = `${record.address}|${record.city}|${record.state}|${record.zip}`;
    const geo = geocodedAddresses.get(key) || { latitude: null, longitude: null };
    
    const finalRecord = {
      customerNumber: record.customerNumber,
      accountName: record.accountName,
      address: record.address,
      city: record.city,
      state: record.state,
      zip: record.zip,
      latitude: geo.latitude,
      longitude: geo.longitude,
      monthlyPrice: record.monthlyContract,
      yearlyPrice: record.monthlyContract * 12,
      routeTech: record.routeTech,
      territory: record.territory,
      dayOfService: parseDayOfService(record.dayOfService),
      accountType: record.accountType
    };
    
    if (record.accountType === 'Commercial') {
      commercialRecords.push(finalRecord);
    } else {
      residentialRecords.push(finalRecord);
    }
  });
  
  console.log(`\nProcessed: ${residentialRecords.length} residential, ${commercialRecords.length} commercial`);
  
  // Check for geocoding failures
  const residentialFailed = residentialRecords.filter(r => !r.latitude).length;
  const commercialFailed = commercialRecords.filter(r => !r.latitude).length;
  console.log(`Geocoding failures: ${residentialFailed} residential, ${commercialFailed} commercial`);
  
  const publicDir = '/home/ubuntu/phoenix_territory_map/nextjs_space/public';
  
  // 1. Save miami-route-assignments.json (residential only)
  fs.writeFileSync(
    path.join(publicDir, 'miami-route-assignments.json'),
    JSON.stringify(residentialRecords, null, 2)
  );
  console.log('\n✓ Updated miami-route-assignments.json');
  
  // 2. Save miami-commercial-accounts.json (commercial only)
  fs.writeFileSync(
    path.join(publicDir, 'miami-commercial-accounts.json'),
    JSON.stringify(commercialRecords, null, 2)
  );
  console.log('✓ Updated miami-commercial-accounts.json');
  
  // 3. Generate miami-density-data.json (residential aggregated by ZIP)
  const residentialByZip = {};
  residentialRecords.forEach(r => {
    if (!r.latitude || !r.zip) return;
    if (!residentialByZip[r.zip]) {
      residentialByZip[r.zip] = {
        zipCode: r.zip,
        city: r.city,
        activeCount: 0,
        terminatedCount: 0,
        totalHistorical: 0,
        churnRate: 0,
        avgCustomerLifetimeMonths: 0,
        latitude: r.latitude,
        longitude: r.longitude,
        totalLat: 0,
        totalLng: 0,
        count: 0
      };
    }
    residentialByZip[r.zip].activeCount++;
    residentialByZip[r.zip].totalHistorical++;
    residentialByZip[r.zip].totalLat += r.latitude;
    residentialByZip[r.zip].totalLng += r.longitude;
    residentialByZip[r.zip].count++;
  });
  
  const densityData = Object.values(residentialByZip).map(z => ({
    zipCode: z.zipCode,
    city: z.city,
    activeCount: z.activeCount,
    terminatedCount: z.terminatedCount,
    totalHistorical: z.totalHistorical,
    churnRate: z.churnRate,
    avgCustomerLifetimeMonths: z.avgCustomerLifetimeMonths,
    latitude: z.totalLat / z.count,
    longitude: z.totalLng / z.count
  }));
  
  fs.writeFileSync(
    path.join(publicDir, 'miami-density-data.json'),
    JSON.stringify(densityData, null, 2)
  );
  console.log('✓ Updated miami-density-data.json');
  
  // 4. Generate miami-commercial-density-data.json
  const commercialByZip = {};
  commercialRecords.forEach(r => {
    if (!r.latitude || !r.zip) return;
    if (!commercialByZip[r.zip]) {
      commercialByZip[r.zip] = {
        zip: r.zip,
        accountCount: 0,
        city: r.city,
        territory: r.territory,
        totalLat: 0,
        totalLng: 0,
        count: 0
      };
    }
    commercialByZip[r.zip].accountCount++;
    commercialByZip[r.zip].totalLat += r.latitude;
    commercialByZip[r.zip].totalLng += r.longitude;
    commercialByZip[r.zip].count++;
  });
  
  const commercialDensityData = Object.values(commercialByZip).map(z => ({
    zip: z.zip,
    accountCount: z.accountCount,
    latitude: z.totalLat / z.count,
    longitude: z.totalLng / z.count,
    city: z.city,
    territory: z.territory
  }));
  
  fs.writeFileSync(
    path.join(publicDir, 'miami-commercial-density-data.json'),
    JSON.stringify(commercialDensityData, null, 2)
  );
  console.log('✓ Updated miami-commercial-density-data.json');
  
  // 5. Generate miami-map-data.json (residential ZIP-territory mapping)
  const mapDataByZip = {};
  residentialRecords.forEach(r => {
    if (!r.latitude || !r.zip) return;
    if (!mapDataByZip[r.zip]) {
      mapDataByZip[r.zip] = {
        zip: r.zip,
        territory: r.territory,
        accountCount: 0,
        city: r.city,
        totalLat: 0,
        totalLng: 0,
        count: 0
      };
    }
    mapDataByZip[r.zip].accountCount++;
    mapDataByZip[r.zip].totalLat += r.latitude;
    mapDataByZip[r.zip].totalLng += r.longitude;
    mapDataByZip[r.zip].count++;
  });
  
  const mapData = Object.values(mapDataByZip).map(z => ({
    zip: z.zip,
    territory: z.territory,
    accountCount: z.accountCount,
    city: z.city,
    latitude: z.totalLat / z.count,
    longitude: z.totalLng / z.count
  }));
  
  fs.writeFileSync(
    path.join(publicDir, 'miami-map-data.json'),
    JSON.stringify(mapData, null, 2)
  );
  console.log('✓ Updated miami-map-data.json');
  
  // Also update miami-map-data-expanded.json
  fs.writeFileSync(
    path.join(publicDir, 'miami-map-data-expanded.json'),
    JSON.stringify(mapData, null, 2)
  );
  console.log('✓ Updated miami-map-data-expanded.json');
  
  // 6. Generate miami-zip-revenue-data.json
  const revenueByZip = {};
  
  // Add residential
  residentialRecords.forEach(r => {
    if (!r.zip) return;
    if (!revenueByZip[r.zip]) {
      revenueByZip[r.zip] = {
        zip: r.zip,
        city: r.city,
        territory: r.territory,
        totalMonthlyRevenue: 0,
        totalYearlyRevenue: 0,
        residentialCount: 0,
        commercialCount: 0,
        totalAccounts: 0
      };
    }
    revenueByZip[r.zip].totalMonthlyRevenue += r.monthlyPrice || 0;
    revenueByZip[r.zip].totalYearlyRevenue += r.yearlyPrice || 0;
    revenueByZip[r.zip].residentialCount++;
    revenueByZip[r.zip].totalAccounts++;
  });
  
  // Add commercial
  commercialRecords.forEach(r => {
    if (!r.zip) return;
    if (!revenueByZip[r.zip]) {
      revenueByZip[r.zip] = {
        zip: r.zip,
        city: r.city,
        territory: r.territory,
        totalMonthlyRevenue: 0,
        totalYearlyRevenue: 0,
        residentialCount: 0,
        commercialCount: 0,
        totalAccounts: 0
      };
    }
    revenueByZip[r.zip].totalMonthlyRevenue += r.monthlyPrice || 0;
    revenueByZip[r.zip].totalYearlyRevenue += r.yearlyPrice || 0;
    revenueByZip[r.zip].commercialCount++;
    revenueByZip[r.zip].totalAccounts++;
  });
  
  const revenueData = Object.values(revenueByZip).map(z => ({
    ...z,
    totalMonthlyRevenue: Math.round(z.totalMonthlyRevenue * 100) / 100,
    totalYearlyRevenue: Math.round(z.totalYearlyRevenue * 100) / 100,
    accountCount: z.totalAccounts
  }));
  
  fs.writeFileSync(
    path.join(publicDir, 'miami-zip-revenue-data.json'),
    JSON.stringify(revenueData, null, 2)
  );
  console.log('✓ Updated miami-zip-revenue-data.json');
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Residential accounts: ${residentialRecords.length} (in ${Object.keys(residentialByZip).length} ZIP codes)`);
  console.log(`Commercial accounts: ${commercialRecords.length} (in ${Object.keys(commercialByZip).length} ZIP codes)`);
  console.log(`Total revenue ZIP codes: ${Object.keys(revenueByZip).length}`);
  
  const totalMonthly = [...residentialRecords, ...commercialRecords].reduce((sum, r) => sum + (r.monthlyPrice || 0), 0);
  console.log(`Total Monthly Revenue: $${totalMonthly.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
  
  // Territory breakdown
  console.log('\n=== Territory Breakdown (Residential) ===');
  const resByTerritory = {};
  residentialRecords.forEach(r => {
    if (!resByTerritory[r.territory]) resByTerritory[r.territory] = 0;
    resByTerritory[r.territory]++;
  });
  Object.entries(resByTerritory).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
    console.log(`  ${t}: ${c} accounts`);
  });
  
  console.log('\n=== Territory Breakdown (Commercial) ===');
  const comByTerritory = {};
  commercialRecords.forEach(r => {
    if (!comByTerritory[r.territory]) comByTerritory[r.territory] = 0;
    comByTerritory[r.territory]++;
  });
  Object.entries(comByTerritory).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
    console.log(`  ${t}: ${c} accounts`);
  });
  
  console.log('\n✅ Miami data update complete!');
}

processData().catch(console.error);

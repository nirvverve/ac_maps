#!/usr/bin/env node

/**
 * Fetch Miami ZIP Code Boundaries using Google Maps Geocoding API
 * 
 * This script:
 * 1. Uses Google Maps Geocoding API to fetch boundaries for each ZIP code
 * 2. Filters to only the 121 Miami ZIP codes in our density data
 * 3. Saves as miami-zip-boundaries.json in the same format as az-zip-boundaries.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'nextjs_space', 'public');
const MIAMI_DENSITY_FILE = path.join(PUBLIC_DIR, 'miami-density-data.json');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'miami-zip-boundaries.json');

// Google Maps API Key
const API_KEY = 'AIzaSyAKMtorawPHrpVNqAZlv5vUpfMSDif57MQ';

// Rate limiting
const DELAY_MS = 100; // 10 requests per second

console.log('\n🗺️  Fetching Miami ZIP Code Boundaries using Google Maps API\n');
console.log('='.repeat(60));

// Load Miami density data to get the list of ZIP codes
const miamiData = JSON.parse(fs.readFileSync(MIAMI_DENSITY_FILE, 'utf8'));
const miamiZips = miamiData.map(d => ({
  zipCode: d.zipCode,
  city: d.city,
  latitude: d.latitude,
  longitude: d.longitude
}));

console.log(`✓ Loaded ${miamiZips.length} Miami ZIP codes from density data\n`);

/**
 * Fetch boundary geometry for a ZIP code using Google Places API
 */
async function fetchZipBoundary(zipData) {
  return new Promise((resolve, reject) => {
    // Search for the ZIP code boundary
    const query = `${zipData.zipCode}, ${zipData.city}, FL`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.status === 'OK' && json.results.length > 0) {
            const result = json.results[0];
            const bounds = result.geometry.bounds || result.geometry.viewport;
            
            if (bounds) {
              // Create a polygon from the bounds
              const geometry = {
                type: 'Polygon',
                coordinates: [[
                  [bounds.southwest.lng, bounds.southwest.lat],
                  [bounds.northeast.lng, bounds.southwest.lat],
                  [bounds.northeast.lng, bounds.northeast.lat],
                  [bounds.southwest.lng, bounds.northeast.lat],
                  [bounds.southwest.lng, bounds.southwest.lat]
                ]]
              };
              
              resolve({
                zipCode: zipData.zipCode,
                geometry: geometry
              });
            } else {
              console.log(`  ⚠️  No bounds for ZIP ${zipData.zipCode}`);
              resolve(null);
            }
          } else {
            console.log(`  ⚠️  No results for ZIP ${zipData.zipCode} (${json.status})`);
            resolve(null);
          }
        } catch (error) {
          console.log(`  ❌ Error parsing data for ZIP ${zipData.zipCode}:`, error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.log(`  ❌ Error fetching ZIP ${zipData.zipCode}:`, error.message);
      resolve(null);
    });
  });
}

async function fetchAllBoundaries() {
  const boundaries = [];
  let processed = 0;
  const total = miamiZips.length;
  
  console.log(`Fetching boundaries for ${total} ZIP codes...\n`);
  
  for (const zipData of miamiZips) {
    const boundary = await fetchZipBoundary(zipData);
    if (boundary) {
      boundaries.push(boundary);
    }
    
    processed++;
    
    // Progress indicator
    if (processed % 10 === 0 || processed === total) {
      const percent = ((processed / total) * 100).toFixed(1);
      console.log(`  Progress: ${processed}/${total} (${percent}%) - ${boundaries.length} boundaries found`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
  
  return boundaries;
}

async function main() {
  try {
    console.log('Starting boundary fetch...\n');
    const startTime = Date.now();
    
    const boundaries = await fetchAllBoundaries();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ Successfully fetched ${boundaries.length} ZIP code boundaries`);
    console.log(`  Processing time: ${duration} seconds\n`);
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(boundaries, null, 2));
    console.log(`✓ Saved to: ${OUTPUT_FILE}\n`);
    
    // Summary
    const missing = miamiZips.length - boundaries.length;
    if (missing > 0) {
      console.log(`⚠️  Warning: ${missing} ZIP codes had no boundary data available`);
    } else {
      console.log('✅ All ZIP codes successfully geocoded!\n');
    }
    
    console.log('\n✅ Miami ZIP code boundaries ready for map integration!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

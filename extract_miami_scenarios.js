#!/usr/bin/env node
/**
 * Extract Miami scenario data from 9 scenario views
 *
 * Parses each Miami scenario view's data files to extract ZIP-to-territory
 * assignments and formats them as Scenario JSON objects per CCPLAN interface.
 *
 * bd-3k4
 */

const fs = require('fs').promises;
const path = require('path');

// Miami scenario mapping: view component -> data files
const MIAMI_SCENARIOS = [
  {
    id: 'miami-10pct-optimization',
    name: '10% Reassignment Optimization',
    description: 'Route optimization with 10% tolerance allowing automatic reassignments',
    viewFile: 'components/miami-10pct-reassignment-view.tsx',
    dataFiles: [
      'public/miami-10pct-optimization.json',
      'public/miami-final-territory-assignments.json'
    ]
  },
  {
    id: 'miami-final-territory',
    name: 'Final Territory Assignments',
    description: 'Final optimized territory assignments for Miami market',
    viewFile: 'components/miami-final-territory-view.tsx',
    dataFiles: [
      'public/miami-final-territory-data.json',
      'public/miami-final-territory-assignments.json'
    ]
  },
  {
    id: 'miami-kml-scenario',
    name: 'KML Boundary Scenario',
    description: 'Territory scenario based on imported KML boundary data',
    viewFile: 'components/miami-kml-scenario-view.tsx',
    dataFiles: [
      'public/miami-kml-scenario.json',
      'public/miami-kml-boundaries.json'
    ]
  },
  {
    id: 'miami-radical-reroute',
    name: 'Radical Reroute Scenario',
    description: 'Major territory restructuring with significant route changes',
    viewFile: 'components/miami-radical-reroute-view.tsx',
    dataFiles: [
      'public/miami-radical-reroute.json'
    ]
  },
  {
    id: 'miami-zip-optimized',
    name: 'ZIP Code Optimized',
    description: 'Territory optimization focusing on ZIP code boundaries',
    viewFile: 'components/miami-zip-optimized-view.tsx',
    dataFiles: [
      'public/miami-zip-optimized-scenario.json',
      'public/miami-zip-optimized-assignments.json'
    ]
  },
  {
    id: 'miami-zip-optimized-2',
    name: 'ZIP Code Optimized v2',
    description: 'Enhanced ZIP code optimization with improved algorithms',
    viewFile: 'components/miami-zip-optimized-2-view.tsx',
    dataFiles: [
      'public/miami-zip-optimized-2-scenario.json',
      'public/miami-zip-optimized-2-assignments.json'
    ]
  },
  {
    id: 'miami-commercial-routes',
    name: 'Commercial Route Optimization',
    description: 'Territory assignments optimized for commercial accounts',
    viewFile: 'components/miami-commercial-routes-view.tsx',
    dataFiles: [
      'public/miami-commercial-routes.json'
    ]
  },
  {
    id: 'miami-future-commercial',
    name: 'Future Commercial Routes',
    description: 'Projected commercial account territory assignments',
    viewFile: 'components/miami-future-commercial-routes-view.tsx',
    dataFiles: [
      'public/miami-future-commercial-routes.json'
    ]
  },
  {
    id: 'miami-zip-scenario',
    name: 'ZIP Scenario Analysis',
    description: 'Comprehensive ZIP-based territory scenario analysis',
    viewFile: 'components/miami-zip-scenario-view.tsx',
    dataFiles: [
      'public/miami-map-data.json',
      'public/miami-map-data-expanded.json'
    ]
  }
];

const PROJECT_DIR = '/data/projects/ac_maps/phoenix_territory_map/nextjs_space';

/**
 * Extract ZIP-to-territory assignments from customer reassignment data
 */
function extractZipAssignments(reassignmentData, scenarioId) {
  const zipAssignments = new Map();

  // Process reassignments (could be autoReassignments, manualReassignments, or direct array)
  let assignments = [];

  if (Array.isArray(reassignmentData)) {
    assignments = reassignmentData;
  } else if (reassignmentData.autoReassignments) {
    assignments = reassignmentData.autoReassignments;
  } else if (reassignmentData.manualReassignments) {
    assignments = [...(reassignmentData.autoReassignments || []), ...reassignmentData.manualReassignments];
  } else if (reassignmentData.routeChanges) {
    // For route-based data, extract from route changes
    assignments = extractFromRouteChanges(reassignmentData.routeChanges);
  }

  // Group by ZIP code and aggregate
  assignments.forEach(assignment => {
    const zipCode = assignment.zip || assignment.zipCode;
    const fromTerritory = assignment.currentTerritory || assignment.fromTerritory || 'unassigned';
    const toTerritory = assignment.routePrimaryTerritory || assignment.toTerritory || assignment.territory;

    if (!zipCode || !toTerritory) return;

    const key = `${zipCode}-${fromTerritory}-${toTerritory}`;

    if (!zipAssignments.has(key)) {
      zipAssignments.set(key, {
        zipCode,
        fromTerritory,
        toTerritory,
        accountCount: 0,
        revenueImpact: 0, // Will be calculated if available
        accounts: []
      });
    }

    const zipAssignment = zipAssignments.get(key);
    zipAssignment.accountCount++;
    zipAssignment.accounts.push({
      customerNumber: assignment.customerNumber || assignment.accountNumber,
      accountName: assignment.accountName,
      address: assignment.address,
      latitude: assignment.latitude,
      longitude: assignment.longitude
    });
  });

  return Array.from(zipAssignments.values()).map(assignment => ({
    zipCode: assignment.zipCode,
    fromTerritory: assignment.fromTerritory,
    toTerritory: assignment.toTerritory,
    accountCount: assignment.accountCount,
    revenueImpact: assignment.revenueImpact
  }));
}

/**
 * Extract assignments from route change data structure
 */
function extractFromRouteChanges(routeChanges) {
  const assignments = [];

  routeChanges.forEach(route => {
    // Extract from incoming/outgoing customer moves
    if (route.incoming) {
      route.incoming.forEach(customerNumber => {
        assignments.push({
          customerNumber,
          currentTerritory: 'other', // Would need to look up
          routePrimaryTerritory: route.primaryTerritory,
          zip: 'unknown' // Would need customer lookup
        });
      });
    }
  });

  return assignments;
}

/**
 * Create Scenario object from extracted data
 */
function createScenario(scenarioConfig, zipReassignments) {
  return {
    id: scenarioConfig.id,
    name: scenarioConfig.name,
    description: scenarioConfig.description,
    location: 'miami',
    createdBy: 'system-migration',
    createdAt: new Date().toISOString(),
    baselineDataVersion: '2026-01-31',
    reassignments: zipReassignments,
    status: 'published'
  };
}

/**
 * Load and parse a JSON data file
 */
async function loadDataFile(filePath) {
  try {
    const fullPath = path.join(PROJECT_DIR, filePath);
    const data = await fs.readFile(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Failed to load ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract scenario data for a single Miami scenario
 */
async function extractScenario(scenarioConfig) {
  console.log(`\n📊 Processing: ${scenarioConfig.name}`);

  // Load all data files for this scenario
  const dataFiles = await Promise.all(
    scenarioConfig.dataFiles.map(filePath => loadDataFile(filePath))
  );

  // Filter out failed loads
  const validData = dataFiles.filter(data => data !== null);

  if (validData.length === 0) {
    console.warn(`⚠️  No valid data files found for ${scenarioConfig.id}`);
    return null;
  }

  // Find the main data file with reassignment information
  let mainData = null;

  for (const data of validData) {
    if (data.autoReassignments || data.manualReassignments ||
        data.routeChanges || Array.isArray(data)) {
      mainData = data;
      break;
    }
  }

  if (!mainData) {
    console.warn(`⚠️  No reassignment data found for ${scenarioConfig.id}`);
    return null;
  }

  // Extract ZIP assignments
  const zipReassignments = extractZipAssignments(mainData, scenarioConfig.id);

  console.log(`   📍 Extracted ${zipReassignments.length} ZIP reassignments`);

  if (zipReassignments.length === 0) {
    console.warn(`⚠️  No ZIP reassignments found for ${scenarioConfig.id}`);
    return null;
  }

  // Create Scenario object
  const scenario = createScenario(scenarioConfig, zipReassignments);

  console.log(`   ✅ Created scenario: ${scenario.reassignments.length} reassignments`);

  return scenario;
}

/**
 * Main extraction function
 */
async function main() {
  console.log('🎯 Extracting Miami Scenario Data (bd-3k4)');
  console.log('='.repeat(50));

  const extractedScenarios = [];

  // Process each scenario
  for (const scenarioConfig of MIAMI_SCENARIOS) {
    try {
      const scenario = await extractScenario(scenarioConfig);
      if (scenario) {
        extractedScenarios.push(scenario);
      }
    } catch (error) {
      console.error(`❌ Failed to process ${scenarioConfig.id}:`, error.message);
    }
  }

  console.log('\n📊 Extraction Summary:');
  console.log('='.repeat(30));
  console.log(`✅ Successfully processed: ${extractedScenarios.length}/9 scenarios`);

  // Save each scenario as individual JSON file
  const outputDir = '/data/projects/ac_maps/miami_scenarios_extracted';

  try {
    await fs.mkdir(outputDir, { recursive: true });

    for (const scenario of extractedScenarios) {
      const filename = `${scenario.id}.json`;
      const filepath = path.join(outputDir, filename);

      await fs.writeFile(filepath, JSON.stringify(scenario, null, 2));
      console.log(`💾 Saved: ${filename} (${scenario.reassignments.length} reassignments)`);
    }

    // Save summary file
    const summaryFile = path.join(outputDir, 'extraction_summary.json');
    const summary = {
      extractedAt: new Date().toISOString(),
      totalScenarios: extractedScenarios.length,
      scenarios: extractedScenarios.map(s => ({
        id: s.id,
        name: s.name,
        reassignmentCount: s.reassignments.length
      }))
    };

    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`📋 Saved extraction summary: ${summaryFile}`);

  } catch (error) {
    console.error('❌ Failed to save files:', error.message);
  }

  console.log('\n✅ Miami scenario extraction complete!');
}

// Run the extraction
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MIAMI_SCENARIOS, extractScenario, createScenario };
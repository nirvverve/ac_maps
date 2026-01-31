#!/usr/bin/env node
/**
 * Enhanced Miami scenario extraction with improved data structure recognition
 * bd-3k4
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_DIR = '/data/projects/ac_maps/phoenix_territory_map/nextjs_space';

/**
 * Enhanced extraction that handles multiple data formats
 */
function extractZipAssignments(data, scenarioId) {
  const zipAssignments = new Map();
  let assignments = [];

  console.log(`   🔍 Analyzing data structure for ${scenarioId}...`);

  // Format 1: Direct array (like miami-zip-scenario.json)
  if (Array.isArray(data)) {
    assignments = data;
    console.log(`   📋 Found direct array format: ${assignments.length} items`);
  }
  // Format 2: AutoReassignments structure (like miami-10pct-optimization.json)
  else if (data.autoReassignments) {
    assignments = data.autoReassignments;
    console.log(`   📋 Found autoReassignments: ${assignments.length} items`);
  }
  // Format 3: Radical reroute structure with customerAssignments
  else if (data.customerAssignments) {
    assignments = data.customerAssignments;
    console.log(`   📋 Found customerAssignments: ${assignments.length} items`);
  }
  // Format 4: Root-level array with customer data (like miami-radical-reroute.json)
  else if (data.customers) {
    assignments = data.customers;
    console.log(`   📋 Found customers array: ${assignments.length} items`);
  }
  // Format 5: Check for any array property that contains customer-like data
  else {
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0];
        // Check if this looks like customer data
        if (firstItem && (firstItem.zip || firstItem.zipCode || firstItem.customerNumber)) {
          assignments = value;
          console.log(`   📋 Found array in '${key}': ${assignments.length} items`);
          break;
        }
      }
    }
  }

  if (assignments.length === 0) {
    console.log(`   ⚠️  No customer assignments found in data structure`);
    return [];
  }

  console.log(`   🧮 Processing ${assignments.length} assignments...`);

  // Process assignments with flexible field mapping
  assignments.forEach((assignment, index) => {
    // Extract ZIP code (multiple possible field names)
    const zipCode = assignment.zip || assignment.zipCode || assignment.postalCode;

    // Extract territory information (multiple possible patterns)
    let fromTerritory = assignment.currentTerritory || assignment.fromTerritory ||
                       assignment.oldTerritory || assignment.originalTerritory || 'unassigned';
    let toTerritory = assignment.routePrimaryTerritory || assignment.toTerritory ||
                     assignment.newTerritory || assignment.assignedTerritory ||
                     assignment.territory || fromTerritory;

    // For miami-zip-scenario format, extract territory from assignment
    if (assignment.territory && !toTerritory) {
      toTerritory = assignment.territory;
    }

    // Skip if essential data is missing
    if (!zipCode) {
      if (index < 5) console.log(`   ⚠️  Skipping item ${index}: no ZIP code`);
      return;
    }

    // Create unique key for grouping
    const key = `${zipCode}-${fromTerritory}-${toTerritory}`;

    if (!zipAssignments.has(key)) {
      zipAssignments.set(key, {
        zipCode: zipCode.toString(),
        fromTerritory,
        toTerritory,
        accountCount: 0,
        revenueImpact: 0,
        totalMonthlyRevenue: 0
      });
    }

    const zipAssignment = zipAssignments.get(key);
    zipAssignment.accountCount++;

    // Calculate revenue impact if available
    const monthlyPrice = assignment.monthlyPrice || assignment.monthlyRevenue || 0;
    if (monthlyPrice > 0) {
      zipAssignment.totalMonthlyRevenue += monthlyPrice;
      zipAssignment.revenueImpact = zipAssignment.totalMonthlyRevenue * 12; // Annual impact
    }
  });

  console.log(`   ✅ Grouped into ${zipAssignments.size} unique ZIP reassignments`);

  return Array.from(zipAssignments.values()).map(assignment => ({
    zipCode: assignment.zipCode,
    fromTerritory: assignment.fromTerritory,
    toTerritory: assignment.toTerritory,
    accountCount: assignment.accountCount,
    revenueImpact: Math.round(assignment.revenueImpact)
  }));
}

/**
 * Enhanced scenario extraction with better error handling
 */
async function extractScenario(scenarioConfig) {
  console.log(`\n📊 Processing: ${scenarioConfig.name}`);

  // Load all data files for this scenario
  const dataFiles = [];
  for (const filePath of scenarioConfig.dataFiles) {
    try {
      const fullPath = path.join(PROJECT_DIR, filePath);
      const data = await fs.readFile(fullPath, 'utf8');
      const parsed = JSON.parse(data);
      dataFiles.push({ filePath, data: parsed });
      console.log(`   📂 Loaded: ${filePath}`);
    } catch (error) {
      console.log(`   ⚠️  Failed to load ${filePath}: ${error.message}`);
    }
  }

  if (dataFiles.length === 0) {
    console.log(`   ❌ No valid data files found`);
    return null;
  }

  // Try to extract from each data file
  let bestExtraction = null;
  let maxReassignments = 0;

  for (const file of dataFiles) {
    try {
      const zipReassignments = extractZipAssignments(file.data, scenarioConfig.id);

      if (zipReassignments.length > maxReassignments) {
        maxReassignments = zipReassignments.length;
        bestExtraction = zipReassignments;
        console.log(`   ⭐ Best extraction from ${file.filePath}: ${zipReassignments.length} reassignments`);
      }
    } catch (error) {
      console.log(`   ⚠️  Extraction failed from ${file.filePath}: ${error.message}`);
    }
  }

  if (!bestExtraction || bestExtraction.length === 0) {
    console.log(`   ❌ No ZIP reassignments extracted`);
    return null;
  }

  // Create Scenario object
  const scenario = {
    id: scenarioConfig.id,
    name: scenarioConfig.name,
    description: scenarioConfig.description,
    location: 'miami',
    createdBy: 'system-migration',
    createdAt: new Date().toISOString(),
    baselineDataVersion: '2026-01-31',
    reassignments: bestExtraction,
    status: 'published'
  };

  console.log(`   ✅ Created scenario with ${scenario.reassignments.length} reassignments`);

  return scenario;
}

/**
 * Updated scenario configurations with better data file mapping
 */
const MIAMI_SCENARIOS = [
  {
    id: 'miami-10pct-optimization',
    name: '10% Reassignment Optimization',
    description: 'Route optimization with 10% tolerance allowing automatic reassignments',
    dataFiles: ['public/miami-10pct-optimization.json']
  },
  {
    id: 'miami-final-territory',
    name: 'Final Territory Assignments',
    description: 'Final optimized territory assignments for Miami market',
    dataFiles: ['public/miami-final-territory-data.json', 'public/miami-final-territory-assignments.json']
  },
  {
    id: 'miami-kml-scenario',
    name: 'KML Boundary Scenario',
    description: 'Territory scenario based on imported KML boundary data',
    dataFiles: ['public/miami-kml-scenario.json']
  },
  {
    id: 'miami-radical-reroute',
    name: 'Radical Reroute Scenario',
    description: 'Major territory restructuring with significant route changes',
    dataFiles: ['public/miami-radical-reroute.json']
  },
  {
    id: 'miami-zip-optimized',
    name: 'ZIP Code Optimized',
    description: 'Territory optimization focusing on ZIP code boundaries',
    dataFiles: ['public/miami-zip-optimized-scenario.json']
  },
  {
    id: 'miami-zip-optimized-2',
    name: 'ZIP Code Optimized v2',
    description: 'Enhanced ZIP code optimization with improved algorithms',
    dataFiles: ['public/miami-zip-optimized-2-scenario.json']
  },
  {
    id: 'miami-commercial-routes',
    name: 'Commercial Route Optimization',
    description: 'Territory assignments optimized for commercial accounts',
    dataFiles: ['public/miami-commercial-routes.json']
  },
  {
    id: 'miami-future-commercial',
    name: 'Future Commercial Routes',
    description: 'Projected commercial account territory assignments',
    dataFiles: ['public/miami-future-commercial-routes.json']
  },
  {
    id: 'miami-zip-scenario',
    name: 'ZIP Scenario Analysis',
    description: 'Comprehensive ZIP-based territory scenario analysis',
    dataFiles: ['public/miami-map-data.json']
  }
];

/**
 * Main extraction function
 */
async function main() {
  console.log('🎯 Enhanced Miami Scenario Extraction (bd-3k4 v2)');
  console.log('='.repeat(55));

  const extractedScenarios = [];

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

  console.log('\n📊 Enhanced Extraction Summary:');
  console.log('='.repeat(35));
  console.log(`✅ Successfully processed: ${extractedScenarios.length}/9 scenarios`);

  // Save results
  const outputDir = '/data/projects/ac_maps/miami_scenarios_extracted';
  await fs.mkdir(outputDir, { recursive: true });

  for (const scenario of extractedScenarios) {
    const filename = `${scenario.id}.json`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, JSON.stringify(scenario, null, 2));

    const revenueTotal = scenario.reassignments.reduce((sum, r) => sum + r.revenueImpact, 0);
    console.log(`💾 ${filename} - ${scenario.reassignments.length} reassignments, $${revenueTotal.toLocaleString()} revenue impact`);
  }

  // Enhanced summary
  const summary = {
    extractedAt: new Date().toISOString(),
    totalScenarios: extractedScenarios.length,
    totalReassignments: extractedScenarios.reduce((sum, s) => sum + s.reassignments.length, 0),
    totalRevenueImpact: extractedScenarios.reduce((sum, s) =>
      sum + s.reassignments.reduce((rSum, r) => rSum + r.revenueImpact, 0), 0
    ),
    scenarios: extractedScenarios.map(s => ({
      id: s.id,
      name: s.name,
      reassignmentCount: s.reassignments.length,
      revenueImpact: s.reassignments.reduce((sum, r) => sum + r.revenueImpact, 0)
    }))
  };

  await fs.writeFile(
    path.join(outputDir, 'extraction_summary_v2.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log(`\n📋 Summary: ${summary.totalReassignments} total reassignments, $${summary.totalRevenueImpact.toLocaleString()} total revenue impact`);
  console.log('\n✅ Enhanced Miami scenario extraction complete!');
}

if (require.main === module) {
  main().catch(console.error);
}
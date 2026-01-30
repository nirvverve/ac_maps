const fs = require('fs');
const path = require('path');

// Load Miami final territory data (has correct territory assignments)
const miamiCustomers = JSON.parse(fs.readFileSync(path.join(__dirname, 'nextjs_space/public/miami-final-territory-data.json'), 'utf8'));

// Technician configuration from spreadsheet
const techConfig = [
  { route: 1, name: 'Sharion Spears', routeKey: '1 AFP Route Sharion S', territory: 'North', isFloater: true, min: null, max: null },
  { route: 2, name: 'William A', routeKey: '2 AFP Route William A', territory: 'North', isFloater: false, min: 60, max: 70 },
  { route: 5, name: 'Freddy Sosa', routeKey: '5 AFP Route Freddy S', territory: 'Central', isFloater: false, min: 60, max: 70 },
  { route: 6, name: 'Casey DeLaurier', routeKey: '6 AFP Route Casey D', territory: 'South', isFloater: true, min: null, max: null },
  { route: 7, name: 'Andra Gardner', routeKey: '7 AFP Route Andra G', territory: 'South', isFloater: false, min: 50, max: 60 },
  { route: 11, name: 'Honatann Bocanegra', routeKey: '11 AFP Route Honatann B', territory: 'South', isFloater: false, min: 60, max: 65 },
  { route: 14, name: 'New Technician (14)', routeKey: '14 AFP Route', territory: 'TBD', isFloater: false, min: 60, max: 65, isNewHire: true },
  { route: 15, name: 'New Technician (15)', routeKey: '15 AFP Route', territory: 'TBD', isFloater: false, min: 60, max: 65, isNewHire: true },
  { route: 16, name: 'Robert Derilus', routeKey: '16 AFP Route Robert D', territory: 'North', isFloater: false, min: 60, max: 65 },
  { route: 17, name: 'Roosevelt Francois', routeKey: '17 AFP Roosevelt F', territory: 'Central', isFloater: false, min: 60, max: 70 },
  { route: 21, name: 'Carlos Matta', routeKey: '21 AFP Route Carlos M', territory: 'Central', isFloater: false, min: 70, max: 70 },
  { route: 24, name: 'Jorge Braojos', routeKey: '24 AFP Route Jorge B', territory: 'Central', isFloater: false, min: 60, max: 70 },
  { route: 28, name: 'Dezilma Jean', routeKey: '28 AFP Route Jean D', territory: 'South', isFloater: false, min: 70, max: 70 },
  { route: 29, name: 'Erick Bonilla', routeKey: '29 AFP Route Erick B', territory: 'Central', isFloater: false, min: 70, max: 70 },
  { route: 103, name: 'Wesley Odeus', routeKey: '103 AFP Route Vacant', territory: 'Central', isFloater: true, min: null, max: null },
  { route: 105, name: 'Miguel Rodriguez', routeKey: '105 AFP Route Miguel R', territory: 'North', isFloater: false, min: 60, max: 70 },
];

// Filter out invalid customers
const validCustomers = miamiCustomers.filter(c => 
  c.customerNumber && 
  c.latitude && c.longitude
);

console.log(`Total valid customers: ${validCustomers.length}`);

// Use newTerritory as the original territory assignment
validCustomers.forEach(c => {
  c.originalTerritory = c.newTerritory;
});

// Count customers per territory
const territoryCount = { North: 0, Central: 0, South: 0 };
validCustomers.forEach(c => {
  territoryCount[c.originalTerritory] = (territoryCount[c.originalTerritory] || 0) + 1;
});
console.log('\nCustomers per territory:', territoryCount);

// Get non-floater technicians with min/max
const regularTechs = techConfig.filter(t => !t.isFloater && t.min && t.max && !t.isNewHire);
const floaterTechs = techConfig.filter(t => t.isFloater);
const newHireTechs = techConfig.filter(t => t.isNewHire);

// Calculate capacity per territory
const territoryCapacity = { North: 0, Central: 0, South: 0 };
regularTechs.forEach(t => {
  if (t.territory && territoryCapacity[t.territory] !== undefined) {
    territoryCapacity[t.territory] += t.max;
  }
});
console.log('\nTerritory capacity (regular techs):', territoryCapacity);

// Initialize assignments
const assignments = {};
regularTechs.forEach(t => {
  assignments[t.routeKey] = {
    ...t,
    customers: [],
    keptFromOriginal: 0,
    addedNew: 0,
  };
});

// First pass: Keep customers with their original technician if territory matches
validCustomers.forEach(c => {
  const currentRoute = c.route;
  const tech = regularTechs.find(t => t.routeKey === currentRoute);
  
  if (tech && tech.territory === c.originalTerritory) {
    if (assignments[tech.routeKey].customers.length < tech.max) {
      assignments[tech.routeKey].customers.push({
        ...c,
        assignedRoute: tech.routeKey,
        assignedTech: tech.name,
        assignedTerritory: c.originalTerritory,
        status: 'kept',
      });
      assignments[tech.routeKey].keptFromOriginal++;
      c.assigned = true;
    }
  }
});

let unassigned = validCustomers.filter(c => !c.assigned);
console.log(`\nAfter first pass (keeping original): ${validCustomers.length - unassigned.length} assigned`);
console.log(`Unassigned: ${unassigned.length}`);

// Second pass: Fill technicians to minimum within their territory
['North', 'Central', 'South'].forEach(territory => {
  const territoryTechs = regularTechs.filter(t => t.territory === territory);
  const unassignedInTerritory = unassigned.filter(c => c.originalTerritory === territory && !c.assigned);
  
  // Sort technicians by how far below minimum they are
  territoryTechs.sort((a, b) => {
    const aNeeds = a.min - assignments[a.routeKey].customers.length;
    const bNeeds = b.min - assignments[b.routeKey].customers.length;
    return bNeeds - aNeeds;
  });
  
  // Assign customers to technicians who need more
  for (const c of unassignedInTerritory) {
    if (c.assigned) continue;
    
    // Find technician who needs most and is below max
    for (const tech of territoryTechs) {
      if (assignments[tech.routeKey].customers.length < tech.max) {
        assignments[tech.routeKey].customers.push({
          ...c,
          assignedRoute: tech.routeKey,
          assignedTech: tech.name,
          assignedTerritory: territory,
          status: 'reassigned',
        });
        assignments[tech.routeKey].addedNew++;
        c.assigned = true;
        break;
      }
    }
    
    // Re-sort after each assignment
    territoryTechs.sort((a, b) => {
      const aNeeds = a.min - assignments[a.routeKey].customers.length;
      const bNeeds = b.min - assignments[b.routeKey].customers.length;
      return bNeeds - aNeeds;
    });
  }
});

unassigned = validCustomers.filter(c => !c.assigned);
console.log(`\nAfter territory fill: ${unassigned.length} still unassigned`);

// Third pass: New hires pick up remaining
const unassignedByTerritory = { North: 0, Central: 0, South: 0 };
unassigned.forEach(c => {
  unassignedByTerritory[c.originalTerritory] = (unassignedByTerritory[c.originalTerritory] || 0) + 1;
});
console.log('Unassigned by territory:', unassignedByTerritory);

// Assign new hires to territories with most need
const sortedTerritories = Object.entries(unassignedByTerritory).sort((a, b) => b[1] - a[1]);
newHireTechs.forEach((tech, idx) => {
  const assignedTerritory = sortedTerritories[idx % sortedTerritories.length][0];
  tech.territory = assignedTerritory;
  assignments[tech.routeKey] = {
    ...tech,
    customers: [],
    keptFromOriginal: 0,
    addedNew: 0,
  };
  console.log(`New hire ${tech.name} assigned to ${assignedTerritory}`);
});

// Assign customers to new hires within their assigned territory
newHireTechs.forEach(tech => {
  const territoryCustomers = unassigned.filter(c => !c.assigned && c.originalTerritory === tech.territory);
  for (const c of territoryCustomers) {
    if (assignments[tech.routeKey].customers.length >= tech.max) break;
    assignments[tech.routeKey].customers.push({
      ...c,
      assignedRoute: tech.routeKey,
      assignedTech: tech.name,
      assignedTerritory: c.originalTerritory,
      status: 'new-hire',
    });
    assignments[tech.routeKey].addedNew++;
    c.assigned = true;
  }
});

// Any remaining go to floater pool
unassigned = validCustomers.filter(c => !c.assigned);
console.log(`\nAfter new hires: ${unassigned.length} going to floater pool`);

const floaterPool = unassigned.map(c => ({
  ...c,
  assignedRoute: 'Floater Pool',
  assignedTech: 'Floater',
  assignedTerritory: c.originalTerritory,
  status: 'floater',
}));

// Mark as assigned
unassigned.forEach(c => c.assigned = true);

// Generate summary
console.log('\n=== ROUTE SUMMARY ===');
let totalAssigned = 0;
const routeSummary = [];

// Include new hires in summary
const allTechs = [...regularTechs, ...newHireTechs];

Object.entries(assignments).forEach(([route, data]) => {
  const count = data.customers.length;
  totalAssigned += count;
  const status = !data.min ? 'FLOATER' : count >= data.min && count <= data.max ? '✓' : count < data.min ? '⚠ UNDER' : '⚠ OVER';
  console.log(`${data.name} (${data.territory}): ${count} pools ${data.min ? `[${data.min}-${data.max}]` : ''} ${status} (kept: ${data.keptFromOriginal}, new: ${data.addedNew})`);
  routeSummary.push({
    route: data.route,
    routeKey: data.routeKey,
    technician: data.name,
    territory: data.territory,
    isFloater: data.isFloater || false,
    isNewHire: data.isNewHire || false,
    poolCount: count,
    min: data.min,
    max: data.max,
    keptFromOriginal: data.keptFromOriginal,
    addedNew: data.addedNew,
    meetsTarget: data.min ? count >= data.min && count <= data.max : true,
  });
});

console.log(`\nFloater pool: ${floaterPool.length}`);
console.log(`Total assigned to routes: ${totalAssigned}`);
console.log(`Total (including floaters): ${totalAssigned + floaterPool.length}`);

// Territory summary
const territorySummary = { North: { assigned: 0, target: 0 }, Central: { assigned: 0, target: 0 }, South: { assigned: 0, target: 0 } };
routeSummary.forEach(r => {
  if (r.territory && territorySummary[r.territory]) {
    territorySummary[r.territory].assigned += r.poolCount;
    territorySummary[r.territory].target += r.max || 0;
  }
});
console.log('\nTerritory Summary:');
Object.entries(territorySummary).forEach(([t, data]) => {
  console.log(`  ${t}: ${data.assigned} assigned (capacity: ${data.target})`);
});

// Compile all assigned customers
const allAssignments = [];
Object.values(assignments).forEach(data => {
  data.customers.forEach(c => allAssignments.push(c));
});
floaterPool.forEach(c => allAssignments.push(c));

// Save the data
const outputData = {
  scenario: 'Radical Reroute - Target Min/Max',
  generatedAt: new Date().toISOString(),
  summary: {
    totalCustomers: validCustomers.length,
    totalAssigned: totalAssigned,
    floaterPool: floaterPool.length,
    territories: territoryCount,
    territorySummary: territorySummary,
  },
  routeSummary: routeSummary,
  floaterTechs: floaterTechs.map(t => ({ route: t.route, name: t.name, territory: t.territory })),
  customers: allAssignments,
  floaterPool: floaterPool,
};

fs.writeFileSync(
  path.join(__dirname, 'nextjs_space/public/miami-radical-reroute.json'),
  JSON.stringify(outputData, null, 2)
);

console.log('\n✓ Saved to miami-radical-reroute.json');

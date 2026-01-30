const fs = require('fs');
const path = require('path');

const radicalData = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'nextjs_space/public/miami-radical-reroute.json'), 'utf8'
));

console.log('=== Before Update ===');
const route14Summary = radicalData.routeSummary.find(r => r.route === 14);
const route15Summary = radicalData.routeSummary.find(r => r.route === 15);
console.log('Route 14:', route14Summary.technician);
console.log('Route 15:', route15Summary.technician);

// Update Route 14 to Jorge A
route14Summary.technician = 'Jorge A';
route14Summary.routeKey = '14 AFP Route Jorge A';
route14Summary.isNewHire = false;

// Update all customers assigned to Route 14
radicalData.customers.forEach(c => {
  if (c.assignedRoute === '14 AFP Route') {
    c.assignedRoute = '14 AFP Route Jorge A';
    c.assignedTech = 'Jorge A';
  }
});

console.log('\n=== After Update ===');
console.log('Route 14:', route14Summary.technician);
console.log('Route 15:', route15Summary.technician);

// Verify customer updates
const route14Customers = radicalData.customers.filter(c => c.assignedRoute === '14 AFP Route Jorge A');
console.log(`\nRoute 14 (Jorge A) now has ${route14Customers.length} customers`);

// Check how many were originally Jorge A's
const originalJorgeA = route14Customers.filter(c => c.route === '14 AFP Route Jorge A');
console.log(`  - ${originalJorgeA.length} originally belonged to Jorge A (kept)`);
console.log(`  - ${route14Customers.length - originalJorgeA.length} reassigned to Jorge A (new)`);

// Update keptFromOriginal count
route14Summary.keptFromOriginal = originalJorgeA.length;
route14Summary.addedNew = route14Customers.length - originalJorgeA.length;

// Save
fs.writeFileSync(
  path.join(__dirname, 'nextjs_space/public/miami-radical-reroute.json'),
  JSON.stringify(radicalData, null, 2)
);
console.log('\n✓ Saved updated miami-radical-reroute.json');

// Summary
console.log('\n=== Final Route Summary ===');
radicalData.routeSummary.forEach(r => {
  console.log(`  Route ${r.route}: ${r.technician} (${r.territory}) - ${r.poolCount} pools`);
});

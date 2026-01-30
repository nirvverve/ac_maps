const fs = require('fs');
const path = require('path');

const radicalData = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'nextjs_space/public/miami-radical-reroute.json'), 'utf8'
));

// Find customers assigned to routes 14 and 15
const route14Customers = radicalData.customers.filter(c => c.assignedRoute === '14 AFP Route');
const route15Customers = radicalData.customers.filter(c => c.assignedRoute === '15 AFP Route');

console.log(`Route 14 customers: ${route14Customers.length}`);
console.log(`Route 15 customers: ${route15Customers.length}`);

// Check original routes for route 14
console.log('\n=== Route 14 (South) - Original Route Breakdown ===');
const orig14 = {};
route14Customers.forEach(c => {
  const orig = c.route || 'unknown';
  orig14[orig] = (orig14[orig] || 0) + 1;
});
Object.entries(orig14).sort((a,b) => b[1] - a[1]).forEach(([r, count]) => {
  console.log(`  ${r}: ${count}`);
});

// Check original routes for route 15
console.log('\n=== Route 15 (Central) - Original Route Breakdown ===');
const orig15 = {};
route15Customers.forEach(c => {
  const orig = c.route || 'unknown';
  orig15[orig] = (orig15[orig] || 0) + 1;
});
Object.entries(orig15).sort((a,b) => b[1] - a[1]).forEach(([r, count]) => {
  console.log(`  ${r}: ${count}`);
});

// Check if Jorge A exists in original routes - might be "14 AFP Route Jorge A"
const allOrigRoutes = [...new Set(radicalData.customers.map(c => c.route))];
console.log('\nAll original routes:');
allOrigRoutes.forEach(r => console.log('  ', r));

// Find any Jorge pools
const jorgeCustomers = radicalData.customers.filter(c => 
  c.route && c.route.toLowerCase().includes('jorge')
);
console.log(`\nCustomers originally from any Jorge route: ${jorgeCustomers.length}`);
if (jorgeCustomers.length > 0) {
  const jorgeRoutes = [...new Set(jorgeCustomers.map(c => c.route))];
  console.log('Jorge routes found:', jorgeRoutes);
  
  // Where are these Jorge customers now assigned?
  const jorgeDestinations = {};
  jorgeCustomers.forEach(c => {
    jorgeDestinations[c.assignedRoute] = (jorgeDestinations[c.assignedRoute] || 0) + 1;
  });
  console.log('\nJorge customers now assigned to:');
  Object.entries(jorgeDestinations).sort((a,b) => b[1] - a[1]).forEach(([r, count]) => {
    console.log(`  ${r}: ${count}`);
  });
}

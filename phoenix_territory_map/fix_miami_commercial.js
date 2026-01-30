const fs = require('fs');

// Load Miami route assignments
const routes = JSON.parse(fs.readFileSync('nextjs_space/public/miami-route-assignments.json', 'utf8'));

// Filter for commercial accounts
const commercial = routes.filter(r => r.accountType === 'Commercial');

console.log(`Found ${commercial.length} commercial accounts in Miami`);

// Calculate totals
const totalMonthly = commercial.reduce((sum, acc) => sum + (acc.monthlyPrice || 0), 0);
const totalYearly = commercial.reduce((sum, acc) => sum + (acc.yearlyPrice || 0), 0);

console.log(`Total Monthly Revenue: $${totalMonthly.toLocaleString()}`);
console.log(`Total Yearly Revenue: $${totalYearly.toLocaleString()}`);

// Write to file
fs.writeFileSync(
  'nextjs_space/public/miami-commercial-accounts.json',
  JSON.stringify(commercial, null, 2)
);

console.log('✓ Miami commercial accounts updated');

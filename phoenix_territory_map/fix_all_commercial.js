const fs = require('fs');

const locations = ['dallas', 'miami'];

locations.forEach(location => {
  const routeFile = `nextjs_space/public/${location}-route-assignments.json`;
  const commercialFile = `nextjs_space/public/${location}-commercial-accounts.json`;
  
  if (!fs.existsSync(routeFile)) {
    console.log(`⚠️  ${location} route file not found, skipping`);
    return;
  }
  
  const routes = JSON.parse(fs.readFileSync(routeFile, 'utf8'));
  const commercial = routes.filter(r => r.accountType === 'Commercial');
  
  if (commercial.length === 0) {
    console.log(`ℹ️  ${location} has no commercial accounts`);
    return;
  }
  
  const totalMonthly = commercial.reduce((sum, acc) => sum + (acc.monthlyPrice || 0), 0);
  const totalYearly = commercial.reduce((sum, acc) => sum + (acc.yearlyPrice || 0), 0);
  
  console.log(`\n${location.toUpperCase()}:`);
  console.log(`  Commercial accounts: ${commercial.length}`);
  console.log(`  Monthly revenue: $${totalMonthly.toLocaleString()}`);
  console.log(`  Yearly revenue: $${totalYearly.toLocaleString()}`);
  
  fs.writeFileSync(commercialFile, JSON.stringify(commercial, null, 2));
  console.log(`  ✓ Updated ${commercialFile}`);
});

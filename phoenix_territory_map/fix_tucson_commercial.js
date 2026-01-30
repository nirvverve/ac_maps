const fs = require('fs');
const path = require('path');

const commercialAccountsPath = path.join(__dirname, 'nextjs_space/public/commercial-accounts.json');

console.log('Updating Tucson commercial accounts...\n');

const accounts = JSON.parse(fs.readFileSync(commercialAccountsPath, 'utf8'));

// Find and update the 2 Tucson area accounts
let updatedCount = 0;
const updatedAccounts = accounts.map(account => {
  // Check if latitude is in Tucson area (< 32.5)
  if (account.latitude < 32.5) {
    console.log(`Updating: ${account.customerNumber} - ${account.city}`);
    console.log(`  From: ${account.closestOffice} → To: Tucson\n`);
    updatedCount++;
    return { ...account, closestOffice: 'Tucson' };
  }
  return account;
});

fs.writeFileSync(commercialAccountsPath, JSON.stringify(updatedAccounts, null, 2));

console.log(`✅ Updated ${updatedCount} accounts to Tucson\n`);

// Show new breakdown
const byOffice = {};
updatedAccounts.forEach(acc => {
  const office = acc.closestOffice;
  if (!byOffice[office]) byOffice[office] = 0;
  byOffice[office]++;
});

console.log('New Commercial Accounts by Branch:');
Object.entries(byOffice).sort((a,b) => b[1] - a[1]).forEach(([office, count]) => {
  console.log(`  ${office}: ${count} accounts (${(count/updatedAccounts.length*100).toFixed(1)}%)`);
});
console.log(`\nTotal: ${updatedAccounts.length} accounts`);

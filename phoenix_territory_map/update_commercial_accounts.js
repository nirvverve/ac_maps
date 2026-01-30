const fs = require('fs');
const path = require('path');

// File paths
const commercialAccountsPath = path.join(__dirname, 'nextjs_space/public/commercial-accounts.json');
const commercialDensityPath = path.join(__dirname, 'nextjs_space/public/commercial-density-data.json');

console.log('Starting commercial accounts reorganization...\n');

// 1. Update commercial-accounts.json
console.log('1. Updating commercial-accounts.json...');
const accounts = JSON.parse(fs.readFileSync(commercialAccountsPath, 'utf8'));

let westToCommercial = 0;
let centralToCommercial = 0;
let eastKept = 0;
let tucsonKept = 0;

const updatedAccounts = accounts.map(account => {
  if (account.closestOffice === 'West') {
    westToCommercial++;
    return { ...account, closestOffice: 'Commercial' };
  } else if (account.closestOffice === 'Central') {
    centralToCommercial++;
    return { ...account, closestOffice: 'Commercial' };
  } else if (account.closestOffice === 'East') {
    eastKept++;
    return account;
  } else if (account.closestOffice === 'Tucson') {
    tucsonKept++;
    return account;
  }
  return account;
});

fs.writeFileSync(commercialAccountsPath, JSON.stringify(updatedAccounts, null, 2));

console.log(`   - West accounts moved to Commercial: ${westToCommercial}`);
console.log(`   - Central accounts moved to Commercial: ${centralToCommercial}`);
console.log(`   - East accounts kept: ${eastKept}`);
console.log(`   - Tucson accounts kept: ${tucsonKept}`);
console.log(`   - Total Commercial accounts: ${westToCommercial + centralToCommercial}`);

// 2. Update commercial-density-data.json
console.log('\n2. Updating commercial-density-data.json...');
const densityData = JSON.parse(fs.readFileSync(commercialDensityPath, 'utf8'));

const updatedDensityData = densityData.map(zipData => {
  if (zipData.territory === 'West' || zipData.territory === 'Central') {
    return { ...zipData, territory: 'Commercial' };
  }
  return zipData;
});

fs.writeFileSync(commercialDensityPath, JSON.stringify(updatedDensityData, null, 2));
console.log('   - Density data updated successfully');

console.log('\n✅ Commercial accounts reorganization complete!');
console.log('\nSummary:');
console.log('- APS of Glendale (West) commercial → APS - Commercial');
console.log('- APS of Scottsdale (Central) commercial → APS - Commercial');
console.log('- APS of Chandler (East) → Kept as East');
console.log('- APS of Tucson → Kept as Tucson');

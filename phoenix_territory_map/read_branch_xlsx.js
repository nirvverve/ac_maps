const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('/home/ubuntu/Uploads/Zip Code Mapping for APS - Phoenix and Tucson.xlsx');

// Get the first sheet name
const sheetName = workbook.SheetNames[0];
console.log('Sheet name:', sheetName);

// Get the worksheet
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total rows:', data.length);
console.log('\nFirst 5 rows:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));

console.log('\nColumn headers:');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}

// Check for unique branches
const branches = new Set();
data.forEach(row => {
  if (row['Branch']) branches.add(row['Branch']);
  if (row['NEW BRANCH']) branches.add(row['NEW BRANCH']);
});
console.log('\nUnique branches:', Array.from(branches));

const XLSX = require('xlsx');
const fs = require('fs');

const filePath = '/home/ubuntu/Uploads/Customer List Jacksonville as of 12 30 2025.xlsx';

console.log('Reading Jacksonville customer file...\n');

const workbook = XLSX.readFile(filePath);

console.log('=== WORKBOOK INFO ===');
console.log('Sheet Names:', workbook.SheetNames);
console.log('');

// Examine each sheet
workbook.SheetNames.forEach((sheetName, idx) => {
  console.log(`\n=== SHEET ${idx + 1}: ${sheetName} ===`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Total rows: ${data.length}`);
  
  if (data.length > 0) {
    console.log('\nColumn names:', Object.keys(data[0]).join(', '));
    console.log('\nFirst 3 rows:');
    data.slice(0, 3).forEach((row, i) => {
      console.log(`\nRow ${i + 1}:`, JSON.stringify(row, null, 2));
    });
  }
});


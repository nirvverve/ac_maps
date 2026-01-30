const fs = require('fs');
const path = require('path');

const commercialAccounts = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'nextjs_space/public/miami-commercial-routes.json'), 'utf8'
));

const MAX_POOLS = 30;
const MAX_VISITS_PER_WEEK = 55; // Balance visits too

const futureTechs = [
  { name: 'Kymani P', fullRoute: '15 AFP Route Kymani P' },
  { name: 'Ramon R', fullRoute: '22 AFP Route Ramon R' },
  { name: 'Juan C', fullRoute: '23 AFP Route Juan C' },
  { name: 'Carlos S', fullRoute: '25 AFP Route Carlos S' },
];

const keepUnassignedPartial = ['bora', 'belle plaza', 'canterbury'];

// Dedupe by customer number
const uniqueAccounts = new Map();
commercialAccounts.forEach(account => {
  if (!uniqueAccounts.has(account.customerNumber)) {
    uniqueAccounts.set(account.customerNumber, {...account});
  } else {
    const existing = uniqueAccounts.get(account.customerNumber);
    const allDays = new Set([...existing.days, ...account.days]);
    existing.days = [...allDays];
  }
});
const deduped = [...uniqueAccounts.values()];

// Track tech data
const techData = {};
futureTechs.forEach(t => {
  techData[t.fullRoute] = {
    name: t.name,
    fullRoute: t.fullRoute,
    poolCount: 0,
    totalVisits: 0,
    dayVisits: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 },
    accounts: [],
    centroid: null
  };
});

const poolsToAssign = [];

// Separate pools - keep only what's already assigned to our 4 techs
deduped.forEach(account => {
  const matchedTech = futureTechs.find(t => t.fullRoute === account.route);
  
  if (matchedTech) {
    const data = techData[matchedTech.fullRoute];
    data.accounts.push({...account, reassigned: false, originalRoute: account.route, originalTech: account.routeTech});
    data.poolCount++;
    account.days.forEach(d => {
      if (data.dayVisits[d] !== undefined) {
        data.dayVisits[d]++;
        data.totalVisits++;
      }
    });
  } else if (account.route === 'Unassigned') {
    if (keepUnassignedPartial.some(p => account.accountName.toLowerCase().includes(p))) {
      poolsToAssign.push({...account});
    }
  } else {
    poolsToAssign.push({...account});
  }
});

// Calculate centroids
function getCentroid(accounts) {
  if (!accounts.length) return null;
  const sum = accounts.reduce((acc, a) => ({ lat: acc.lat + a.latitude, lng: acc.lng + a.longitude }), { lat: 0, lng: 0 });
  return { lat: sum.lat / accounts.length, lng: sum.lng / accounts.length };
}

function distance(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

futureTechs.forEach(t => {
  techData[t.fullRoute].centroid = getCentroid(techData[t.fullRoute].accounts);
});

console.log('=== STARTING STATE ===');
futureTechs.forEach(t => {
  const d = techData[t.fullRoute];
  console.log(`${d.name}: ${d.poolCount} pools, ${d.totalVisits} visits/week`);
  console.log(`  Days: Mon=${d.dayVisits.Monday}, Tue=${d.dayVisits.Tuesday}, Wed=${d.dayVisits.Wednesday}, Thu=${d.dayVisits.Thursday}, Fri=${d.dayVisits.Friday}`);
});
console.log(`\nPools to assign: ${poolsToAssign.length}`);

// Sort pools - assign single-visit pools first (easier), then multi-visit
poolsToAssign.sort((a, b) => a.days.length - b.days.length);

// Assign pools with balanced consideration
poolsToAssign.forEach(pool => {
  const visits = pool.days.filter(d => d !== 'Unknown').length || 1;
  
  let bestTech = null;
  let bestScore = Infinity;
  
  for (const t of futureTechs) {
    const data = techData[t.fullRoute];
    
    // Hard constraints
    if (data.poolCount >= MAX_POOLS) continue;
    if (data.totalVisits + visits > MAX_VISITS_PER_WEEK) continue;
    
    // Scoring
    const dist = data.centroid ? distance(pool.latitude, pool.longitude, data.centroid.lat, data.centroid.lng) : 10;
    const visitPenalty = data.totalVisits * 0.3;  // Prefer techs with fewer visits
    const poolPenalty = data.poolCount * 0.2;    // Slight preference for fewer pools
    
    // Check day balance
    let dayPenalty = 0;
    pool.days.forEach(d => {
      if (data.dayVisits[d] !== undefined && data.dayVisits[d] >= 15) {
        dayPenalty += 5; // Penalize overloaded days
      }
    });
    
    const score = dist + visitPenalty + poolPenalty + dayPenalty;
    
    if (score < bestScore) {
      bestScore = score;
      bestTech = t.fullRoute;
    }
  }
  
  if (bestTech) {
    const data = techData[bestTech];
    pool.days.forEach(d => {
      if (data.dayVisits[d] !== undefined) {
        data.dayVisits[d]++;
        data.totalVisits++;
      }
    });
    data.poolCount++;
    
    const assigned = {
      ...pool,
      originalRoute: pool.route,
      originalTech: pool.routeTech,
      route: bestTech,
      routeTech: data.name,
      reassigned: true
    };
    data.accounts.push(assigned);
    data.centroid = getCentroid(data.accounts);
  } else {
    console.log(`Could not assign: ${pool.accountName} (${visits} visits) - all techs at capacity`);
  }
});

console.log('\n=== FINAL STATE ===');
let totalPools = 0;
futureTechs.forEach(t => {
  const d = techData[t.fullRoute];
  const kept = d.accounts.filter(a => !a.reassigned).length;
  const added = d.accounts.filter(a => a.reassigned).length;
  totalPools += d.poolCount;
  console.log(`${d.name}: ${d.poolCount} pools (${kept} kept + ${added} added), ${d.totalVisits} visits/week`);
  console.log(`  Days: Mon=${d.dayVisits.Monday}, Tue=${d.dayVisits.Tuesday}, Wed=${d.dayVisits.Wednesday}, Thu=${d.dayVisits.Thursday}, Fri=${d.dayVisits.Friday}`);
});

console.log(`\nTotal pools: ${totalPools}`);

// Build final output
const futureCommercialData = [];
futureTechs.forEach(t => {
  techData[t.fullRoute].accounts.forEach(a => futureCommercialData.push(a));
});

fs.writeFileSync(
  path.join(__dirname, 'nextjs_space/public/miami-future-commercial-routes.json'),
  JSON.stringify(futureCommercialData, null, 2)
);
console.log('✓ Saved miami-future-commercial-routes.json');

// Show reassignments
const reassigned = futureCommercialData.filter(a => a.reassigned);
console.log(`\n=== REASSIGNMENTS (${reassigned.length}) ===`);
reassigned.forEach(a => {
  console.log(`${a.accountName}: ${a.originalTech} → ${a.routeTech} (${a.days.join(', ')})`);
});

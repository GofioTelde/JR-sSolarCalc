const fs = require('fs');
const kits = JSON.parse(fs.readFileSync('src/data/kits.json', 'utf8'));

console.log('=== KIT COMPOSITION FACTORS ===');
console.log('');

// Analyze what determines kit composition
const installationTypes = {};
kits.forEach(kit => {
  if (!installationTypes[kit.tipo_instalacion]) {
    installationTypes[kit.tipo_instalacion] = [];
  }
  installationTypes[kit.tipo_instalacion].push(kit);
});

console.log('Installation Types and their characteristics:');
for (const [type, typeKits] of Object.entries(installationTypes)) {
  console.log('');
  console.log('Type: ' + type);
  console.log('Count: ' + typeKits.length + ' kit(s)');
  
  typeKits.forEach(kit => {
    let batteries = kit.componentes.baterias_cantidad || 0;
    console.log('  - ' + kit.nombre + ': ' + batteries + ' batteries, ' + kit.energia_almacenada_kwh + ' kWh');
  });
}

console.log('');
console.log('=== COMPOSITION DETERMINANTS ===');
console.log('');
console.log('1. POWER OUTPUT (Potencia PV):');
kits.forEach(kit => {
  console.log('   ' + kit.potencia_pv_wp + 'W - ' + kit.nombre);
});

console.log('');
console.log('2. BATTERY SCALING PATTERN:');
const batteryKits = kits.filter(k => k.componentes.baterias_cantidad > 0);
const scalingData = {};
batteryKits.forEach(kit => {
  const batCount = kit.componentes.baterias_cantidad;
  const energy = kit.energia_almacenada_kwh;
  if (!scalingData[kit.componentes.bateria_id]) {
    scalingData[kit.componentes.bateria_id] = [];
  }
  scalingData[kit.componentes.bateria_id].push({
    count: batCount,
    energy: energy,
    kit: kit.nombre
  });
});

for (const [battery, data] of Object.entries(scalingData)) {
  console.log('   ' + battery + ':');
  data.forEach(d => {
    console.log('     ' + d.count + 'x = ' + d.energy + ' kWh (' + d.kit + ')');
  });
}

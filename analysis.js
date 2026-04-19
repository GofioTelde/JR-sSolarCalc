const fs = require('fs');
const kits = JSON.parse(fs.readFileSync('src/data/kits.json', 'utf8'));

console.log('=== BATTERY KIT ANALYSIS ===');
console.log('');

// 1. Extract all kits with batteries
const batteryKits = kits.filter(kit => kit.componentes.baterias_cantidad > 0);

console.log('1. KEYS/PROPERTIES DEFINING BATTERY KITS:');
console.log('   - bateria_id: Battery module identifier');
console.log('   - baterias_cantidad: Number of battery modules in the kit');
console.log('   - energia_almacenada_kwh: Total stored energy capacity');
console.log('   - tipo_instalacion: Installation type (red_con_baterias_lv/hv, aislada)');
console.log('   - inversor_hibrido_id or inversor_offgrid_id: Inverter type');
console.log('');

console.log('2. BATTERY KIT SUMMARY:');
batteryKits.forEach(kit => {
  console.log('');
  console.log('   Kit: ' + kit.nombre);
  console.log('   ID: ' + kit.id);
  console.log('   Type: ' + kit.tipo_instalacion);
  console.log('   Batteries: ' + kit.componentes.baterias_cantidad + ' x ' + kit.componentes.bateria_id);
  console.log('   Energy: ' + kit.energia_almacenada_kwh + ' kWh');
  console.log('   Daily Consumption: ' + kit.adecuado_consumo_kwh_dia.join('-') + ' kWh/day');
  console.log('   Price: EUR ' + kit.precio_total);
});

console.log('');
console.log('3. BATTERY MODULES DISTRIBUTION:');
const batteryModules = new Map();
batteryKits.forEach(kit => {
  const key = kit.componentes.bateria_id;
  if (!batteryModules.has(key)) {
    batteryModules.set(key, {total: 0, kits: []});
  }
  batteryModules.get(key).total += kit.componentes.baterias_cantidad;
  batteryModules.get(key).kits.push(kit.nombre + ' (' + kit.componentes.baterias_cantidad + 'x)');
});

for (const [battery, data] of batteryModules) {
  console.log('   ' + battery + ': ' + data.total + ' total modules');
  data.kits.forEach(kit => console.log('     - ' + kit));
}

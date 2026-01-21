// Default inventory data - hardcoded for demonstration
// Admin can edit these, and changes will be saved to localStorage
const DEFAULT_INVENTORY = [
  // CABINET 1
  { itemKey: 'sci_kit_mechanics_001', name: 'Sci Kit Mechanics 001', category: 'equipment', stock: 30, image: 'Cabinets/Cabinet 1/SCIKIT-MECHANICS_ CASE 001.png', cabinet: 'Cabinet 1', description: 'Complete science kit for mechanics experiments set 001.', type: 'Science Kit', use: 'Mechanics experiments' },
  
  // CABINET 2
  { itemKey: 'sci_kit_mechanics_002', name: 'Sci Kit Mechanics 002', category: 'equipment', stock: 30, image: 'Cabinets/Cabinet 2/Sci Kit Mechanics 002.webp', cabinet: 'Cabinet 2', description: 'Complete science kit for mechanics experiments set 002.', type: 'Science Kit', use: 'Mechanics experiments' },
  
  // CABINET 4
  { itemKey: 'sci_kit_mechanics_003', name: 'Sci Kit Mechanics 003', category: 'equipment', stock: 1, image: 'Cabinets/Cabinet 4/SCIKIT- MECHANICS_ CASE 003.png', cabinet: 'Cabinet 4', description: 'Complete science kit for mechanics experiments set 003.', type: 'Science Kit', use: 'Mechanics experiments' },
  
  // CABINET 6
  { itemKey: 'capacitor', name: 'Capacitor', category: 'apparatus', stock: 2, image: 'Cabinets/Cabinet 6/CAPACITOR SET.jpeg', cabinet: 'Cabinet 6', description: 'Capacitor for electrical experiments and charge storage demonstrations.', type: 'Capacitor', use: 'Charge storage' },
  { itemKey: 'blr_transformer', name: 'BLR Develop Transformer', category: 'equipment', stock: 25, image: 'Cabinets/Cabinet 6/BLR DEVELOP TRASNFORMER.jpeg', cabinet: 'Cabinet 6', description: 'BLR Develop Transformer for AC voltage experiments.', type: 'Transformer', use: 'Step-up/step-down voltage' },
  { itemKey: 'blr_light_source', name: 'BLR Develop Light Source', category: 'equipment', stock: 20, image: 'Cabinets/Cabinet 6/BLR DEVELOP LIGHT SOURCE.jpeg', cabinet: 'Cabinet 6', description: 'BLR Develop Light Source for optics and illumination experiments.', type: 'Light Source', use: 'Optics experiments' },
  { itemKey: 'glass_prism', name: 'Glass Prism', category: 'apparatus', stock: 10, image: 'Cabinets/Cabinet 6/GLASS PRISM.jpeg', cabinet: 'Cabinet 6', description: 'Glass prism for light dispersion and refraction experiments.', type: 'Prism', use: 'Light refraction' },
  { itemKey: 'concave_lens', name: 'Concave Lens', category: 'apparatus', stock: 12, image: 'Cabinets/Cabinet 6/Concave lense.jpeg', cabinet: 'Cabinet 6', description: 'Concave lens for diverging light experiments.', type: 'Lens', use: 'Light divergence' },
  { itemKey: 'convex_lens', name: 'Convex Lens', category: 'apparatus', stock: 10, image: 'Cabinets/Cabinet 6/CONVEX LENS.jpeg', cabinet: 'Cabinet 6', description: 'Convex lens for converging light experiments.', type: 'Lens', use: 'Light convergence' },
  { itemKey: 'capacitor_set', name: 'Capacitor Set', category: 'apparatus', stock: 2, image: 'Cabinets/Cabinet 6/CAPACITOR SET.jpeg', cabinet: 'Cabinet 6', description: 'Set of capacitors for various electrical experiments.', type: 'Capacitor Set', use: 'Capacitance experiments' },
  { itemKey: 'fictional_board', name: 'Fictional Board Apparatus', category: 'apparatus', stock: 5, image: 'Cabinets/Cabinet 6/FICTIONAL BOARD APPARATUS.jpeg', cabinet: 'Cabinet 6', description: 'Fictional board apparatus for friction and motion experiments.', type: 'Friction Board', use: 'Friction experiments' },
  { itemKey: 'km_digital_scale', name: 'KM Digital Scale', category: 'tools', stock: 5, image: 'Cabinets/Cabinet 6/KM DIGITAL SCALE.jpeg', cabinet: 'Cabinet 6', description: 'KM Digital Scale for precise mass measurements.', type: 'Digital Scale', use: 'Mass measurement' },
  { itemKey: 'mag_coil', name: 'Magnetizing and Demagnetizing Coil', category: 'apparatus', stock: 11, image: 'Cabinets/Cabinet 6/MAGNETIZING & DEMANDING COIL.jpeg', cabinet: 'Cabinet 6', description: 'Magnetizing and Demagnetizing Coil for magnetic field experiments.', type: 'Coil', use: 'Magnetism experiments' },
  { itemKey: 'motor_model', name: 'Motor Generation Model', category: 'apparatus', stock: 5, image: 'Cabinets/Cabinet 6/MOTOR GENERATION MODEL.jpeg', cabinet: 'Cabinet 6', description: 'Motor generation model for electromagnetic induction experiments.', type: 'Motor Model', use: 'Electromagnetic demos' },
  { itemKey: 'resistor', name: 'Resistor', category: 'apparatus', stock: 4, image: 'Cabinets/Cabinet 6/Resistor.jpeg', cabinet: 'Cabinet 6', description: 'Resistors for circuit building and Ohm\'s law experiments.', type: 'Resistor', use: 'Circuit experiments' },
  { itemKey: 'variable_ps', name: 'Variable Power Supply', category: 'equipment', stock: 1, image: 'Cabinets/Cabinet 6/VARIABLE POWER SUPPLY.jpeg', cabinet: 'Cabinet 6', description: 'Variable Power Supply for adjustable voltage experiments.', type: 'Power Supply', use: 'Variable DC output' },
  { itemKey: 'projectile_motion', name: 'Projectile Motion', category: 'apparatus', stock: 5, image: 'Cabinets/Cabinet 6/Projectile Motion.jpeg', cabinet: 'Cabinet 6', description: 'Projectile motion apparatus for trajectory experiments.', type: 'Projectile Motion', use: 'Kinematics experiments' },
  { itemKey: 'metal_slinky', name: 'Metal Slinky', category: 'tools', stock: 18, image: 'Cabinets/Cabinet 6/METAL SLINKY.jpeg', cabinet: 'Cabinet 6', description: 'Metal slinky for wave motion demonstrations.', type: 'Slinky', use: 'Wave demonstrations' },
  
  // CABINET 7
  { itemKey: 'eveready_1_5v', name: 'Eveready 1.5 Volts', category: 'consumable', stock: 100, image: 'Cabinets/Cabinet 7/Eveready 1.5 Volts.jpg', cabinet: 'Cabinet 7', description: 'Eveready 1.5V dry cell batteries for experiments.', type: 'Battery', use: 'Power source' },
  { itemKey: 'surgical_gloves', name: 'Surgical Gloves', category: 'consumable', stock: 45, image: 'Cabinets/Cabinet 7/SURGICAL GLOVES.jpeg', cabinet: 'Cabinet 7', description: 'Surgical gloves for safe handling during experiments.', type: 'Gloves', use: 'Lab safety' },
  { itemKey: 'eveready_9v', name: 'Eveready 9 Volts', category: 'consumable', stock: 15, image: 'Cabinets/Cabinet 7/Eveready 9 Volts.jpg', cabinet: 'Cabinet 7', description: 'Eveready 9V batteries for higher voltage experiments.', type: 'Battery', use: 'Power source' },
  { itemKey: 'carbon_battery', name: 'Carbon Battery', category: 'consumable', stock: 25, image: 'Cabinets/Cabinet 7/Carbon Battery.jpg', cabinet: 'Cabinet 7', description: 'Carbon batteries for low-power experiments.', type: 'Battery', use: 'Power cells' },
  { itemKey: 'clear_bulb_60w', name: 'Clear Bulb 60 Watts', category: 'equipment', stock: 28, image: 'Cabinets/Cabinet 7/Clear Bulb.jpg', cabinet: 'Cabinet 7', description: 'Clear bulb 60 watts for circuit and lighting experiments.', type: 'Bulb', use: 'Light source' },
  { itemKey: 'compass', name: 'Compass', category: 'tools', stock: 70, image: 'Cabinets/Cabinet 7/Compass.jpg', cabinet: 'Cabinet 7', description: 'Compass for magnetic field and navigation experiments.', type: 'Compass', use: 'Direction finding' },
  { itemKey: 'protractor', name: 'Protractor', category: 'tools', stock: 60, image: 'Cabinets/Cabinet 7/Protractor_.jpg', cabinet: 'Cabinet 7', description: 'Protractor for measuring angles in experiments.', type: 'Protractor', use: 'Angle measurement' },
  { itemKey: 'desk_lamp', name: 'Desk Lamp Heavy Base', category: 'equipment', stock: 29, image: 'Cabinets/Cabinet 7/Desk Lamp.jpg', cabinet: 'Cabinet 7', description: 'Desk lamp with heavy base for stable illumination.', type: 'Lamp', use: 'Illumination' },
  { itemKey: 'variable_ps_boxes', name: 'Variable Power Supply (Boxes)', category: 'equipment', stock: 18, image: 'Cabinets/Cabinet 7/Variable Power Supply.jpg', cabinet: 'Cabinet 7', description: 'Variable Power Supply boxes for classroom distribution.', type: 'Power Supply', use: 'Variable DC output' },
  { itemKey: 'ring_ball', name: 'Ring and Ball Apparatus', category: 'apparatus', stock: 30, image: 'Cabinets/Cabinet 7/Ring and Ball Aparatus_.jpg', cabinet: 'Cabinet 7', description: 'Ring and Ball apparatus for thermal expansion experiments.', type: 'Thermal Apparatus', use: 'Thermal expansion demo' },
  
  // CABINET 8
  { itemKey: 'magnifying_glass', name: 'Magnifying Glass', category: 'tools', stock: 30, image: 'Cabinets/Cabinet 8/Magnifying glass.png', cabinet: 'Cabinet 8', description: 'Hand magnifying glass for close-up observation.', type: 'Magnifier', use: 'Observation' },
  { itemKey: 'prism', name: 'Prism', category: 'apparatus', stock: 8, image: 'Cabinets/Cabinet 8/Prism.png', cabinet: 'Cabinet 8', description: 'Prism for light dispersion experiments.', type: 'Prism', use: 'Light refraction' },
  { itemKey: 'string_ball', name: 'String Ball', category: 'tools', stock: 16, image: 'Cabinets/Cabinet 8/String ball.png', cabinet: 'Cabinet 8', description: 'String ball for various lab setups.', type: 'String', use: 'General lab use' },
  { itemKey: 'lens_tissue', name: 'Cleaning Lens Tissue', category: 'consumable', stock: 56, image: 'Cabinets/Cabinet 8/Cleaning lens tissue.jpeg', cabinet: 'Cabinet 8', description: 'Cleaning lens tissue for optics maintenance.', type: 'Cleaning Supply', use: 'Optics cleaning' },
  { itemKey: 'suspended_spring', name: 'Suspended Spring', category: 'apparatus', stock: 1, image: 'Cabinets/Cabinet 8/Suspended Spring.jpeg', cabinet: 'Cabinet 8', description: 'Suspended spring for Hooke\'s law experiments.', type: 'Spring', use: 'Oscillation experiments' },
  { itemKey: 'florence_flask', name: 'Florence Flask', category: 'tools', stock: 5, image: 'Cabinets/Cabinet 8/Florence flask.png', cabinet: 'Cabinet 8', description: 'Florence flask for heating and chemistry experiments.', type: 'Flask', use: 'Chemistry experiments' },
  { itemKey: 'refraction_tank', name: 'Refraction Tank', category: 'apparatus', stock: 5, image: 'Cabinets/Cabinet 8/Refraction tank.png', cabinet: 'Cabinet 8', description: 'Refraction tank for light path demonstrations.', type: 'Refraction Tank', use: 'Optics experiments' },
  { itemKey: 'prism_extra', name: 'Prism (Extra)', category: 'apparatus', stock: 29, image: 'Cabinets/Cabinet 8/Prism(1).png', cabinet: 'Cabinet 8', description: 'Additional prism set for demonstrations.', type: 'Prism', use: 'Light refraction' },
  { itemKey: 'rheostat', name: 'Rheostat', category: 'apparatus', stock: 1, image: 'Cabinets/Cabinet 8/Rheostat .png', cabinet: 'Cabinet 8', description: 'Rheostat for variable resistance in circuits.', type: 'Rheostat', use: 'Resistance control' },
  { itemKey: 'mirror_set', name: 'Mirror Set', category: 'tools', stock: 26, image: 'Cabinets/Cabinet 8/Mirror set.png', cabinet: 'Cabinet 8', description: 'Mirror set for reflection experiments.', type: 'Mirror Set', use: 'Optics experiments' },
  { itemKey: 'electric_meter', name: 'Electric Meter', category: 'equipment', stock: 1, image: 'Cabinets/Cabinet 8/Electric meter.png', cabinet: 'Cabinet 8', description: 'Electric meter for measuring electrical quantities.', type: 'Electric Meter', use: 'Electrical measurement' },
  { itemKey: 'acrylic_lens_set', name: 'Acrylic Basic Lens Set', category: 'tools', stock: 33, image: 'Cabinets/Cabinet 8/Acrylic Basic Lens Set.png', cabinet: 'Cabinet 8', description: 'Acrylic basic lens set for student experiments.', type: 'Lens Set', use: 'Optics teaching' },
  { itemKey: 'loud_speaker', name: 'Loud Speaker', category: 'equipment', stock: 4, image: 'Cabinets/Cabinet 8/Loud speaker.jpeg', cabinet: 'Cabinet 8', description: 'Loud speaker for acoustics demonstrations.', type: 'Speaker', use: 'Sound experiments' },
  { itemKey: 'protractor_5pcs', name: 'Protractor (5pcs)', category: 'tools', stock: 5, image: 'Cabinets/Cabinet 8/Protractor.png', cabinet: 'Cabinet 8', description: 'Set of 5 protractors for classroom use.', type: 'Protractor Set', use: 'Angle measurement' },
  { itemKey: 'optical_bench', name: 'Set Universal Optical Bench Accessories', category: 'apparatus', stock: 1, image: 'Cabinets/Cabinet 8/Set Universal Optical Bench Accessories.png', cabinet: 'Cabinet 8', description: 'Universal optical bench accessories set.', type: 'Optical Bench', use: 'Optics experiments' },
  
  // CABINET 9
  { itemKey: 'voltmeter', name: 'Voltmeter', category: 'apparatus', stock: 34, image: 'Cabinets/Cabinet 9/VOLTMETER.png', cabinet: 'Cabinet 9', description: 'Voltmeter for measuring electrical potential.', type: 'Voltmeter', use: 'Voltage measurement' },
  { itemKey: 'galvanometer', name: 'Galvanometer', category: 'apparatus', stock: 19, image: 'Cabinets/Cabinet 9/GALVANOMETER.png', cabinet: 'Cabinet 9', description: 'Galvanometer for detecting small currents.', type: 'Galvanometer', use: 'Current detection' },
  { itemKey: 'ammeter', name: 'Ammeter', category: 'apparatus', stock: 37, image: 'Cabinets/Cabinet 9/AMMETER.png', cabinet: 'Cabinet 9', description: 'Ammeter for measuring electric current.', type: 'Ammeter', use: 'Current measurement' },
  { itemKey: 'solar_simulator', name: 'Solar System Simulator', category: 'apparatus', stock: 2, image: 'Cabinets/Cabinet 9/Solar System Silmulator.png', cabinet: 'Cabinet 9', description: 'Solar system simulator for astronomy demonstrations.', type: 'Model', use: 'Astronomy demo' },
  { itemKey: 'electrolyser', name: 'Water Electrolyser', category: 'apparatus', stock: 5, image: 'Cabinets/Cabinet 9/Water electrolyser_.jpg', cabinet: 'Cabinet 9', description: 'Water electrolyser for decomposition experiments.', type: 'Electrolyser', use: 'Electrolysis experiments' },
  { itemKey: 'meter_stick', name: 'Meter Stick', category: 'tools', stock: 25, image: 'Cabinets/Cabinet 9/METER STICK.png', cabinet: 'Cabinet 9', description: 'Meter stick for measuring length.', type: 'Meter Stick', use: 'Length measurement' },
  { itemKey: 'rubber_band_board', name: 'Rubber Band Board', category: 'tools', stock: 24, image: 'Cabinets/Cabinet 9/RUBBERBAND BOARD.png', cabinet: 'Cabinet 9', description: 'Rubber band board for wave and elasticity experiments.', type: 'Rubber Band Board', use: 'Wave experiments' },
  { itemKey: 'inertia_force', name: 'Inertia Force Experiment', category: 'apparatus', stock: 3, image: 'Cabinets/Cabinet 9/INERTIA FORCE EXPERIMENTS_.jpg', cabinet: 'Cabinet 9', description: 'Inertia force experiment apparatus.', type: 'Inertia Apparatus', use: 'Newton\'s laws demo' },
  { itemKey: 'globe', name: 'Globe', category: 'equipment', stock: 1, image: 'Cabinets/Cabinet 9/Globe_.jpg', cabinet: 'Cabinet 9', description: 'Globe for earth and planetary demonstrations.', type: 'Globe', use: 'Geography/Astronomy' },
  { itemKey: 'professor_weather', name: 'Professor Weather', category: 'equipment', stock: 1, image: 'Cabinets/Cabinet 9/PROFESSOR WEATHER_.jpg', cabinet: 'Cabinet 9', description: 'Professor Weather model for weather experiments.', type: 'Weather Model', use: 'Meteorology demo' },
  
  // CABINET 10
  { itemKey: 'spring_scale', name: 'Spring Scale', category: 'tools', stock: 6, image: 'Cabinets/Cabinet 10/Spring Scale.png', cabinet: 'Cabinet 10', description: 'Spring scale for measuring force and weight.', type: 'Spring Scale', use: 'Force measurement' },
  { itemKey: 'weighing_scale', name: 'Weighing Scale', category: 'equipment', stock: 5, image: 'Cabinets/Cabinet 10/Weighing Scale_.png', cabinet: 'Cabinet 10', description: 'Weighing scale for mass measurement.', type: 'Weighing Scale', use: 'Mass measurement' },
  { itemKey: 'free_fall', name: 'CSE Free Fall Set-Up Apparatus', category: 'apparatus', stock: 2, image: 'Cabinets/Cabinet 10/CSE FREE FALL SET APPARATUS.jpg', cabinet: 'Cabinet 10', description: 'CSE Free Fall Set-Up Apparatus for gravity experiments.', type: 'Free Fall Set', use: 'Kinematics experiments' },
  { itemKey: 'inclined_plane', name: 'Inclined Plane Apparatus', category: 'apparatus', stock: 2, image: 'Cabinets/Cabinet 10/Inclined Plan Apparatus_.png', cabinet: 'Cabinet 10', description: 'Inclined plane apparatus for motion experiments.', type: 'Inclined Plane', use: 'Mechanics experiments' },
  { itemKey: 'temp_sensor', name: 'Support Rod and Temperature Sensor', category: 'apparatus', stock: 6, image: 'Cabinets/Cabinet 10/Support Rod.png', cabinet: 'Cabinet 10', description: 'Support rod and temperature sensor for experiments.', type: 'Temperature Sensor', use: 'Temperature measurement' },
  { itemKey: 'ti_calculator', name: 'Texas Instrument Calculators', category: 'equipment', stock: 23, image: 'Cabinets/Cabinet 10/Texas Instrument Calculations.png', cabinet: 'Cabinet 10', description: 'Texas Instrument calculators for classroom use.', type: 'Calculator', use: 'Calculations' },
  { itemKey: 'electronic_kit', name: 'Electronic Kit', category: 'apparatus', stock: 26, image: 'Cabinets/Cabinet 10/Electronic Kit.png', cabinet: 'Cabinet 10', description: 'Electronic kit for circuit building projects.', type: 'Electronic Kit', use: 'Electronics experiments' },
  { itemKey: 'wash_bottle', name: 'Wash Bottle', category: 'tools', stock: 9, image: 'Cabinets/Cabinet 10/Wash Bottle.png', cabinet: 'Cabinet 10', description: 'Wash bottle for rinsing and fluid dispensing.', type: 'Wash Bottle', use: 'Lab rinsing' },
  { itemKey: 'double_beam_balance', name: 'Double Beam Balance', category: 'apparatus', stock: 4, image: 'Cabinets/Cabinet 10/Double Beam Balance_.jpg', cabinet: 'Cabinet 10', description: 'Double beam balance for accurate mass comparison.', type: 'Balance', use: 'Mass measurement' },
  { itemKey: 'triple_beam', name: 'Triple Beam Balance', category: 'apparatus', stock: 5, image: 'Cabinets/Cabinet 10/Triple Beam Balance_.jpg', cabinet: 'Cabinet 10', description: 'Triple beam balance for laboratory mass measurements.', type: 'Balance', use: 'Mass measurement' }
];

// Function to get inventory (merges hardcoded with localStorage changes)
function getInventory() {
  const savedInventory = localStorage.getItem('phyLab_AdminInventory');
  if (savedInventory) {
    try {
      return JSON.parse(savedInventory);
    } catch (e) {
      console.error('Error parsing saved inventory:', e);
    }
  }
  return [...DEFAULT_INVENTORY];
}

// Function to save inventory to localStorage
function saveInventory(inventory) {
  localStorage.setItem('phyLab_AdminInventory', JSON.stringify(inventory));
}

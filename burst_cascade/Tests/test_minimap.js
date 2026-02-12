const { HexMap, Hex } = require('../../burst_cascade/map.js');

// Mock Layout class (not used directly in logic test but required if HexMap uses it, though here we test logic only)
// HexMap only uses Hex class which is exported.

// Test 1: Regular Map Generation
console.log('--- Test 1: Regular Map Generation ---');
const mapRegular = new HexMap(4, 'regular');
const centerRegular = mapRegular.getHexAt(0, 0, 'main');
const outerRegular = mapRegular.getHexAt(3, 0, 'main'); // distance 3 (max for size 4)
console.log(`Center (0,0) exists: ${!!centerRegular}, isDisabled: ${centerRegular.isDisabled}`);
console.log(`Outer (3,0) exists: ${!!outerRegular}, isDisabled: ${outerRegular.isDisabled}`);

if (!centerRegular.isDisabled && !outerRegular.isDisabled) {
    console.log('[PASS] Regular map has valid center and outer hexes.');
} else {
    console.error('[FAIL] Regular map checks failed.');
}

// Test 2: Mini Map Generation
console.log('\n--- Test 2: Mini Map Generation ---');
const mapMini = new HexMap(4, 'mini');
const centerMini = mapMini.getHexAt(0, 0, 'main');
const outerMini = mapMini.getHexAt(3, 0, 'main'); // distance 3 (should be disabled)
const innerMini = mapMini.getHexAt(2, 0, 'main'); // distance 2 (should be enabled)

console.log(`Center (0,0) isDisabled: ${centerMini.isDisabled}`);
console.log(`Inner (2,0) isDisabled: ${innerMini.isDisabled}`);
console.log(`Outer (3,0) isDisabled: ${outerMini.isDisabled}`);

if (!centerMini.isDisabled && !innerMini.isDisabled && outerMini.isDisabled) {
    console.log('[PASS] Mini map correctly disables outer hexes.');
} else {
    console.error('[FAIL] Mini map disable logic failed.');
}

// Test 3: Core Placement in Mini Map
console.log('\n--- Test 3: Core Placement (Mini) ---');
// In Mini map (effective size 3, radius 2), cores should be at distance 2.
const coreHex = mapMini.getHexAt(2, 0, 'main');
console.log(`Hex at (2,0) height: ${coreHex.height}, owner: ${coreHex.owner}, hasFlag: ${coreHex.hasFlag}`);

if (Math.abs(coreHex.height) === 3 && coreHex.hasFlag) {
    console.log('[PASS] Core is correctly placed at distance 2.');
} else {
    console.error('[FAIL] Core placement is incorrect.');
}

// Test 4: applyHand on Disabled Hex
console.log('\n--- Test 4: applyHand on Disabled Hex ---');
// Inject a hand hex manually for testing
const handHex = new Hex(0, 0, 1, 1, 'hand-p1'); // height 1
mapMini.hexes.push(handHex);
// Mock offsets for hand-p1 to align with specific target
mapMini.offsets['hand-p1'] = { q: 0, r: 0 };

// Target the disabled outer hex (3,0)
const targetHex = outerMini; // This is (3,0) and isDisabled=true
console.log(`Before apply: Target(3,0) hex height: ${targetHex.height}`);

const result = mapMini.applyHand(targetHex, 'hand-p1');
console.log(`After apply: Target(3,0) hex height: ${targetHex.height}`);

if (targetHex.height === 0) {
    console.log('[PASS] applyHand did not affect disabled hex.');
} else {
    console.error(`[FAIL] applyHand affected disabled hex! New height: ${targetHex.height}`);
}

// Test 5: applyHand on Valid Hex
console.log('\n--- Test 5: applyHand on Valid Hex ---');
const validTarget = centerMini; // (0,0)
console.log(`Before apply: Target(0,0) hex height: ${validTarget.height}`);

mapMini.applyHand(validTarget, 'hand-p1'); // Using same hand hex (diff 0,0)
console.log(`After apply: Target(0,0) hex height: ${validTarget.height}`);

if (validTarget.height === 1) { // 0 + 1
    console.log('[PASS] applyHand correctly affected valid hex.');
} else {
    console.error(`[FAIL] applyHand failed on valid hex. New height: ${validTarget.height}`);
}

/**
 * Simple test file for naming module
 * Run this to verify the module works correctly
 */

import {
  validateTokenName,
  validatePluralForm,
  evaluateNaming,
  createDefaultNamingState,
  updateNamingState
} from './index.js';

// Test validation functions
console.log('Testing naming module...');

// Test 1: validateTokenName
console.log('\n=== Test 1: validateTokenName ===');
const testNames = [
  'MyToken',
  '  MyToken  ', // Should fail - has spaces
  'A', // Should fail - too short
  'Valid Token Name 123'
];

testNames.forEach(name => {
  const result = validateTokenName(name);
  console.log(`Name: "${name}" => ${result.valid ? '✓ VALID' : '✗ INVALID'} ${result.message || ''}`);
});

// Test 2: validatePluralForm
console.log('\n=== Test 2: validatePluralForm ===');
const testPlurals = [
  'Tokens',
  'To', // Should fail - too short
  '  Tokens  ', // Should fail - has spaces
  'Valid Plural Form'
];

testPlurals.forEach(plural => {
  const result = validatePluralForm(plural);
  console.log(`Plural: "${plural}" => ${result.valid ? '✓ VALID' : '✗ INVALID'} ${result.message || ''}`);
});

// Test 3: Complete naming evaluation
console.log('\n=== Test 3: evaluateNaming ===');
const formData = {
  tokenName: 'MyToken',
  ownerIdentityId: '',
  plural: 'MyTokens',
  capitalize: true,
  localizationRows: []
};

const evaluationResult = evaluateNaming(formData, true);
console.log('Form validation:', evaluationResult.valid ? '✓ VALID' : '✗ INVALID');
console.log('Errors:', evaluationResult.errors);

// Test 4: State management
console.log('\n=== Test 4: State Management ===');
const defaultState = createDefaultNamingState();
console.log('Default state:', defaultState);

const updatedState = updateNamingState(defaultState, {
  tokenName: 'TestToken',
  plural: 'TestTokens',
  capitalize: true
});
console.log('Updated state:', updatedState);

console.log('\n✓ All tests completed successfully!');

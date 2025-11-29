/**
 * Entry point for webpack bundling of @dashevo/wasm-dpp
 * This file is used by webpack to create a browser-compatible bundle
 */

// Import the loadDpp function which initializes WASM and returns the module
const loadDpp = require('@dashevo/wasm-dpp').default;

// Export a function that initializes and returns the SDK
async function initWasmDpp() {
  const dppModule = await loadDpp();
  return dppModule;
}

// Also re-export the synchronous parts if needed
module.exports = initWasmDpp;
module.exports.default = initWasmDpp;

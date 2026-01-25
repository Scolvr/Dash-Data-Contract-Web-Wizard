/**
 * Dash Evo SDK Loader
 * Loads @dashevo/wasm-dpp v2.1.3+ which supports DataContract V1 (tokens)
 *
 * IMPORTANT: Buffer polyfill must be loaded BEFORE importing wasm-dpp
 * because the module uses Buffer.from() at module load time.
 */

let sdkModule = null;
let isInitialized = false;
let initPromise = null;

/**
 * Initialize the Dash Evo SDK
 * @returns {Promise<object>} The initialized SDK module
 */
export async function initializeEvoSDK() {
  if (isInitialized && sdkModule) {
    return sdkModule;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log('[Evo SDK] Setting up Buffer polyfill...');

      // Step 1: Load Buffer polyfill FIRST and set it globally
      const { Buffer } = await import('buffer');
      if (typeof globalThis.Buffer === 'undefined') {
        globalThis.Buffer = Buffer;
      }
      if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
        window.Buffer = Buffer;
      }
      console.log('[Evo SDK] Buffer polyfill ready');

      // Step 2: Now dynamically import wasm-dpp (Buffer must be global first!)
      console.log('[Evo SDK] Loading @dashevo/wasm-dpp v2.1.3...');
      const wasmDppModule = await import('@dashevo/wasm-dpp');

      // Step 3: Call loadDpp() to initialize the WASM
      const loadDpp = wasmDppModule.default;
      sdkModule = await loadDpp();

      console.log('[Evo SDK] Module loaded successfully');
      console.log('[Evo SDK] Available exports:', Object.keys(sdkModule).filter(k => !k.startsWith('_')).slice(0, 20));
      console.log('[Evo SDK] DataContract available?', !!sdkModule.DataContract);

      if (sdkModule.DataContract) {
        console.log('[Evo SDK] DataContract methods:', Object.getOwnPropertyNames(sdkModule.DataContract).filter(k => !k.startsWith('_')));
        if (sdkModule.DataContract.prototype) {
          console.log('[Evo SDK] DataContract.prototype methods:', Object.getOwnPropertyNames(sdkModule.DataContract.prototype).filter(k => !k.startsWith('_')));
        }
      }

      // Set global for compatibility with existing code
      window.EvoSDK = sdkModule;
      window.__evo_sdk_ready = true;

      isInitialized = true;

      // Dispatch ready event
      window.dispatchEvent(new CustomEvent('evo:sdk-ready'));
      console.info('[Evo SDK] Dash Evo SDK v2.1.3 initialized successfully (DataContract V1 with tokens supported)');

      return sdkModule;
    } catch (error) {
      // SDK is optional - validation still works without it
      console.info('[Evo SDK] SDK not available (optional) - using local validation instead');
      return null;
    }
  })();

  return initPromise;
}

/**
 * Get the SDK module (must be initialized first)
 * @returns {object|null} The SDK module or null if not initialized
 */
export function getEvoSDK() {
  return sdkModule;
}

/**
 * Check if SDK is ready
 * @returns {boolean}
 */
export function isSDKReady() {
  return isInitialized && sdkModule !== null;
}

// Export the module for direct access
export { sdkModule };

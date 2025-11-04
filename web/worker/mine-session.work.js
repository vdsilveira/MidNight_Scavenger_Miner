'use strict';
// Web Worker for mining session with pause/resume support
// Declare ashmaize types and functions that will be loaded dynamically
let ashmaizeModule = null;
let wasmInitialized = false;
let ashmaizeRom = null;
let vm = null;
let cache = null;
let running = false;
let paused = false;
let attempts = 0;
let lastReport = Date.now();
let hashRate = 0;
let _puzzleDifficulty = 0;
let _noPreMine = '';
let _noPreMineHour = '';
let _difficultyHex = '';
let _challengeId = '';
let _address = '';
let _latestSubmission = '';
let _hashAlgorithm = 'ashmaize';
// Centralized ashmaize initialization
async function ensureAshmaizeInitialized(noPreMine) {
  if (!ashmaizeModule && !wasmInitialized) {
    try {
      const loadedModule = await loadAshmaizeModule();
      if (loadedModule) {
        ashmaizeModule = loadedModule;
        wasmInitialized = true;
        ashmaizeRom = instantiateRom(ashmaizeModule, noPreMine);
      } else {
        console.warn('Failed to load ashmaize module');
      }
    } catch (error) {
      console.error('Error initializing ashmaize:', error);
    }
  }
}
// Centralized mining start logic
async function startMining(params) {
  running = true;
  paused = false;
  attempts = params.attempts ?? 0;
  lastReport = Date.now();
  await ensureAshmaizeInitialized(params.no_pre_mine);
  await resetPuzzle(
    params.no_pre_mine,
    params.no_pre_mine_hour,
    params.difficulty,
    params.challenge_id,
    params.address,
    params.latest_submission,
    params.hashAlgorithm // Pass hashAlgorithm to resetPuzzle
  );
  mineLoop();
}
// Function to dynamically load the ashmaize module for the web build
async function loadAshmaizeModule() {
  try {
    // Dynamically import the glue JS file from /public/ashmaize/
    // @ts-expect-error: This import is resolved at runtime from /public
    const mod = await import('/ashmaize/ashmaize_web.js').catch(error => {
      console.warn('Failed to import ashmaize module:', error);
      return null;
    });
    if (!mod || typeof mod.default !== 'function') {
      console.warn('Ashmaize module missing default export for initialization');
      return null;
    }
    // Initialize the Wasm module by calling the default export with the Wasm file path
    await mod.default({ module_or_path: '/ashmaize/ashmaize_web_bg.wasm' });
    return mod;
  } catch (error) {
    console.error('Error in loadAshmaizeModule:', error);
    return null;
  }
}
function instantiateRom(loadedModule, no_pre_mine) {
  const { RomBuilder } = loadedModule;
  const MB = 1024 * 1024;
  const builder = new RomBuilder();
  builder.key(new TextEncoder().encode(no_pre_mine));
  builder.size(1024 * MB); // 1024MB (or 1GB) size
  builder.gen_two_steps(16 * MB, 4); // 16MB pre-size, 4 mixing numbers
  return builder.build();
}
function getHexHash(rom, preimage) {
  if (!rom) throw new Error('Ashmaize ROM not initialized');
  const salt = new TextEncoder().encode(preimage);
  const nbLoops = 8; // 8 loops
  const nbInstrs = 256; // 256 instructions
  const hash = rom.hash(salt, nbLoops, nbInstrs);
  let hexString = '';
  for (let i = 0; i < hash.length; i++) {
    const byte = hash[i];
    hexString += byte.toString(16).padStart(2, '0');
  }
  return hexString;
}
function hexToBytes(hex) {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
async function resetPuzzle(
  noPreMine,
  noPreMineHour,
  difficultyHex,
  challengeId,
  address,
  latestSubmission,
  hashAlgorithm = 'ashmaize'
) {
  _noPreMine = noPreMine;
  _noPreMineHour = noPreMineHour;
  _difficultyHex = difficultyHex;
  _challengeId = challengeId;
  _address = address;
  _latestSubmission = latestSubmission;
  _puzzleDifficulty = parseInt(difficultyHex, 16);
  _hashAlgorithm = hashAlgorithm;
  if (_hashAlgorithm === 'randomx') {
    // @ts-expect-error: This import is resolved at runtime from /public
    const { randomx_init_cache, randomx_create_vm } = await import('/randomx/index.js');
    const keyBytes = hexToBytes(noPreMine);
    cache = randomx_init_cache(keyBytes);
    vm = randomx_create_vm(cache);
  } else {
    cache = null;
    vm = null;
  }
}
async function mineLoop() {
  if (!running || paused) return;
  const target = _puzzleDifficulty;
  const start = Date.now();
  let localAttempts = 0;
  let hashHex = '';
  let found = false;
  let foundNonce = '';
  while (Date.now() - start < 200) {
    let tryNonce = Math.floor(Math.random() * 1e16).toString(16);
    // Pad nonce to 16 characters with leading zeroes
    tryNonce = tryNonce.padStart(16, '0');
    const preimage = [
      tryNonce,
      _address,
      _challengeId,
      _difficultyHex,
      _noPreMine,
      _latestSubmission,
      _noPreMineHour,
    ].join('');
    if (_hashAlgorithm === 'randomx' && vm && typeof vm.calculate_hex_hash === 'function') {
      hashHex = vm.calculate_hex_hash(preimage);
    } else if (ashmaizeModule && ashmaizeRom) {
      hashHex = getHexHash(ashmaizeRom, preimage);
    }
    attempts++;
    localAttempts++;
    // Compare only the first 8 hex digits (32 bits) of the hash to the 4-byte (8 hex digit) difficulty target.
    // This matches the "4 bytes zero extended hex value" format required by the production challenge API.
    const hashPrefix = hashHex.slice(0, 8);
    const hashValue = parseInt(hashPrefix, 16);
    if ((hashValue | target) === target) {
      found = true;
      foundNonce = tryNonce;
      break;
    }
  }
  const now = Date.now();
  const elapsed = (now - lastReport) / 1000;
  if (elapsed > 0) {
    hashRate = localAttempts / elapsed;
    postMessage({ type: 'PROGRESS', attempts, rate: hashRate });
    lastReport = now;
  }
  if (found) {
    const duration = (Date.now() - lastReport) / 1000;
    postMessage({
      type: 'SOLUTION_FOUND',
      foundNonce,
      hash: hashHex,
      attempts,
      duration,
    });
    running = false;
    return;
  }
  setTimeout(mineLoop, 0);
}
onmessage = async function (e) {
  const msg = e.data;
  if (msg.type === 'START_SOLVING') {
    try {
      // Default to ashmaize if not provided
      if (!msg.hashAlgorithm) msg.hashAlgorithm = 'ashmaize';
      await startMining(msg);
    } catch (error) {
      postMessage({ type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
    }
  } else if (msg.type === 'PAUSE') {
    paused = true;
  } else if (msg.type === 'RESUME') {
    paused = false;
    if (!running) running = true;
    try {
      await startMining(msg);
    } catch (error) {
      postMessage({ type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
    }
  }
};


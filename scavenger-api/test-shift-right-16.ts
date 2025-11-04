import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import * as fs from 'fs';

async function testShiftRight16() {
    const wasmService = new AshmaizeWasmService();
    await wasmService.initialize();

    // Test data
    const key = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    const value = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    
    // Generate initial hash
    const initialHash = await wasmService.hash(key, value);
    console.log('Initial hash:', initialHash.toString('hex'));

    // Create a new Buffer to hold the shifted hash
    const shiftedHash = Buffer.alloc(64); // 64 bytes = 512 bits
    
    // Shift right by 16 bits (2 bytes)
    for (let i = 0; i < initialHash.length - 2; i++) {
        // For each byte, we need to combine parts of two consecutive bytes
        const byte1 = initialHash[i] << 6;     // Take 6 bits from current byte
        const byte2 = initialHash[i + 2] >> 2; // Take 2 bits from byte 2 positions ahead
        shiftedHash[i] = byte1 | byte2;
    }

    console.log('Shifted hash:', shiftedHash.toString('hex'));

    // Now validate both hashes
    try {
        console.log('Validating initial hash...');
        const initialValid = await wasmService.validateHash(key, value, initialHash);
        console.log('Initial hash valid:', initialValid);

        console.log('Validating shifted hash...');
        const shiftedValid = await wasmService.validateHash(key, value, shiftedHash);
        console.log('Shifted hash valid:', shiftedValid);
    } catch (error) {
        console.error('Error during validation:', error);
    }
}

testShiftRight16().catch(console.error);
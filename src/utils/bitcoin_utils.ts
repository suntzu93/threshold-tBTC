import {log, BigInt, Bytes} from '@graphprotocol/graph-ts'

// Base on this source https://github.com/clover-network/clover-spv-pegout/blob/9759f391be9fc0441058cf5cc3e107010e5846de/js/src/BTCUtils.js

export function extractOutputAtIndex(vout: Uint8Array, index: i32): Uint8Array {
    const data = parseVarInt(vout);

    if (index >= data.number.toI32()) {
        log.error("Vin read overrun", [])
    }

    let len = 0;
    let offset = BigInt.fromI32(1).plus(data.dataLength);

    for (let i = 0; i <= index; i += 1) {
        const remaining = safeSlice(vout, offset.toI32(), vout.length);
        len = determineOutputLength(remaining);
        if (i !== index) {
            offset = offset.plus(BigInt.fromI32(len));
        }
    }
    return safeSlice(vout, offset.toI32(), offset.plus(BigInt.fromI32(len)).toI32());
}

export function extractValue(output: Uint8Array): BigInt {
    const leValue = extractValueLE(output);
    const beValue = reverseEndianness(leValue);
    return bytesToUint(beValue);
}

function determineOutputLength(output: Uint8Array): i32 {
    if (output.length < 9) {
        throw new RangeError("Read overrun");
    }

    const data = parseVarInt(safeSlice(output, 8));

    // 8 byte value, 1 byte for len itself
    return 8 + 1 + data.dataLength.toU32() + data.number.toU32();
}

class VarIntTuple {
    dataLength: BigInt;
    number: BigInt;
}

export function parseVarInt(b: Uint8Array): VarIntTuple {
    const dataLength = BigInt.fromI32(determineVarIntDataLength(b[0]));

    if (dataLength.toI32() === 0) {
        const tuple: VarIntTuple = {
            dataLength: dataLength,
            number: BigInt.fromI32(b[0])
        };
        return tuple;
    }

    if (b.length < 1 + dataLength.toI32()) {
        log.error("Read overrun during VarInt parsing", [])

    }

    const number = bytesToUint(reverseEndianness(safeSlice(b, 1, 1 + dataLength.toI32())));

    const tuple: VarIntTuple = {
        dataLength: dataLength,
        number: number
    };
    return tuple;
}

function bytesToUint(uint8Arr: Uint8Array): BigInt {
    let total = BigInt.fromI32(0);
    for (let i = 0; i < uint8Arr.length; i += 1) {
        total = total.plus(BigInt.fromI32(uint8Arr[i]).leftShift(<u8>BigInt.fromI32(uint8Arr.length - i - 1).times(BigInt.fromI32(8)).toU32()));
    }
    return total;
}

function safeSlice(buf: Uint8Array, first: i32 = 0, last: i32 = buf.length): Uint8Array {
    let start: i32;
    let end: i32;

    if (first == 0) {
        start = 0;
    }
    if (last == buf.length) {
        end = buf.length;
    }

    if (first > i64.MAX_VALUE) {
        log.error("BigInt argument out of safe number range", [])
    }
    if (last > i64.MAX_VALUE) {
        log.error("BigInt argument out of safe number range", [])
    }

    start = first;
    end = last;

    if (end > buf.length) {
        log.error("Tried to slice past end of array", [])
    }
    if (start < 0 || end < 0) {
        log.error("Slice must not use negative indexes", [])
    }
    if (start >= end) {
        log.error("Slice must not have 0 length", [])
    }
    return buf.slice(start, end);
}

function reverseEndianness(uint8Arr: Uint8Array): Uint8Array {
    const newArr = safeSlice(uint8Arr);
    return newArr.reverse();
}

function determineVarIntDataLength(flag: u8): u32 {
    if (flag === 0xff) {
        return 8; // one-byte flag, 8 bytes data
    }
    if (flag === 0xfe) {
        return 4; // one-byte flag, 4 bytes data
    }
    if (flag === 0xfd) {
        return 2; // one-byte flag, 2 bytes data
    }

    return 0; // flag is data
}


function extractValueLE(output: Uint8Array): Uint8Array {
    return safeSlice(output, 0, 8);
}


function toUint16LE(bytes: Bytes, index: i32): u16 {
    return <u16>(bytes[index] | bytes[index + 1] << 8);
}

function toUint32LE(bytes: Bytes, index: i32): u32 {
    return <u32>(
        bytes[index] |
        bytes[index + 1] << 8 |
        bytes[index + 2] << 16 |
        bytes[index + 3] << 24
    );
}

function toUint64LE(bytes: Bytes, index: i32): u64 {
    return <u64>(
        bytes[index] |
        bytes[index + 1] << 8 |
        bytes[index + 2] << 16 |
        bytes[index + 3] << 24 |
        bytes[index + 4] << 32 |
        bytes[index + 5] << 40 |
        bytes[index + 6] << 48 |
        bytes[index + 7] << 56
    );
}

export function extractUint64LE(bytes: Uint8Array, offset: i32): u64 {
    const b0 = bytes[offset];
    const b1 = bytes[offset + 1];
    const b2 = bytes[offset + 2];
    const b3 = bytes[offset + 3];
    const b4 = bytes[offset + 4];
    const b5 = bytes[offset + 5];
    const b6 = bytes[offset + 6];
    const b7 = bytes[offset + 7];

    return u64(b0) | (u64(b1) << 8) | (u64(b2) << 16) | (u64(b3) << 24) |
        (u64(b4) << 32) | (u64(b5) << 40) | (u64(b6) << 48) | (u64(b7) << 56);
}


export function determineOutputLengthAt(
    outputVector: Bytes,
    outputStartingIndex: i32
): i32 {
    let prefix = outputVector[outputStartingIndex];
    let size = 1;
    if (prefix < 0xfd) {
        size = 1;
    } else if (prefix == 0xfd) {
        size = 3;
    } else if (prefix == 0xfe) {
        size = 5;
    } else {
        size = 9;
    }

    // const prefix = compactSize.value;
    let length: i64;

    if (prefix < 0xFD) {
        length = <i64>prefix;
    } else if (prefix == 0xFD) {
        length = toUint16LE(outputVector, outputStartingIndex + size);
        size += 2;
    } else if (prefix == 0xFE) {
        length = toUint32LE(outputVector, outputStartingIndex + size);
        size += 4;
    } else {
        length = toUint64LE(outputVector, outputStartingIndex + size);
        size += 8;
    }

    return size + <i32>length;
}


// Calculate the keccak256 for two possible wallet's P2PKH or P2WPKH
// scripts that can be used to lock the change. This is done upfront to
// save on gas. Both scripts have a strict format defined by Bitcoin.
//
// The P2PKH script has the byte format: <0x1976a914> <20-byte PKH> <0x88ac>.
// According to https://en.bitcoin.it/wiki/Script#Opcodes this translates to:
// - 0x19: Byte length of the entire script
// - 0x76: OP_DUP
// - 0xa9: OP_HASH160
// - 0x14: Byte length of the public key hash
// - 0x88: OP_EQUALVERIFY
// - 0xac: OP_CHECKSIG
// which matches the P2PKH structure as per:
// https://en.bitcoin.it/wiki/Transaction#Pay-to-PubkeyHash
export function makeP2PKHScript(pubKeyHash: Bytes): Uint8Array {
    const P2PKHScriptMask = Bytes.fromHexString("1976a914000000000000000000000000000000000000000088ac");

    const shiftedPubKeyHash = pubKeyHash.subarray(0, 12);
    const script = new Uint8Array(shiftedPubKeyHash.length + P2PKHScriptMask.length);

    script.set(shiftedPubKeyHash);
    script.set(P2PKHScriptMask, shiftedPubKeyHash.length);

    return script;
}

// The P2WPKH script has the byte format: <0x160014> <20-byte PKH>.
// According to https://en.bitcoin.it/wiki/Script#Opcodes this translates to:
// - 0x16: Byte length of the entire script
// - 0x00: OP_0
// - 0x14: Byte length of the public key hash
// which matches the P2WPKH structure as per:
// https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#P2WPKH
export function makeP2WPKHScript(pubKeyHash: Bytes): Uint8Array {
    const P2WPKHScriptMask = Bytes.fromHexString("1600140000000000000000000000000000000000000000");

    const pubKeyHashShifted = new Uint8Array(21);
    pubKeyHashShifted.set(pubKeyHash, 1);

    const result = new Uint8Array(23);
    result.set(pubKeyHashShifted.subarray(1, 13), 0);
    result.set(P2WPKHScriptMask, 13);

    return result;
}

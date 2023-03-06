import {log, BigInt} from '@graphprotocol/graph-ts'

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

function parseVarInt(b: Uint8Array): VarIntTuple {
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
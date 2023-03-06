import {ethereum, BigInt, ByteArray, Bytes, Entity, Value} from '@graphprotocol/graph-ts'
import {crypto} from '@graphprotocol/graph-ts'
import {final, init, update} from "./crypto";

/** Calculates deposit key the same way as the Bridge contract.
 The deposit key is computed as
 `keccak256(fundingTxHash | fundingOutputIndex)`.*/
export function calculateDepositKey(
    fundingTxHash: Uint8Array,
    fundingOutputIndex: i32
): ByteArray {
    let data = new Uint8Array(fundingTxHash.length + 4);
    data.set(fundingTxHash, 0);
    let indexData = new Uint8Array(4);
    indexData[0] = (fundingOutputIndex >> 24) & 0xff;
    indexData[1] = (fundingOutputIndex >> 16) & 0xff;
    indexData[2] = (fundingOutputIndex >> 8) & 0xff;
    indexData[3] = fundingOutputIndex & 0xff;
    data.set(indexData, fundingTxHash.length)
    let byteArray = new ByteArray(data.length)
    for (let i = 0; i < data.length; i++) {
        byteArray[i] = data[i];
    }
    let hashArray = crypto.keccak256(byteArray);
    return hashArray;
}

/**
 * keccak256(keccak256(redeemerOutputScript) | walletPubKeyHash)
 * */
export function calculateRedemptionKey(redeemerOutputScript: ByteArray, walletPublicKeyHash: ByteArray): ByteArray {
    let scriptHashArray = crypto.keccak256(redeemerOutputScript);
    let data = new Uint8Array(scriptHashArray.length + walletPublicKeyHash.length);
    data.set(scriptHashArray, 0);
    data.set(walletPublicKeyHash, scriptHashArray.length);

    let hashArray = crypto.keccak256(Bytes.fromUint8Array(data));
    return hashArray;
}

export function keccak256TwoString(first: string, second: string): string {
    let hashData = Bytes.fromHexString(first).concat(Bytes.fromHexString(second));
    return crypto.keccak256(hashData).toHexString();
}

export function bytesToUint8Array(bytes: Bytes): Uint8Array {
    let uint8Array = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) {
        uint8Array[i] = bytes[i]
    }
    return uint8Array;
}

/**
 * Convert hex to Bigint. Start from the last character and multiply value with the 16s power.
 */
export function hexToBigint(hex: string): BigInt {
    if (hex.length >= 2 && hex.charAt(0) == '0' && hex.charAt(1) == 'x') {
        hex = hex.substr(2);
    }

    let bigint = BigInt.fromI32(0);
    let power = BigInt.fromI32(1);
    for (let i = hex.length - 1; i >= 0; i--) {
        let char = hex.charCodeAt(i);
        let value = 0;
        if (char >= 48 && char <= 57) {
            value = char - 48;
        } else if (char >= 65 && char <= 70) {
            value = char - 55;
        }
        bigint = bigint.plus(BigInt.fromI32(value).times(power));
        power = power.times(BigInt.fromI32(16));
    }
    return bigint;
}

export function toHexString(bin: Uint8Array): string {
    let bin_len = bin.length;
    let hex = "";
    for (let i = 0; i < bin_len; i++) {
        let bin_i = bin[i] as u32;
        let c = bin_i & 0xf;
        let b = bin_i >> 4;
        let x: u32 = ((87 + c + (((c - 10) >> 8) & ~38)) << 8) |
            (87 + b + (((b - 10) >> 8) & ~38));
        hex += String.fromCharCode(x as u8);
        x >>= 8;
        hex += String.fromCharCode(x as u8);
    }
    return hex;
}

export function hash(data: Uint8Array): Uint8Array {
    const output = new Uint8Array(32);
    init();
    update(changetype<usize>(data.buffer), data.length);
    final(changetype<usize>(output.buffer));
    return output;
}

/** creates a string composed of '0's given a length */
export function createZeroString(length: i32): string {
    let zeroString = '';
    for (let i = 0; i < length; i++) {
        zeroString += '0';
    }
    return zeroString;
}

export function convertDepositKeyToHex(depositKey: BigInt): string {
    let depositKeyHex = depositKey.toHexString();
    //Some cases with length is 65 then convert to bytes will crash
    //exp : 0x86cc94dc9f76f03160ab4514842b9345b5d063a5b4023fed4efc9a871b06044
    if (depositKeyHex.length < 66) {
        let missedNumber = 66 - depositKeyHex.length;
        let replacement = '0x' + createZeroString(missedNumber);
        depositKeyHex = depositKeyHex.replace('0x', replacement)
    }
    return depositKeyHex
}

export function getIDFromEvent(event: ethereum.Event): string {
    return event.transaction.hash.toHex() + "-" + event.logIndex.toString()
}

export function getIDFromCall(call: ethereum.Call): string {
    return call.transaction.hash.toHex() + "-" + call.transaction.index.toString();
}

export function getBeaconGroupId(pubKey: Bytes): string {
    // Cut off the group pub key, we don't want the ids to to be unreasonably long.
    return pubKey.toHexString().slice(0, 62)
}
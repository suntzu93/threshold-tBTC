import { BigDecimal, BigInt, ByteArray, Bytes } from '@graphprotocol/graph-ts'
import { crypto } from '@graphprotocol/graph-ts'

// Calculates deposit key the same way as the Bridge contract.
// The deposit key is computed as
// `keccak256(fundingTxHash | fundingOutputIndex)`.

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
    // let hex = "0x";
    // for (let i = 0; i < hashArray.length; i++) {
    //     hex += hashArray[i].toString(16).padStart(2, "0");
    // }
    return hashArray;
}

// keccak256(keccak256(redeemerOutputScript) | walletPubKeyHash)
export function calculateRedemptionKey(redeemerOutputScript: ByteArray, walletPublicKeyHash: ByteArray): ByteArray {
  let scriptHashArray = crypto.keccak256(redeemerOutputScript);
  let data = new Uint8Array(scriptHashArray.length + walletPublicKeyHash.length);
  data.set(scriptHashArray, 0);
  data.set(walletPublicKeyHash, scriptHashArray.length);

  let hashArray = crypto.keccak256(Bytes.fromUint8Array(data));
  // let hex = "0x";
  // for (let i = 0; i < hashArray.length; i++) {
  //     hex += hashArray[i].toString(16).padStart(2, "0");
  // }
  return hashArray;
}

export function bytesToUint8Array(bytes: Bytes): Uint8Array {
    let uint8Array = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) {
        uint8Array[i] = bytes[i]
    }
    return uint8Array;
}

export function hexToBytes(hex: string): Uint8Array {
  let bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16) as u32;
  }
  return bytes;
}

export function hexToBigint(hex: string): BigInt {
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


  
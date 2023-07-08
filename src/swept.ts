import {ethereum, BigInt, ByteArray, Bytes, Entity, Value} from '@graphprotocol/graph-ts'
import {log} from '@graphprotocol/graph-ts'
import * as BitcoinUtils from "./utils/bitcoin_utils";
import * as Utils from "./utils/utils";
import {SubmitDepositSweepProofCall} from "../generated/Bridge/Bridge";
import {
    getOrCreateDeposit, getOrCreateTransaction, getOrCreateUser, getStatus
} from "./utils/helper"
import * as Const from "./utils/constants"
import {getIDFromCall} from "./utils/utils";

class DepositSweepTxInputInfo {
    outpointTxHash: Uint8Array;
    outpointIndex: i32;
    inputLength: BigInt;
}

// function extractPubKeyHash(output: Uint8Array): Uint8Array {
//     let pubKeyHash = new Uint8Array(20);
//     let pubKeyHashBytes = extractHash(output);
//     log.warning("pubKeyHashBytes length = {}", [pubKeyHashBytes.length.toString()])
//     if (pubKeyHashBytes.length == 20) {
//         let pubKeyHashView = new DataView(pubKeyHash.buffer);
//         let pubKeyHashBytesView = new DataView(pubKeyHashBytes.buffer);
//
//         for (let i = 0; i < 20; i++) {
//             pubKeyHashView.setUint8(i, pubKeyHashBytesView.getUint8(i));
//         }
//
//         let scriptLen = output.length - 8;
//         log.warning("scriptLen length = {}", [scriptLen.toString()])
//
//
//         if (scriptLen == 23 || scriptLen == 26) {
//             if (scriptLen == 26) {
//                 let script = new Uint8Array(26);
//
//                 for (let i = 0; i < 26; i++) {
//                     script[i] = output[i + 8];
//                 }
//
//                 // let expectedScript = makeP2PKHScript(pubKeyHash);
//                 // if (script != expectedScript) {
//                 //     return new Uint8Array(1);
//                 // }
//
//                 return script;
//             } else if (scriptLen == 23) {
//                 let script = new Uint8Array(23);
//
//                 for (let i = 0; i < 23; i++) {
//                     script[i] = output[i + 8];
//                 }
//
//                 // let expectedScript = makeP2WPKHScript(pubKeyHash);
//                 //
//                 // log.warning("script = {}, expectedScript = {}", [Bytes.fromUint8Array(script).toHexString(),
//                 //     Bytes.fromUint8Array(expectedScript).toHexString()])
//                 //
//                 //
//                 // if (script != expectedScript) {
//                 //     return new Uint8Array(1);
//                 // }
//
//                 return script;
//             }
//         }
//     }
//     return new Uint8Array(1);
// }

function isBytes32Zero(input: Bytes): bool {
    for (let i = 0; i < input.length; i++) {
        if (input[i] != 0) {
            return false;
        }
    }
    return true;
}

/**
 * Changes the endianness of a int32
 */
function reverseUint32(b: i32): i32 {
    let v: i32 = b;

    v = (v >> 8) & i32(0x00FF00FF) | ((v & i32(0x00FF00FF)) << 8);
    v = (v >> 16) | (v << 16);

    return v;
}

function parseDepositSweepTxInputAt(
    inputVector: Uint8Array,
    inputStartingIndex: BigInt
): DepositSweepTxInputInfo {

    let outpointTxHash: Uint8Array = BitcoinUtils.extractInputTxIdLEAt(inputVector, inputStartingIndex);
    let outpointIndex: i32 = reverseUint32(BitcoinUtils.bytesToUint(BitcoinUtils.extractTxIndexLEAt(inputVector, inputStartingIndex)));
    let inputLength: BigInt = BitcoinUtils.determineInputLengthAt(inputVector, inputStartingIndex);

    return {
        outpointTxHash,
        outpointIndex,
        inputLength
    };
}

export function processDepositSweepTxInputs(
    call: SubmitDepositSweepProofCall
): void {
    const parseSweepTxInputVector = BitcoinUtils.parseVarInt(Utils.bytesToUint8Array(call.inputs.sweepTx.inputVector));

    const inputsCompactSizeUintLength = parseSweepTxInputVector.dataLength;
    const inputsCount = parseSweepTxInputVector.number;

    let inputStartingIndex = inputsCompactSizeUintLength.plus(BigInt.fromI32(1));

    let status = getStatus();
    let lastMintedInfo = status.lastMintedInfo

    for (let i: i32 = 0; i < inputsCount.toI32(); i++) {
        let parseDepositSweepTxInput = parseDepositSweepTxInputAt(call.inputs.sweepTx.inputVector, inputStartingIndex);

        const depositKey = Bytes.fromByteArray(Utils.calculateDepositKey(parseDepositSweepTxInput.outpointTxHash, parseDepositSweepTxInput.outpointIndex));
        let deposit = getOrCreateDeposit(depositKey);
        if (deposit.depositTimestamp!.notEqual(Const.ZERO_BI)) {
            deposit.sweptAt = call.block.timestamp
            let transaction = getOrCreateTransaction(getIDFromCall(call))
            transaction.txHash = call.transaction.hash
            transaction.timestamp = call.block.timestamp
            transaction.from = call.transaction.from
            transaction.to = call.transaction.to
            transaction.amount = Const.ZERO_BI
            transaction.description = "Swept by wallet"
            transaction.save()

            let actualAmountReceived: BigInt = Const.ZERO_BI;
            let user = getOrCreateUser(deposit.user);
            for (let j: i32 = 0; j < lastMintedInfo.length; j++) {
                let mintedData = lastMintedInfo[j].split("-");
                let depositor = mintedData[0];
                let amount = mintedData[1];

                if (depositor.toLowerCase() == user.id.toHexString().toLowerCase()) {
                    actualAmountReceived = BigInt.fromString(amount);
                    break
                }
            }

            let transactions = deposit.transactions
            transactions.push(transaction.id)
            deposit.transactions = transactions
            deposit.updateTimestamp = call.block.timestamp
            deposit.status = "SWEPT"

            if (deposit.actualAmountReceived.equals(Const.ZERO_BI)){
                deposit.actualAmountReceived = actualAmountReceived
            }
            deposit.save()

        }

        if (inputStartingIndex.plus(parseDepositSweepTxInput.inputLength).gt(BigInt.fromI32(call.inputs.sweepTx.inputVector.length))) {
            break;
        }
        inputStartingIndex = inputStartingIndex.plus(parseDepositSweepTxInput.inputLength);
    }
}
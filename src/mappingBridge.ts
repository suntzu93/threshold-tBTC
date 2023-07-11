import {
    Bridge,
    DepositParametersUpdated,
    DepositRevealed,
    DepositsSwept,
    FraudChallengeDefeated,
    FraudChallengeDefeatTimedOut,
    FraudChallengeSubmitted,
    FraudParametersUpdated,
    GovernanceTransferred,
    Initialized,
    MovedFundsSweepTimedOut,
    MovedFundsSwept,
    MovingFundsBelowDustReported,
    MovingFundsCommitmentSubmitted,
    MovingFundsCompleted,
    MovingFundsParametersUpdated,
    MovingFundsTimedOut,
    MovingFundsTimeoutReset,
    NewWalletRegistered,
    NewWalletRequested,
    RedemptionParametersUpdated,
    RedemptionRequested,
    RedemptionsCompleted,
    RedemptionTimedOut,
    SpvMaintainerStatusUpdated,
    SubmitDepositSweepProofCall,
    SubmitRedemptionProofCall,
    TreasuryUpdated,
    VaultStatusUpdated,
    WalletClosed,
    WalletClosing,
    WalletMovingFunds,
    WalletParametersUpdated,
    WalletTerminated
} from "../generated/Bridge/Bridge"


import {BigInt, ByteArray, Bytes, crypto, log} from '@graphprotocol/graph-ts'
import {
    getOrCreateDeposit,
    getOrCreateRedemption,
    getOrCreateTbtcToken,
    getOrCreateTransaction,
    getOrCreateUser,
    getStatus
} from "./utils/helper"
import * as Utils from "./utils/utils"
import {getIDFromCall, getIDFromEvent} from "./utils/utils"
import * as Swept from "./swept"

import * as Const from "./utils/constants"
import * as BitcoinUtils from "./utils/bitcoin_utils";
import {output} from "./utils/crypto";

export function handleDepositParametersUpdated(
    event: DepositParametersUpdated
): void {
}

export function handleDepositRevealed(event: DepositRevealed): void {
    let fundingTxHash = event.params.fundingTxHash
    let fundingOutputIndex = event.params.fundingOutputIndex
    // keccak256(fundingTxHash | fundingOutputIndex)
    let id = Utils.calculateDepositKey(Utils.bytesToUint8Array(fundingTxHash), fundingOutputIndex.toI32())

    let transaction = getOrCreateTransaction(getIDFromEvent(event))
    transaction.txHash = event.transaction.hash
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from
    transaction.to = event.transaction.to
    transaction.amount = event.params.amount
    transaction.description = "Deposit Revealed"
    transaction.save()

    let bridgeContract = Bridge.bind(event.address)
    let depositsContract = bridgeContract.deposits(Utils.hexToBigint(id.toHexString()))

    let deposit = getOrCreateDeposit(Bytes.fromByteArray(id))
    deposit.status = "REVEALED"
    deposit.user = event.params.depositor
    deposit.amount = event.params.amount
    deposit.treasuryFee = depositsContract.treasuryFee
    deposit.walletPubKeyHash = event.params.walletPubKeyHash
    deposit.fundingTxHash = event.params.fundingTxHash
    deposit.fundingOutputIndex = event.params.fundingOutputIndex
    deposit.blindingFactor = event.params.blindingFactor
    deposit.refundPubKeyHash = event.params.refundPubKeyHash
    deposit.refundLocktime = event.params.refundLocktime
    deposit.vault = event.params.vault
    let transactions = deposit.transactions
    transactions.push(transaction.id)
    deposit.transactions = transactions
    deposit.depositTimestamp = event.block.timestamp
    deposit.updateTimestamp = event.block.timestamp
    deposit.save()


    let user = getOrCreateUser(event.params.depositor)
    let tBtcToken = getOrCreateTbtcToken()
    user.tbtcToken = tBtcToken.id
    let deposits = user.deposits
    deposits.push(deposit.id)
    user.deposits = deposits
    user.save()
}

export function callHandleSubmitDepositSweepProofCall(call: SubmitDepositSweepProofCall): void {
    Swept.processDepositSweepTxInputs(call);
}

export function handleDepositsSwept(event: DepositsSwept): void {

}

export function handleFraudChallengeDefeatTimedOut(
    event: FraudChallengeDefeatTimedOut
): void {
}

export function handleFraudChallengeDefeated(
    event: FraudChallengeDefeated
): void {
}

export function handleFraudChallengeSubmitted(
    event: FraudChallengeSubmitted
): void {
}

export function handleFraudParametersUpdated(
    event: FraudParametersUpdated
): void {
}

export function handleGovernanceTransferred(
    event: GovernanceTransferred
): void {
}

export function handleInitialized(event: Initialized): void {
}

export function handleMovedFundsSweepTimedOut(
    event: MovedFundsSweepTimedOut
): void {
}

export function handleMovedFundsSwept(event: MovedFundsSwept): void {
}

export function handleMovingFundsBelowDustReported(
    event: MovingFundsBelowDustReported
): void {
}

export function handleMovingFundsCommitmentSubmitted(
    event: MovingFundsCommitmentSubmitted
): void {
}

export function handleMovingFundsCompleted(event: MovingFundsCompleted): void {
}

export function handleMovingFundsParametersUpdated(
    event: MovingFundsParametersUpdated
): void {
}

export function handleMovingFundsTimedOut(event: MovingFundsTimedOut): void {
}

export function handleMovingFundsTimeoutReset(
    event: MovingFundsTimeoutReset
): void {
}

export function handleNewWalletRegistered(event: NewWalletRegistered): void {

}

export function handleNewWalletRequested(event: NewWalletRequested): void {
}

export function handleRedemptionParametersUpdated(
    event: RedemptionParametersUpdated
): void {
}

function reformatRedemptionKeyIfExists(redeemerOutputScript: Bytes, walletPubKeyHash: Bytes): string {
    let loop = true
    let count = Const.ZERO_BI
    let id = ""
    while (loop) {
        id = Utils.calculateRedemptionKey(redeemerOutputScript, walletPubKeyHash, count)
        let redemption = getOrCreateRedemption(id)
        if (redemption.updateTimestamp.notEqual(Const.ZERO_BI)) {
            count = count.plus(Const.ONE_BI)
        } else {
            loop = false
        }
    }
    return id
}

function getLastRedemptionKey(redeemerOutputScript: Bytes, walletPubKeyHash: Bytes): string {
    let loop = true
    let count = Const.ZERO_BI
    let id = ""
    let lastId = ""
    while (loop) {
        id = Utils.calculateRedemptionKeyByScriptHash(redeemerOutputScript, walletPubKeyHash, count)
        let redemption = getOrCreateRedemption(id)
        if (redemption.updateTimestamp.notEqual(Const.ZERO_BI)) {
            count = count.plus(Const.ONE_BI)
            lastId = id
        } else {
            loop = false
        }
    }
    return lastId
}

export function handleRedemptionRequested(event: RedemptionRequested): void {
    let transaction = getOrCreateTransaction(getIDFromEvent(event))
    transaction.txHash = event.transaction.hash
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from
    transaction.to = event.transaction.to
    transaction.amount = event.params.requestedAmount
    transaction.description = "Redemption Requested"
    transaction.save()

    let walletPubKeyHash = event.params.walletPubKeyHash
    let redeemerOutputScript = event.params.redeemerOutputScript

    // keccak256(keccak256(redeemerOutputScript) | walletPubKeyHash)
    let id = reformatRedemptionKeyIfExists(redeemerOutputScript, walletPubKeyHash)
    let redemption = getOrCreateRedemption(id)

    redemption.status = "REQUESTED"
    redemption.user = event.params.redeemer
    redemption.amount = event.params.requestedAmount
    redemption.treasuryFee = event.params.treasuryFee
    redemption.txMaxFee = event.params.txMaxFee
    redemption.redemptionTxHash = event.transaction.hash
    redemption.redemptionTimestamp = event.block.timestamp
    redemption.walletPubKeyHash = event.params.walletPubKeyHash
    redemption.redeemerOutputScript = event.params.redeemerOutputScript
    redemption.updateTimestamp = event.block.timestamp

    let transactions = redemption.transactions
    transactions.push(transaction.id)
    redemption.transactions = transactions
    redemption.save()
}

export function handleRedemptionTimedOut(event: RedemptionTimedOut): void {
    let walletPubKeyHash = event.params.walletPubKeyHash
    let redeemerOutputScript = event.params.redeemerOutputScript

    let transaction = getOrCreateTransaction(getIDFromEvent(event))
    transaction.txHash = event.transaction.hash
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from
    transaction.to = event.transaction.to
    transaction.description = "Redemption TimedOut"
    transaction.save()

    // keccak256(keccak256(redeemerOutputScript) | walletPubKeyHash)
    let id = reformatRedemptionKeyIfExists(redeemerOutputScript, walletPubKeyHash)
    let redemption = getOrCreateRedemption(id)
    redemption.status = "TIMEDOUT"
    redemption.updateTimestamp = event.block.timestamp
    let transactions = redemption.transactions
    transactions.push(transaction.id)
    redemption.transactions = transactions
    redemption.save()
}

function calculateOutputScriptHash(redemptionTxOutputVector: Uint8Array, outputScriptStart: i32, scriptLength: i32): ByteArray {
    const outputScriptData = redemptionTxOutputVector.subarray(outputScriptStart, outputScriptStart + scriptLength);
    let byteArray = new ByteArray(outputScriptData.length)
    for (let i = 0; i < outputScriptData.length; i++) {
        byteArray[i] = outputScriptData[i];
    }
    return crypto.keccak256(byteArray);
}

export function callHandlerSubmitRedemptionProof(call: SubmitRedemptionProofCall): void {
    const outputVector = call.inputs.redemptionTx.outputVector;
    const redemptionTxOutputVector = BitcoinUtils.parseVarInt(Utils.bytesToUint8Array(outputVector));
    const outputsCompactSizeUintLength = redemptionTxOutputVector.dataLength;
    const outputsCount = redemptionTxOutputVector.number.toI32();

    let outputStartingIndex = outputsCompactSizeUintLength.plus(BigInt.fromI32(1));
    for (let i: i32 = 0; i < outputsCount; i++) {
        let outputLength = BitcoinUtils.determineOutputLengthAt(outputVector, outputStartingIndex);

        let scriptLength = outputLength.minus(BigInt.fromI32(8));
        let outputScriptStart = outputStartingIndex.plus(BigInt.fromI32(8));
        let outputScript = calculateOutputScriptHash(Utils.bytesToUint8Array(outputVector), outputScriptStart.toI32(), scriptLength.toI32())

        let redemptionKey = getLastRedemptionKey(Bytes.fromByteArray(outputScript), call.inputs.walletPubKeyHash)

        let redemption = getOrCreateRedemption(redemptionKey);
        //Check if redemption exist
        if (redemption.status != "UNKNOWN" && redemption.updateTimestamp.notEqual(Const.ZERO_BI)) {

            let status = getStatus()
            //[1] : block hash , [0]: redemption hash
            let pendingRedemptions = status.pendingRedemptions
            if (status.pendingRedemptions[1] == call.block.hash) {
                let transaction = getOrCreateTransaction(getIDFromCall(call))
                transaction.txHash = call.transaction.hash
                transaction.timestamp = call.block.timestamp
                transaction.from = call.transaction.from
                transaction.to = call.transaction.to
                transaction.description = "Redemption success"
                transaction.save()

                redemption.status = "COMPLETED"
                redemption.completedTxHash = pendingRedemptions[0]
                redemption.updateTimestamp = call.block.timestamp
                let transactions = redemption.transactions
                transactions.push(transaction.id)
                redemption.transactions = transactions
                redemption.save()
            }
        }
        outputStartingIndex = outputStartingIndex.plus(outputLength)
    }
    //Reset pendingRedemptions list
    let status = getStatus()
    status.pendingRedemptions = []
    status.save()
}

export function handleRedemptionsCompleted(event: RedemptionsCompleted): void {
    let status = getStatus()
    let pendingRedemptions = status.pendingRedemptions
    pendingRedemptions.push(event.params.redemptionTxHash)
    pendingRedemptions.push(event.block.hash)
    status.pendingRedemptions = pendingRedemptions
    status.save()
}

export function handleSpvMaintainerStatusUpdated(
    event: SpvMaintainerStatusUpdated
): void {
}

export function handleTreasuryUpdated(event: TreasuryUpdated): void {
}

export function handleVaultStatusUpdated(event: VaultStatusUpdated): void {
}

export function handleWalletClosed(event: WalletClosed): void {
}

export function handleWalletClosing(event: WalletClosing): void {
}

export function handleWalletMovingFunds(event: WalletMovingFunds): void {
}

export function handleWalletParametersUpdated(
    event: WalletParametersUpdated
): void {
}

export function handleWalletTerminated(event: WalletTerminated): void {
}

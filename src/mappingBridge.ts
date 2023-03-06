import {
    Bridge,
    DepositParametersUpdated,
    DepositRevealed,
    DepositsSwept,
    FraudChallengeDefeatTimedOut,
    FraudChallengeDefeated,
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
    RedemptionTimedOut,
    RedemptionsCompleted,
    SpvMaintainerStatusUpdated,
    TreasuryUpdated,
    VaultStatusUpdated,
    WalletClosed,
    WalletClosing,
    WalletMovingFunds,
    WalletParametersUpdated,
    WalletTerminated,
    RequestRedemptionCall,
    SubmitDepositSweepProofCall, RevealDepositCall
} from "../generated/Bridge/Bridge"


import {log, Bytes} from '@graphprotocol/graph-ts'
import {
    getOrCreateDeposit,
    getOrCreateRedemption,
    getOrCreateTbtcToken,
    getOrCreateTransaction,
    getOrCreateUser
} from "./utils/helper"
import * as Utils from "./utils/utils"
import * as Const from "./utils/constants"

import {getIDFromEvent} from "./utils/utils";
import {extractOutputAtIndex, extractValue} from "./utils/bitcoin_utils"

export function handleDepositParametersUpdated(
    event: DepositParametersUpdated
): void {
}


/**
 * Normal case : handleDepositRevealed() will be called before callHandleRevealDeposit()
 * Error case : transaction request revealed error so only callHandleRevealDeposit() be called
 * @param call
 */
export function callHandleRevealDeposit(call: RevealDepositCall): void {
    let fundingTx = call.inputs.fundingTx
    let reveal = call.inputs.reveal

    let version: Uint8Array = Uint8Array.wrap(fundingTx.version.buffer);
    let inputVector: Uint8Array = Uint8Array.wrap(fundingTx.inputVector.buffer);
    let outputVector: Uint8Array = Uint8Array.wrap(fundingTx.outputVector.buffer);
    let locktime: Uint8Array = Uint8Array.wrap(fundingTx.locktime.buffer);


    let packed = new Uint8Array(version.length + inputVector.length + outputVector.length + locktime.length);
    packed.set(version, 0);
    packed.set(inputVector, version.length);
    packed.set(outputVector, version.length + inputVector.length);
    packed.set(locktime, version.length + inputVector.length + outputVector.length);

    //to generate bitcoin transaction we need double hash.
    const hashData = Utils.hash(Utils.hash(packed));
    let fundingTxHash: string = Utils.toHexString(hashData);

    let id = Utils.calculateDepositKey(Utils.bytesToUint8Array(Bytes.fromHexString(fundingTxHash)), reveal.fundingOutputIndex.toI32())
    let deposit = getOrCreateDeposit(Bytes.fromByteArray(id))
    // if status === "UNKNOWN" mean DepositRevealed didn't called so transaction
    // to reveal information failed , update status to SWEPT
    if (deposit.status === "UNKNOWN") {

        const transaction = getOrCreateTransaction(Utils.getIDFromCall(call))
        transaction.txHash = call.transaction.hash
        transaction.timestamp = call.block.timestamp
        transaction.from = call.transaction.from
        transaction.to = call.transaction.to
        transaction.amount = Const.ZERO_BI
        transaction.description = "Depositor request reveal information"
        transaction.save()

        const bridgeContract = Bridge.bind(call.to)
        const depositsContract = bridgeContract.deposits(Utils.hexToBigint(id.toHexString()))

        const user = getOrCreateUser(call.from)
        const tBtcToken = getOrCreateTbtcToken()
        user.tbtcToken = tBtcToken.id
        const deposits = user.deposits
        deposits.push(deposit.id)
        user.deposits = deposits
        user.save()


        const fundingOutput = extractOutputAtIndex(fundingTx.outputVector, reveal.fundingOutputIndex.toI32())
        const amount = extractValue(fundingOutput)
        deposit.amount = amount
        deposit.status = "SWEPT"
        deposit.user = user.id
        deposit.treasuryFee = depositsContract.treasuryFee
        deposit.walletPubKeyHash = reveal.walletPubKeyHash
        deposit.fundingTxHash = Bytes.fromHexString(fundingTxHash)
        deposit.fundingOutputIndex = reveal.fundingOutputIndex
        deposit.blindingFactor = reveal.blindingFactor
        deposit.refundPubKeyHash = reveal.refundPubKeyHash
        deposit.refundLocktime = reveal.refundLocktime
        deposit.vault = reveal.vault
        const transactions = deposit.transactions
        transactions.push(transaction.id)
        deposit.transactions = transactions
        deposit.depositTimestamp = call.block.timestamp
        deposit.updateTimestamp = call.block.timestamp
        deposit.save()
    } else {
        const transaction = getOrCreateTransaction(Utils.getIDFromCall(call))
        transaction.txHash = call.transaction.hash
        //minus 1 to make sure this transaction always before DepositRevealed
        transaction.timestamp = call.block.timestamp.minus(Const.ONE_BI)
        transaction.from = call.transaction.from
        transaction.to = call.transaction.to
        transaction.amount = Const.ZERO_BI
        transaction.description = "Depositor request reveal information"
        transaction.save()

        let transactions = deposit.transactions
        transactions.push(transaction.id)
        deposit.transactions = transactions
        deposit.save()
    }
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

export function handleDepositsSwept(event: DepositsSwept): void {
    // log.debug("DepositsSwept called: {}, {}", [event.params.walletPubKeyHash.toHexString(), event.params.sweepTxHash.toHexString()])
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


export function callHandleRequestRedemption(event: RequestRedemptionCall): void {

    // let txHash = event.inputs.mainUtxo.txHash
    // let txOutputIndex = event.inputs.mainUtxo.txOutputIndex
    // let txOutputValue = event.inputs.mainUtxo.txOutputValue
    // let walletPubKeyHash = event.inputs.walletPubKeyHash
    // let redeemerOutputScript = event.inputs.redeemerOutputScript
    // let amount = event.inputs.amount
    //
    // let id = Utils.calculateRedemptionKey(redeemerOutputScript, walletPubKeyHash)
    //
}

export function callHandleSubmitDepositSweepProof(event: SubmitDepositSweepProofCall): void {
    // let sweepTx = event.inputs.sweepTx
    // let version = sweepTx.version
    // let inputVector = sweepTx.inputVector
    // let outputVector = sweepTx.outputVector
    // let locktime = sweepTx.locktime
    //
    // let sweepProof = event.inputs.sweepProof
    // let merkleProof = sweepProof.merkleProof
    // let txIndexInBlock = sweepProof.txIndexInBlock
    // let bitcoinHeaders = sweepProof.bitcoinHeaders
    //
    // let mainUtxo = event.inputs.mainUtxo
    // let txOutputIndex = mainUtxo.txOutputIndex
    // let txOutputValue = mainUtxo.txOutputValue
    //
    // let vault = event.inputs.mainUtxo


    // let transactionEntity = Helper.getOrCreateTransaction(event.transaction.hash)
    // transactionEntity.txHash = event.transaction.hash
    // transactionEntity.timestamp = event.block.timestamp
    // transactionEntity.from = event.transaction.from
    // transactionEntity.to = event.transaction.to
    // transactionEntity.description = "Deposit Sweep Proof"
    // transactionEntity.save()
    //
    // let deposit = Helper.getOrCreateDeposit(Bytes.fromHexString(Utils.convertDepositKeyToHex(event.params.depositKey)))
    // deposit.status = "MINTING_REQUEST"
    // deposit.updateTimestamp = event.block.timestamp
    // let transactions = deposit.transactions
    // transactions.push(transactionEntity.id)
    // deposit.transactions = transactions
    // deposit.save()
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
    let id = Utils.calculateRedemptionKey(redeemerOutputScript, walletPubKeyHash)
    let redemption = getOrCreateRedemption(Bytes.fromByteArray(id))
    redemption.user = event.params.redeemer
    redemption.amount = event.params.requestedAmount
    redemption.treasuryFee = event.params.treasuryFee
    redemption.txMaxFee = event.params.txMaxFee
    let transactions = redemption.transactions
    transactions.push(transaction.id)
    redemption.transactions = transactions
    redemption.save()

    let user = getOrCreateUser(event.params.redeemer)
    let redeems = user.redemptions
    redeems.push(redemption.id)
    user.redemptions = redeems
    user.save()
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
    let id = Utils.calculateRedemptionKey(redeemerOutputScript, walletPubKeyHash)
    let redemption = getOrCreateRedemption(Bytes.fromByteArray(id))
    redemption.status = "TIMEDOUT"
    let transactions = redemption.transactions
    transactions.push(transaction.id)
    redemption.transactions = transactions
    redemption.save()
}

export function handleRedemptionsCompleted(event: RedemptionsCompleted): void {
    let walletPubKeyHash = event.params.walletPubKeyHash
    let redemptionTxHash = event.params.redemptionTxHash
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

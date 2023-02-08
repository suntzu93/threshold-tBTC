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
    SubmitDepositSweepProofCall
} from "../generated/Bridge/Bridge"


import {log, Bytes} from '@graphprotocol/graph-ts'
import {getOrCreateDeposit, getOrCreateRedemption, getOrCreateTransaction, getOrCreateUser} from "./utils/helper"
import * as Utils from "./utils/utils"

export function handleDepositParametersUpdated(
    event: DepositParametersUpdated
): void {
}

export function handleDepositRevealed(event: DepositRevealed): void {
    let fundingTxHash = event.params.fundingTxHash
    let fundingOutputIndex = event.params.fundingOutputIndex
    // keccak256(fundingTxHash | fundingOutputIndex)
    let id = Utils.calculateDepositKey(Utils.bytesToUint8Array(fundingTxHash), fundingOutputIndex.toI32());

    let transaction = getOrCreateTransaction(event.transaction.hash)
    transaction.txHash = event.transaction.hash
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from
    transaction.to = event.transaction.to
    transaction.amount = event.params.amount
    transaction.description = "Deposit Revealed"
    transaction.save()

    let hexWithoutOx = id.toHexString().substring(2).toUpperCase();
    let bridgeContract = Bridge.bind(event.address)
    let depositsContract = bridgeContract.deposits(Utils.hexToBigint(hexWithoutOx));

    let user = getOrCreateUser(event.params.depositor)
    user.save()

    let deposit = getOrCreateDeposit(Bytes.fromByteArray(id))
    deposit.user = user.id
    deposit.amount = deposit.amount.plus(event.params.amount)
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
}

export function handleDepositsSwept(event: DepositsSwept): void {
    log.debug("DepositsSwept called: {}, {}", [event.params.walletPubKeyHash.toHexString(), event.params.sweepTxHash.toHexString()])
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
    let walletPubKeyHash = event.inputs.walletPubKeyHash

    let txHash = event.inputs.mainUtxo.txHash
    let txOutputIndex = event.inputs.mainUtxo.txOutputIndex
    let txOutputValue = event.inputs.mainUtxo.txOutputValue

    let redeemerOutputScript = event.inputs.redeemerOutputScript
    let amount = event.inputs.amount

    log.info("thanhlv callHandleRequestRedemption walletPubKeyHash = {}, txHash = {} , txOutputIndex = {}, txOutputValue = {}, redeemerOutputScript = {} , amount = {}", [
        walletPubKeyHash.toHexString(),
        txHash.toHexString(),
        txOutputIndex.toString(),
        txOutputValue.toString(),
        redeemerOutputScript.toHexString(),
        amount.toString()
    ])
}

export function callHandleSubmitDepositSweepProof(event: SubmitDepositSweepProofCall): void {
    let txHash = event.inputs.mainUtxo.txHash
    let txOutputIndex = event.inputs.mainUtxo.txOutputIndex
    let txOutputValue = event.inputs.mainUtxo.txOutputValue
    let vault = event.inputs.vault;

    log.info("thanhlv callHandleSubmitDepositSweepProof txHash = {} , txOutputIndex = {}, txOutputValue = {}, vault = {}", [
        txHash.toHexString(),
        txOutputIndex.toString(),
        txOutputValue.toString(),
        vault.toHexString()
    ])
}

export function handleRedemptionRequested(event: RedemptionRequested): void {
    let transaction = getOrCreateTransaction(event.transaction.hash)
    transaction.txHash = event.transaction.hash
    transaction.timestamp = event.block.timestamp
    transaction.from = event.transaction.from
    transaction.to = event.transaction.to
    transaction.amount = event.params.requestedAmount
    transaction.description = "Redemption Requested"
    transaction.save()

    let user = getOrCreateUser(event.params.redeemer)
    user.save()

    let walletPubKeyHash = event.params.walletPubKeyHash
    let redeemerOutputScript = event.params.redeemerOutputScript
    // keccak256(keccak256(redeemerOutputScript) | walletPubKeyHash)
    let id = Utils.calculateRedemptionKey(redeemerOutputScript, walletPubKeyHash)
    let redemption = getOrCreateRedemption(Bytes.fromByteArray(id))
    redemption.user = user.id
    redemption.amount = event.params.requestedAmount
    redemption.treasuryFee = event.params.treasuryFee
    redemption.txMaxFee = event.params.txMaxFee
    let transactions = redemption.transactions
    transactions.push(transaction.id)
    redemption.transactions = transactions
    redemption.save()

    log.info("thanhlv2 redemptionKey 1 : {} , outputBytes.length = {} , walletPublicKeyBytes.length = {}", [id.toHexString(), redeemerOutputScript.length.toString(), walletPubKeyHash.length.toString()])

    log.info("thanhlv handleRedemptionRequested walletPubKeyHash = {} , redeemerOutputScript = {}, redeemer = {} , requestedAmount  = {}, treasuryFee = {}, txMaxFee = {}",
        [
            walletPubKeyHash.toHexString(),
            redeemerOutputScript.toHexString(),
            event.params.redeemer.toHexString(),
            event.params.requestedAmount.toString(),
            event.params.treasuryFee.toString(),
            event.params.txMaxFee.toString()
        ])
}

export function handleRedemptionTimedOut(event: RedemptionTimedOut): void {
    log.info("thanhlv handleRedemptionTimedOut walletPubKeyHash = {} , redeemerOutputScript = {}",
        [
            event.params.walletPubKeyHash.toHexString(),
            event.params.redeemerOutputScript.toHexString(),
        ])

    let walletPubKeyHash = event.params.walletPubKeyHash
    let redeemerOutputScript = event.params.redeemerOutputScript

    let transaction = getOrCreateTransaction(event.transaction.hash)
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
    let walletPubKeyHash = event.params.walletPubKeyHash;
    let redemptionTxHash = event.params.redemptionTxHash;

    log.info("thanhlv handleRedemptionsCompleted walletPubKeyHash = {} , redemptionTxHash = {}",
        [
            walletPubKeyHash.toHexString(),
            redemptionTxHash.toHexString()
        ])

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

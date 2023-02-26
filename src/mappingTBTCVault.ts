import {Address, BigInt} from "@graphprotocol/graph-ts";
import {
    TBTCVault,
    OptimisticMintingCancelled,
    OptimisticMintingDebtRepaid,
    OptimisticMintingFinalized,
    OptimisticMintingPaused,
    OptimisticMintingRequested,
    OwnershipTransferred,
} from "../generated/TBTCVault/TBTCVault";
import {log, Bytes} from "@graphprotocol/graph-ts";
import * as Helper from "./utils/helper";
import * as Utils from "./utils/utils"
import * as Const from "./utils/constants"


export function handleOptimisticMintingCancelled(
    event: OptimisticMintingCancelled
): void {
    let transactionEntity = Helper.getOrCreateTransaction(event.transaction.hash)
    transactionEntity.txHash = event.transaction.hash
    transactionEntity.timestamp = event.block.timestamp
    transactionEntity.from = event.transaction.from
    transactionEntity.to = event.transaction.to
    transactionEntity.description = `Guardian ${event.params.guardian.toHexString()} canceled`
    transactionEntity.save()

    let deposit = Helper.getOrCreateDeposit(Bytes.fromHexString(Utils.convertDepositKeyToHex(event.params.depositKey)))
    deposit.status = "CANCEL"
    let transactions = deposit.transactions
    transactions.push(transactionEntity.id)
    deposit.transactions = transactions
    deposit.save()

}

export function handleOptimisticMintingDebtRepaid(
    event: OptimisticMintingDebtRepaid
): void {
    let user = Helper.getOrCreateUser(event.params.depositor)
    user.mintingDebt = event.params.optimisticMintingDebt
    user.save()
}


export function handleOptimisticMintingFinalized(
    event: OptimisticMintingFinalized
): void {
    let deposit = Helper.getOrCreateDeposit(Bytes.fromHexString(Utils.convertDepositKeyToHex(event.params.depositKey)));
    let tBTCVaultContract = TBTCVault.bind(event.address)

    let user = Helper.getOrCreateUser(event.params.depositor)
    user.mintingDebt = event.params.optimisticMintingDebt
    user.save()

    // Divisor used to compute the treasury fee taken from each
    ///         optimistically minted deposit and transferred to the treasury
    ///         upon finalization of the optimistic mint.
    let feeDivisor = tBTCVaultContract.optimisticMintingFeeDivisor()

    // Bridge, when sweeping, cuts a deposit treasury fee and splits
    // Bitcoin miner fee for the sweep transaction evenly between the
    // depositors in the sweep.
    //
    // When tokens are optimistically minted, we do not know what the
    // Bitcoin miner fee for the sweep transaction will look like.
    // The Bitcoin miner fee is ignored. When sweeping, the miner fee is
    // subtracted so the optimisticMintingDebt may stay non-zero after the
    // deposit is swept.
    //
    // This imbalance is supposed to be solved by a donation to the Bridge.
    let amountToMint = (deposit.amount.minus(deposit.treasuryFee)).times(Const.SATOSHI_MULTIPLIER)

    // The Optimistic Minting mechanism may additionally cut a fee from the
    // amount that is left after deducting the Bridge deposit treasury fee.
    // Think of this fee as an extra payment for faster processing of
    // deposits. One does not need to use the Optimistic Minting mechanism
    // and they may wait for the Bridge to sweep their deposit if they do
    // not want to pay the Optimistic Minting fee.
    let optimisticMintFee = feeDivisor.gt(Const.ZERO_BI)
        ? (amountToMint.div(feeDivisor))
        : Const.ZERO_BI;

    let transactionEntity = Helper.getOrCreateTransaction(event.transaction.hash)
    transactionEntity.txHash = event.transaction.hash
    transactionEntity.timestamp = event.block.timestamp
    transactionEntity.from = event.transaction.from
    transactionEntity.to = event.transaction.to
    transactionEntity.amount = amountToMint
    transactionEntity.description = "Minting Finalized"
    transactionEntity.save()

    deposit.status = "COMPLETED"
    deposit.updateTimestamp = event.block.timestamp
    deposit.newDebt = event.params.optimisticMintingDebt
    deposit.actualAmountReceived = amountToMint.minus(optimisticMintFee)
    let transactions = deposit.transactions
    transactions.push(transactionEntity.id)
    deposit.transactions = transactions
    deposit.user = user.id
    deposit.save()
}

export function handleOptimisticMintingPaused(
    event: OptimisticMintingPaused
): void {
}


export function handleOptimisticMintingRequested(
    event: OptimisticMintingRequested
): void {
    let transactionEntity = Helper.getOrCreateTransaction(event.transaction.hash)
    transactionEntity.txHash = event.transaction.hash
    transactionEntity.timestamp = event.block.timestamp
    transactionEntity.from = event.transaction.from
    transactionEntity.to = event.transaction.to
    transactionEntity.amount = event.params.amount
    transactionEntity.description = "Minting Requested"
    transactionEntity.save()

    let deposit = Helper.getOrCreateDeposit(Bytes.fromHexString(Utils.convertDepositKeyToHex(event.params.depositKey)));
    deposit.status = "SWEPT"
    deposit.updateTimestamp = event.block.timestamp
    let transactions = deposit.transactions
    transactions.push(transactionEntity.id)
    deposit.transactions = transactions
    deposit.save()

}


export function handleOwnershipTransferred(event: OwnershipTransferred): void {
}


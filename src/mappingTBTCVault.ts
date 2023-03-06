import {Address, BigInt} from "@graphprotocol/graph-ts"
import {
    TBTCVault,
    OptimisticMintingCancelled,
    OptimisticMintingDebtRepaid,
    OptimisticMintingFinalized,
    OptimisticMintingPaused,
    OptimisticMintingRequested,
    OwnershipTransferred, OptimisticMintingUnpaused, Minted, Unminted,
} from "../generated/TBTCVault/TBTCVault"
import {log, Bytes} from "@graphprotocol/graph-ts"
import * as Helper from "./utils/helper"
import * as Utils from "./utils/utils"
import * as Const from "./utils/constants"
import {getOrCreateDeposit, getOrCreateTbtcToken, getOrCreateUser, getStats} from "./utils/helper";
import {getIDFromEvent} from "./utils/utils";

import {
    TBTC
} from "../generated/TBTC/TBTC"
import {Treasury} from "./utils/constants";
import {Bridge} from "../generated/Bridge/Bridge";
import {User} from "../generated/schema";

export function handleOptimisticMintingCancelled(
    event: OptimisticMintingCancelled
): void {
    let transactionEntity = Helper.getOrCreateTransaction(getIDFromEvent(event))
    transactionEntity.txHash = event.transaction.hash
    transactionEntity.timestamp = event.block.timestamp
    transactionEntity.from = event.transaction.from
    transactionEntity.to = event.transaction.to
    transactionEntity.description = `Guardian ${event.params.guardian.toHexString()} canceled`
    transactionEntity.save()

    let deposit = Helper.getOrCreateDeposit(Bytes.fromHexString(Utils.convertDepositKeyToHex(event.params.depositKey)))
    deposit.status = "CANCELED"
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
    let deposit = Helper.getOrCreateDeposit(Bytes.fromHexString(Utils.convertDepositKeyToHex(event.params.depositKey)))
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
        : Const.ZERO_BI

    let transactionEntity = Helper.getOrCreateTransaction(getIDFromEvent(event))
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
    let stats = getStats()
    stats.mintingStatus = false
    stats.save()
}

export function handleOptimisticMintingUnPaused(
    event: OptimisticMintingUnpaused
): void {
    let stats = getStats()
    stats.mintingStatus = true
    stats.save()
}

export function handleOptimisticMintingRequested(
    event: OptimisticMintingRequested
): void {
    let transactionEntity = Helper.getOrCreateTransaction(getIDFromEvent(event))
    transactionEntity.txHash = event.transaction.hash
    transactionEntity.timestamp = event.block.timestamp
    transactionEntity.from = event.transaction.from
    transactionEntity.to = event.transaction.to
    transactionEntity.amount = event.params.amount
    transactionEntity.description = "Minting Requested"
    transactionEntity.save()

    let deposit = Helper.getOrCreateDeposit(Bytes.fromHexString(Utils.convertDepositKeyToHex(event.params.depositKey)))
    deposit.status = "MINTING_REQUESTED"
    deposit.updateTimestamp = event.block.timestamp
    let transactions = deposit.transactions
    transactions.push(transactionEntity.id)
    deposit.transactions = transactions
    deposit.save()

}


export function handleMinted(event: Minted): void {
    let contract = TBTC.bind(Const.TBTCToken)
    let tBtcToken = getOrCreateTbtcToken()
    tBtcToken.totalMint = tBtcToken.totalMint.plus(event.params.amount)
    tBtcToken.totalSupply = contract.totalSupply()
    tBtcToken.save()

    //check if the user has swept the deposit
    if (event.params.to.toHex() != Const.Treasury.toHex()) {
        let user = getOrCreateUser(event.params.to)
        if (user) {
            let deposits = user.deposits
            if (deposits) {
                for (let i = 0; i < deposits.length; i++) {
                    let depositId = deposits[i]
                    let deposit = getOrCreateDeposit(depositId)

                    // if a user has two deposits in the swept state, it will be necessary to check
                    // if the deposit on the contract has a sweptAt timestamp that
                    // is not equal to zero to determine which deposit has just been processed.
                    if (deposit.status == "SWEPT") {
                        let bridgeContract = Bridge.bind(Const.BRIDGE_CONTRACT)
                        let depositsContract = bridgeContract.deposits(Utils.hexToBigint(deposit.id.toHex()))
                        let sweptAt = depositsContract.sweptAt

                        //if sweptAt != 0 means that this deposit has just been processed.
                        if (sweptAt.notEqual(Const.ZERO_BI)) {
                            let transactionEntity = Helper.getOrCreateTransaction(getIDFromEvent(event))
                            transactionEntity.txHash = event.transaction.hash
                            transactionEntity.timestamp = event.block.timestamp
                            transactionEntity.from = event.transaction.from
                            transactionEntity.to = event.transaction.to
                            transactionEntity.amount = event.params.amount
                            transactionEntity.description = "Swept deposit processed successfully."
                            transactionEntity.save()

                            let transactions = deposit.transactions
                            transactions.push(transactionEntity.id)
                            deposit.transactions = transactions
                            deposit.actualAmountReceived = event.params.amount
                            deposit.status = "COMPLETED"
                            deposit.save()
                        }
                    }
                }
            } else {
                log.warning("deposits is null", [])
            }
        } else {
            log.warning("user is null", [])

        }

    }

}

export function handlerUnminted(event: Unminted): void {
    let contract = TBTC.bind(Const.TBTCToken)
    let tBtcToken = getOrCreateTbtcToken()
    tBtcToken.totalBurn = tBtcToken.totalMint.plus(event.params.amount)
    tBtcToken.totalSupply = contract.totalSupply()
    tBtcToken.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
}


import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  TBTCVault,
  GuardianAdded,
  GuardianRemoved,
  Minted,
  MinterAdded,
  MinterRemoved,
  OptimisticMintingCancelled,
  OptimisticMintingDebtRepaid,
  OptimisticMintingDelayUpdateStarted,
  OptimisticMintingDelayUpdated,
  OptimisticMintingFeeUpdateStarted,
  OptimisticMintingFeeUpdated,
  OptimisticMintingFinalized,
  OptimisticMintingPaused,
  OptimisticMintingRequested,
  OptimisticMintingUnpaused,
  OwnershipTransferred,
  Unminted,
  UpgradeFinalized,
  UpgradeInitiated,
} from "../generated/TBTCVault/TBTCVault";
import { log, Bytes } from "@graphprotocol/graph-ts";
import * as Helper from "./utils/helper";
import * as Utils from "./utils/utils"
import * as Const from "./utils/constants"


function convertDepositKeyToHex(depositKey: BigInt): string {
  let depositKeyHex = depositKey.toHexString();
  //Some cases with length is 65 then convert to bytes will crash
  //exp : 0x86cc94dc9f76f03160ab4514842b9345b5d063a5b4023fed4efc9a871b06044
  if (depositKeyHex.length == 65) {
    depositKeyHex = depositKeyHex.replace('0x', '0x0')
  }
  return depositKeyHex
}

export function handleGuardianAdded(event: GuardianAdded): void { }

export function handleGuardianRemoved(event: GuardianRemoved): void { }

export function handleMinted(event: Minted): void {
  log.error("handleMinted called: to = {}, amount = {} ", [
    event.params.to.toHexString(),
    event.params.amount.toString(),
  ]);
}

export function handleMinterAdded(event: MinterAdded): void { }

export function handleMinterRemoved(event: MinterRemoved): void { }

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

  let deposit =  Helper.getOrCreateDeposit(Bytes.fromHexString(convertDepositKeyToHex(event.params.depositKey)))
  deposit.status = "CANCEL"
  let transactions = deposit.transactions
  transactions.push(transactionEntity.id)
  deposit.transactions = transactions
  deposit.save()

}

export function handleOptimisticMintingDebtRepaid(
  event: OptimisticMintingDebtRepaid
): void { }

export function handleOptimisticMintingDelayUpdateStarted(
  event: OptimisticMintingDelayUpdateStarted
): void { }

export function handleOptimisticMintingDelayUpdated(
  event: OptimisticMintingDelayUpdated
): void { }

export function handleOptimisticMintingFeeUpdateStarted(
  event: OptimisticMintingFeeUpdateStarted
): void { }

export function handleOptimisticMintingFeeUpdated(
  event: OptimisticMintingFeeUpdated
): void { }

export function handleOptimisticMintingFinalized(
  event: OptimisticMintingFinalized
): void {
  let deposit =  Helper.getOrCreateDeposit(Bytes.fromHexString(convertDepositKeyToHex(event.params.depositKey)));
  let tBTCVaultContract = TBTCVault.bind(event.address)

  let user =  Helper.getOrCreateUser(event.params.depositor)
  user.mintingDebt = tBTCVaultContract.optimisticMintingDebt(Address.fromBytes(user.id))
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

  let transactionEntity =  Helper.getOrCreateTransaction(event.transaction.hash)
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
): void { }


export function handleOptimisticMintingRequested(
  event: OptimisticMintingRequested
): void {
  let transactionEntity =  Helper.getOrCreateTransaction(event.transaction.hash)
  transactionEntity.txHash = event.transaction.hash
  transactionEntity.timestamp = event.block.timestamp
  transactionEntity.from = event.transaction.from
  transactionEntity.to = event.transaction.to
  transactionEntity.amount = event.params.amount
  transactionEntity.description = "Minting Requested"
  transactionEntity.save()

  let deposit =  Helper.getOrCreateDeposit(Bytes.fromHexString(convertDepositKeyToHex(event.params.depositKey)));
  deposit.status = "SWEPT"
  deposit.updateTimestamp = event.block.timestamp
  let transactions = deposit.transactions
  transactions.push(transactionEntity.id)
  deposit.transactions = transactions
  deposit.save()

}

export function handleOptimisticMintingUnpaused(
  event: OptimisticMintingUnpaused
): void { }

export function handleOwnershipTransferred(event: OwnershipTransferred): void { }

export function handleUnminted(event: Unminted): void { }

export function handleUpgradeFinalized(event: UpgradeFinalized): void { }

export function handleUpgradeInitiated(event: UpgradeInitiated): void { }

import { BigInt } from "@graphprotocol/graph-ts"
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
  WalletTerminated
} from "../generated/Bridge/Bridge"
import { ExampleEntity } from "../generated/schema"

export function handleDepositParametersUpdated(
  event: DepositParametersUpdated
): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.depositDustThreshold = event.params.depositDustThreshold
  entity.depositTreasuryFeeDivisor = event.params.depositTreasuryFeeDivisor

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.activeWalletPubKeyHash(...)
  // - contract.contractReferences(...)
  // - contract.depositParameters(...)
  // - contract.deposits(...)
  // - contract.fraudChallenges(...)
  // - contract.fraudParameters(...)
  // - contract.governance(...)
  // - contract.isVaultTrusted(...)
  // - contract.liveWalletsCount(...)
  // - contract.movedFundsSweepRequests(...)
  // - contract.movingFundsParameters(...)
  // - contract.pendingRedemptions(...)
  // - contract.redemptionParameters(...)
  // - contract.spentMainUTXOs(...)
  // - contract.timedOutRedemptions(...)
  // - contract.treasury(...)
  // - contract.txProofDifficultyFactor(...)
  // - contract.walletParameters(...)
  // - contract.wallets(...)
}

export function handleDepositRevealed(event: DepositRevealed): void {}

export function handleDepositsSwept(event: DepositsSwept): void {}

export function handleFraudChallengeDefeatTimedOut(
  event: FraudChallengeDefeatTimedOut
): void {}

export function handleFraudChallengeDefeated(
  event: FraudChallengeDefeated
): void {}

export function handleFraudChallengeSubmitted(
  event: FraudChallengeSubmitted
): void {}

export function handleFraudParametersUpdated(
  event: FraudParametersUpdated
): void {}

export function handleGovernanceTransferred(
  event: GovernanceTransferred
): void {}

export function handleInitialized(event: Initialized): void {}

export function handleMovedFundsSweepTimedOut(
  event: MovedFundsSweepTimedOut
): void {}

export function handleMovedFundsSwept(event: MovedFundsSwept): void {}

export function handleMovingFundsBelowDustReported(
  event: MovingFundsBelowDustReported
): void {}

export function handleMovingFundsCommitmentSubmitted(
  event: MovingFundsCommitmentSubmitted
): void {}

export function handleMovingFundsCompleted(event: MovingFundsCompleted): void {}

export function handleMovingFundsParametersUpdated(
  event: MovingFundsParametersUpdated
): void {}

export function handleMovingFundsTimedOut(event: MovingFundsTimedOut): void {}

export function handleMovingFundsTimeoutReset(
  event: MovingFundsTimeoutReset
): void {}

export function handleNewWalletRegistered(event: NewWalletRegistered): void {}

export function handleNewWalletRequested(event: NewWalletRequested): void {}

export function handleRedemptionParametersUpdated(
  event: RedemptionParametersUpdated
): void {}

export function handleRedemptionRequested(event: RedemptionRequested): void {}

export function handleRedemptionTimedOut(event: RedemptionTimedOut): void {}

export function handleRedemptionsCompleted(event: RedemptionsCompleted): void {}

export function handleSpvMaintainerStatusUpdated(
  event: SpvMaintainerStatusUpdated
): void {}

export function handleTreasuryUpdated(event: TreasuryUpdated): void {}

export function handleVaultStatusUpdated(event: VaultStatusUpdated): void {}

export function handleWalletClosed(event: WalletClosed): void {}

export function handleWalletClosing(event: WalletClosing): void {}

export function handleWalletMovingFunds(event: WalletMovingFunds): void {}

export function handleWalletParametersUpdated(
  event: WalletParametersUpdated
): void {}

export function handleWalletTerminated(event: WalletTerminated): void {}

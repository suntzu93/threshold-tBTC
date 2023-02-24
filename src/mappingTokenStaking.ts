import {Address, BigInt} from "@graphprotocol/graph-ts"
import {
    TokenStaking,
    ApplicationStatusChanged,
    AuthorizationCeilingSet,
    AuthorizationDecreaseApproved,
    AuthorizationDecreaseRequested,
    AuthorizationIncreased,
    AuthorizationInvoluntaryDecreased,
    DelegateChanged,
    DelegateVotesChanged,
    GovernanceTransferred,
    MinimumStakeAmountSet,
    NotificationRewardPushed,
    NotificationRewardSet,
    NotificationRewardWithdrawn,
    NotifierRewarded,
    OwnerRefreshed,
    PanicButtonSet,
    SlashingProcessed,
    StakeDiscrepancyPenaltySet,
    Staked,
    TokensSeized,
    ToppedUp,
    Unstaked
} from "../generated/TokenStaking/TokenStaking"


import {log, Bytes} from '@graphprotocol/graph-ts'
import {
    getOrCreateOperator, getOrCreateOperatorEvent,
    getStats
} from "./utils/helper"

import * as Const from "./utils/constants"
import * as Utils from "./utils/utils"

export function handleApplicationStatusChanged(
    event: ApplicationStatusChanged
): void {

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
    // - contract.applicationInfo(...)
    // - contract.applications(...)
    // - contract.approveAuthorizationDecrease(...)
    // - contract.authorizationCeiling(...)
    // - contract.authorizedStake(...)
    // - contract.checkpoints(...)
    // - contract.delegates(...)
    // - contract.getApplicationsLength(...)
    // - contract.getAvailableToAuthorize(...)
    // - contract.getMinStaked(...)
    // - contract.getPastTotalSupply(...)
    // - contract.getPastVotes(...)
    // - contract.getSlashingQueueLength(...)
    // - contract.getStartStakingTimestamp(...)
    // - contract.getVotes(...)
    // - contract.governance(...)
    // - contract.minTStakeAmount(...)
    // - contract.notificationReward(...)
    // - contract.notifiersTreasury(...)
    // - contract.numCheckpoints(...)
    // - contract.rolesOf(...)
    // - contract.slashingQueue(...)
    // - contract.slashingQueueIndex(...)
    // - contract.stakeDiscrepancyPenalty(...)
    // - contract.stakeDiscrepancyRewardMultiplier(...)
    // - contract.stakedNu(...)
    // - contract.stakes(...)
}

export function handleAuthorizationCeilingSet(
    event: AuthorizationCeilingSet
): void {
}

export function handleAuthorizationDecreaseApproved(
    event: AuthorizationDecreaseApproved
): void {
}

export function handleAuthorizationDecreaseRequested(
    event: AuthorizationDecreaseRequested
): void {
    let operator = getOrCreateOperator(event.params.stakingProvider);
    let eventType = "";
    let stats = getStats();
    if (event.params.application == Const.RANDOM_BEACON_ADDR) {
        operator.randomBeaconAuthorizedAmount = event.params.toAmount;
        stats.totalRandomBeaconAuthorizedAmount = stats.totalRandomBeaconAuthorizedAmount.minus(event.params.toAmount);
        //minimum to authorize is 40k
        if (event.params.toAmount.le(BigInt.fromI32(40000 * 10 ^ 18))) {
            operator.randomBeaconAuthorized = false;
        }
        eventType = "DECREASE_AUTHORIZED_RANDOM_BEACON"
    } else if (event.params.application == Const.TBTC_AUTH_ADDR) {
        operator.tBTCAuthorizedAmount = event.params.toAmount;
        stats.totalTBTCAuthorizedAmount = stats.totalTBTCAuthorizedAmount.minus(event.params.toAmount);
        //minimum to authorize is 40k
        if (event.params.toAmount.le(BigInt.fromI32(40000 * 10 ^ 18))) {
            operator.tBTCAuthorized = false;
        }
        eventType = "DECREASE_AUTHORIZED_TBTC"
    }

    stats.save()
    if (eventType.length > 0) {
        let eventEntity = getOrCreateOperatorEvent(event, eventType)
        eventEntity.amount = event.params.fromAmount.minus(event.params.toAmount)
        eventEntity.save()
        //Add event info into operator
        let events = operator.events
        events.push(eventEntity.id)
        operator.events = events
        operator.save();
    }

}

export function handleAuthorizationIncreased(
    event: AuthorizationIncreased
): void {
    let eventType = "";
    let operator = getOrCreateOperator(event.params.stakingProvider);
    let stats = getStats();
    if (event.params.application == Const.RANDOM_BEACON_ADDR) {
        operator.randomBeaconAuthorized = true;
        eventType = "AUTHORIZED_RANDOM_BEACON";
        operator.randomBeaconAuthorizedAmount = event.params.toAmount;
        stats.totalRandomBeaconAuthorizedAmount = stats.totalRandomBeaconAuthorizedAmount.plus(event.params.toAmount);
    } else if (event.params.application == Const.TBTC_AUTH_ADDR) {
        operator.tBTCAuthorized = true;
        eventType = "AUTHORIZED_TBTC";
        operator.tBTCAuthorizedAmount = event.params.toAmount;
        stats.totalTBTCAuthorizedAmount = stats.totalTBTCAuthorizedAmount.plus(event.params.toAmount);
    }
    stats.save()

    if (eventType.length > 0) {
        let eventEntity = getOrCreateOperatorEvent(event, eventType)
        eventEntity.amount = event.params.toAmount.minus(event.params.fromAmount)
        eventEntity.save()

        //Add event info into operator
        let events = operator.events
        events.push(eventEntity.id)
        operator.events = events
        operator.save();
    }

}

export function handleAuthorizationInvoluntaryDecreased(
    event: AuthorizationInvoluntaryDecreased
): void {
}

export function handleDelegateChanged(event: DelegateChanged): void {
}

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void {
}

export function handleGovernanceTransferred(
    event: GovernanceTransferred
): void {
}

export function handleMinimumStakeAmountSet(
    event: MinimumStakeAmountSet
): void {
}

export function handleNotificationRewardPushed(
    event: NotificationRewardPushed
): void {
}

export function handleNotificationRewardSet(
    event: NotificationRewardSet
): void {
}

export function handleNotificationRewardWithdrawn(
    event: NotificationRewardWithdrawn
): void {
}

export function handleNotifierRewarded(event: NotifierRewarded): void {
}

export function handleOwnerRefreshed(event: OwnerRefreshed): void {
    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.owner = event.params.newOwner
    operator.save()
}

export function handlePanicButtonSet(event: PanicButtonSet): void {
}

export function handleSlashingProcessed(event: SlashingProcessed): void {
}

export function handleStakeDiscrepancyPenaltySet(
    event: StakeDiscrepancyPenaltySet
): void {
}

export function handleStaked(event: Staked): void {
    let eventEntity = getOrCreateOperatorEvent(event, "STAKED")
    eventEntity.amount = event.params.amount
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.stakedAmount = event.params.amount
    operator.beneficiary = event.params.beneficiary
    operator.authorizer = event.params.authorizer
    operator.owner = event.params.owner
    operator.stakeType = event.params.stakeType
    operator.stakedAt = event.block.timestamp

    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events

    operator.save()
}

/**
 * Slashes
 * @param event
 */
export function handleTokensSeized(event: TokensSeized): void {
    let eventEntity = getOrCreateOperatorEvent(event, "SLASHED");
    eventEntity.amount = event.params.amount
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.stakedAmount = operator.stakedAmount.minus(event.params.amount)

    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events

    operator.save()
}

export function handleToppedUp(event: ToppedUp): void {
    let eventEntity = getOrCreateOperatorEvent(event, "TOPUP");
    eventEntity.amount = event.params.amount
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.stakedAmount = operator.stakedAmount.plus(event.params.amount)

    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events

    operator.save()
}

export function handleUnstaked(event: Unstaked): void {
    let eventEntity = getOrCreateOperatorEvent(event, "UNSTAKE");
    eventEntity.amount = event.params.amount
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.stakedAmount = operator.stakedAmount.minus(event.params.amount)

    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events

    operator.save()
}

import {
    SortitionPool,
    BetaOperatorsAdded as BetaOperatorsAddedEvent,
    ChaosnetDeactivated as ChaosnetDeactivatedEvent,
    ChaosnetOwnerRoleTransferred as ChaosnetOwnerRoleTransferredEvent,
    IneligibleForRewards as IneligibleForRewardsEvent,
    OwnershipTransferred as OwnershipTransferredEvent,
    RewardEligibilityRestored as RewardEligibilityRestoredEvent
} from "../generated/SortitionPool/SortitionPool"
import {} from "../generated/schema"
import * as Const from "./utils/constants"

import {
    getOrCreateOperator,
} from "./utils/helper"

export function handleBetaOperatorsAdded(event: BetaOperatorsAddedEvent): void {

}

export function handleChaosnetDeactivated(
    event: ChaosnetDeactivatedEvent
): void {

}

export function handleChaosnetOwnerRoleTransferred(
    event: ChaosnetOwnerRoleTransferredEvent
): void {

}

/*
Called when operator has misbehaved
 */
export function handleIneligibleForRewards(
    event: IneligibleForRewardsEvent
): void {
    let memberIds = event.params.ids;
    let sortitionContract = SortitionPool.bind(event.address);
    let memberAddresses = sortitionContract.getIDOperators(memberIds);
    for (let i = 0; i < memberAddresses.length; i++) {
        let operator = getOrCreateOperator(memberAddresses[i]);
        operator.availableReward = sortitionContract.getAvailableRewards(memberAddresses[i]);
        operator.misbehavedCount += 1;
        operator.poolRewardBanDuration = event.params.until;
        operator.save()
    }
}

export function handleOwnershipTransferred(
    event: OwnershipTransferredEvent
): void {

}

export function handleRewardEligibilityRestored(
    event: RewardEligibilityRestoredEvent
): void {
    let operator = getOrCreateOperator(event.params.operator);
    operator.poolRewardBanDuration = Const.ZERO_BI;
    operator.save()
}

import {Address, BigInt, log} from "@graphprotocol/graph-ts"
import {
    WalletRegistry,
    AuthorizationDecreaseRequested,
    AuthorizationIncreased,
    DkgMaliciousResultSlashed,
    DkgParametersUpdated,
    DkgResultApproved,
    DkgResultChallenged,
    DkgResultSubmitted,
    DkgSeedTimedOut,
    InactivityClaimed,
    OperatorJoinedSortitionPool,
    OperatorRegistered,
    RandomBeaconUpgraded,
    RewardsWithdrawn,
    WalletOwnerUpdated,
    WalletClosed,
    WalletCreated
} from "../generated/WalletRegistry/WalletRegistry"
import {SortitionPool} from "../generated/SortitionPool/SortitionPool";

import {
    getOrCreateOperator,
    getOrCreateOperatorEvent,
    getOrCreateRandomBeaconGroup,
    getStats,
    getStatus
} from "./utils/helper";
import * as Const from "./utils/constants";
import {GroupPublicKey, RandomBeaconGroup, RandomBeaconGroupMembership} from "../generated/schema";
import {getBeaconGroupId, keccak256TwoString} from "./utils/utils";
import {DkgStarted, DkgStateLocked, DkgTimedOut, RandomBeacon} from "../generated/RandomBeacon/RandomBeacon";

export function handleAuthorizationDecreaseRequested(
    event: AuthorizationDecreaseRequested
): void {
    let operator = getOrCreateOperator(event.params.stakingProvider);
    operator.tBTCAuthorizedAmount = event.params.toAmount;
    //minimum to authorize is 40k
    if (event.params.toAmount.le(BigInt.fromI32(40000 * 10 ^ 18))) {
        operator.tBTCAuthorized = false;
    }
    let eventEntity = getOrCreateOperatorEvent(event, "DECREASE_AUTHORIZED_TBTC")
    eventEntity.amount = event.params.fromAmount.minus(event.params.toAmount)
    eventEntity.isRandomBeaconEvent = false
    eventEntity.save()
    //Add event info into operator
    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save();

    let stats = getStats();
    stats.totalTBTCAuthorizedAmount = stats.totalTBTCAuthorizedAmount.minus(event.params.toAmount);
    stats.save()
}

export function handleAuthorizationIncreased(
    event: AuthorizationIncreased
): void {
    let eventEntity = getOrCreateOperatorEvent(event, "AUTHORIZED_TBTC")
    eventEntity.amount = event.params.toAmount.minus(event.params.fromAmount)
    eventEntity.isRandomBeaconEvent = false
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider);
    operator.tBTCAuthorized = true;
    operator.tBTCAuthorizedAmount = event.params.toAmount;
    //Add event info into operator
    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save();

    let stats = getStats();
    stats.totalTBTCAuthorizedAmount = stats.totalTBTCAuthorizedAmount.plus(event.params.toAmount);
    stats.save()
}

export function handleDkgMaliciousResultSlashed(
    event: DkgMaliciousResultSlashed
): void {
}


export function handleDkgResultChallenged(event: DkgResultChallenged): void {
    let status = getStatus();
    status.ecdsaState = "AWAITING_RESULT"
    status.challenger = event.params.challenger
    status.reason = event.params.reason
    status.save()
}

export function handleDkgResultApproved(event: DkgResultApproved): void {
    let status = getStatus();
    status.ecdsaState = "IDLE"
    status.save()
}

export function handleDkgTimedOut(event: DkgTimedOut): void {
    let status = getStatus();
    status.ecdsaState = "IDLE"
    status.save()
}

export function handleDkgResultSubmitted(event: DkgResultSubmitted): void {
    let group = getOrCreateRandomBeaconGroup(getBeaconGroupId(event.params.result.groupPubKey));
    if (group.createdAt == Const.ZERO_BI) {
        group.createdAt = event.block.timestamp
        group.createdAtBlock = event.block.number
    }

    let memberIds = event.params.result.members;

    let walletRegistry = WalletRegistry.bind(event.address)
    // Get Sortition contract
    let sortitionPoolAddr = walletRegistry.sortitionPool()

    // Bind sortition contract
    let sortitionPoolContract = SortitionPool.bind(sortitionPoolAddr)
    // Get list members address by member ids
    let members = sortitionPoolContract.getIDOperators(memberIds)

    let memberCounts: Map<string, i32> = new Map();
    let uniqueAddresses: string[] = [];
    for (let i = 0; i < members.length; i++) {
        let memberAddress = members[i].toHexString();
        if (!memberCounts.has(memberAddress)) {
            memberCounts.set(memberAddress, 1)
            uniqueAddresses.push(memberAddress);
        } else {
            memberCounts.set(memberAddress, memberCounts.get(memberAddress) + 1)
        }
    }

    for (let i = 0; i < uniqueAddresses.length; i++) {
        let memberAddress = uniqueAddresses[i];
        let membership = new RandomBeaconGroupMembership(keccak256TwoString(group.id, memberAddress));
        membership.group = group.id;
        membership.operator = memberAddress;
        membership.count = memberCounts.get(memberAddress);
        membership.groupCreatedAt = group.createdAt;
        membership.save()

        let operator = getOrCreateOperator(Address.fromString(memberAddress));
        operator.beaconGroupCount += 1;
        operator.save();
    }
    group.uniqueMemberCount = uniqueAddresses.length
    group.size = members.length;
    group.save()

    let groupPubKey = GroupPublicKey.load("ecdsa_" + event.transaction.hash.toHex());
    if (!groupPubKey) {
        groupPubKey = new GroupPublicKey("ecdsa_" + event.transaction.hash.toHex())
    }
    groupPubKey.group = group.id;
    groupPubKey.pubKey = event.params.result.groupPubKey;
    groupPubKey.save();

    let status = getStatus();
    status.ecdsaState = "CHALLENGE";
    status.save()
}

export function handleDkgSeedTimedOut(event: DkgSeedTimedOut): void {
    let status = getStatus();
    status.ecdsaState = "IDLE"
    status.save()
}

export function handleDkgStarted(event: DkgStarted): void {
    let status = getStatus();
    status.ecdsaState = "AWAITING_RESULT"
    status.save()
}

export function handleDkgStateLocked(event: DkgStateLocked): void {
    let status = getStatus();
    status.ecdsaState = "AWAITING_SEED"
    status.save()
}

export function handleInactivityClaimed(event: InactivityClaimed): void {

}

export function handleOperatorJoinedSortitionPool(
    event: OperatorJoinedSortitionPool
): void {
    let eventEntity = getOrCreateOperatorEvent(event, "JOINED_SORTITION_POOL");
    eventEntity.isRandomBeaconEvent = false;
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider);
    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save();
}

export function handleOperatorRegistered(event: OperatorRegistered): void {
    let operator = getOrCreateOperator(event.params.stakingProvider)
    if (operator.stakedAt != Const.ZERO_BI && operator.stakedAmount != Const.ZERO_BI) {
        let eventEntity = getOrCreateOperatorEvent(event, "REGISTERED_OPERATOR")
        eventEntity.isRandomBeaconEvent = false
        eventEntity.save()

        operator.address = event.params.operator
        operator.registeredOperatorAddress += 1
        let events = operator.events
        events.push(eventEntity.id)
        operator.events = events
        operator.save();
    }
}

export function handleRewardsWithdrawn(event: RewardsWithdrawn): void {
    let eventEntity = getOrCreateOperatorEvent(event, "WITHDRAW_REWARD")
    eventEntity.amount = event.params.amount
    eventEntity.isRandomBeaconEvent = false
    eventEntity.save()

    let randomContract = RandomBeacon.bind(event.address);
    let availableReward = randomContract.availableRewards(event.params.stakingProvider)

    let operator = getOrCreateOperator(event.params.stakingProvider);
    operator.rewardDispensed = operator.rewardDispensed.plus(event.params.amount);
    operator.availableReward = availableReward;

    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events

    operator.save();
}

export function handleWalletOwnerUpdated(event: WalletOwnerUpdated): void {
}

export function handleWalletClosed(event: WalletClosed): void {
}

export function handleWalletCreated(event: WalletCreated): void {
}


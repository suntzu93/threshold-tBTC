import {Address, BigInt, Bytes, ethereum} from "@graphprotocol/graph-ts"
import {
    RandomBeacon,
    DkgMaliciousResultSlashed,
    DkgMaliciousResultSlashingFailed,
    DkgResultApproved,
    DkgResultChallenged,
    DkgResultSubmitted,
    DkgSeedTimedOut,
    DkgStarted,
    DkgStateLocked,
    GovernanceTransferred,
    GroupRegistered,
    InactivityClaimed,
    OperatorJoinedSortitionPool,
    OperatorRegistered,
    RelayEntryDelaySlashed,
    RelayEntryRequested,
    RelayEntrySubmitted,
    RelayEntryTimedOut,
    RelayEntryTimeoutSlashed,
    RewardsWithdrawn,
    UnauthorizedSigningSlashed,
} from "../generated/RandomBeacon/RandomBeacon"

import {
    SortitionPool,
} from "../generated/SortitionPool/SortitionPool"
import {log} from '@graphprotocol/graph-ts'

import {RandomBeaconGroup, RelayEntry, GroupPublicKey, RandomBeaconGroupMembership} from "../generated/schema"

import {
    getOrCreateOperator,
    getStats,
    getOrCreateOperatorEvent,
    getStatus
} from "./utils/helper"

import * as Const from "./utils/constants"
import {getBeaconGroupId, keccak256TwoString} from "./utils/utils";

export function handleDkgMaliciousResultSlashed(
    event: DkgMaliciousResultSlashed
): void {
}

export function handleDkgMaliciousResultSlashingFailed(
    event: DkgMaliciousResultSlashingFailed
): void {
}

export function handleDkgResultApproved(event: DkgResultApproved): void {
}

export function handleDkgResultChallenged(event: DkgResultChallenged): void {
}

/**
 * Event: DkgResultSubmitted
 *
 * Emitted when submitDkgResult() is called. Complete the group creation process.
 */
export function handleDkgResultSubmitted(event: DkgResultSubmitted): void {
    log.warning("thanhlv2 handleDkgResultSubmitted " +
        "tx = {}, " +
        "resultHash = {}," +
        "seed = {} , " +
        "submitterMemberIndex = {} , " +
        "groupPubKey = {}, " +
        "misbehavedMembersIndices = {}," +
        "signatures={}," +
        "signingMembersIndices ={}," +
        "members={}," +
        "membersHash={}", [
        event.transaction.hash.toHexString(),
        event.params.resultHash.toHexString(),
        event.params.seed.toString(),
        event.params.result.submitterMemberIndex.toString(),
        event.params.result.groupPubKey.toHexString(),
        event.params.result.misbehavedMembersIndices.toString(),
        event.params.result.signatures.toHexString(),
        event.params.result.signingMembersIndices.toString(),
        event.params.result.members.toString(),
        event.params.result.membersHash.toHexString()
    ])

    let group = RandomBeaconGroup.load(getBeaconGroupId(event.params.result.groupPubKey))!;

    let memberIds = event.params.result.members;

    let randomBeaconContract = RandomBeacon.bind(event.address)
    // Get Sortition contract
    let sortitionPoolAddr = randomBeaconContract.sortitionPool()
    // Bind sortition contract
    let sortitionPoolContract = SortitionPool.bind(sortitionPoolAddr)
    // Get list members address by member ids
    let members = sortitionPoolContract.getIDOperators(memberIds)

    let memberCounts: Map<string, i32> = new Map();
    let uniqueAddresses: string[] = []; // Map does not allow us to list entries?
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
}

export function handleDkgSeedTimedOut(event: DkgSeedTimedOut): void {
}

export function handleDkgStarted(event: DkgStarted): void {
}

export function handleDkgStateLocked(event: DkgStateLocked): void {
}


export function handleGovernanceTransferred(
    event: GovernanceTransferred
): void {
}

export function handleGroupRegistered(event: GroupRegistered): void {
    log.warning("thanhlv2 handleGroupRegistered " +
        "tx = {}, " +
        "groupId = {}," +
        "publicKey = {}", [
        event.transaction.hash.toHexString(),
        event.params.groupId.toString(),
        event.params.groupPubKey.toHex()
    ])
    let group = new RandomBeaconGroup(getBeaconGroupId(event.params.groupPubKey));
    group.createdAt = event.block.timestamp
    group.totalSlashedAmount = Const.ZERO_BI;
    group.size = 0
    group.uniqueMemberCount = 0
    group.save()

    let groupId = event.params.groupId.toString()
    let groupPubKey = GroupPublicKey.load(groupId)
    if (!groupPubKey) {
        groupPubKey = new GroupPublicKey(groupId)
    }
    groupPubKey.group = group.id;
    groupPubKey.terminated = false
    groupPubKey.pubKey = event.params.groupPubKey
    groupPubKey.save()
}

export function handleInactivityClaimed(event: InactivityClaimed): void {
}


export function handleOperatorJoinedSortitionPool(
    event: OperatorJoinedSortitionPool
): void {
    let eventEntity = getOrCreateOperatorEvent(event, "JOINED_SORTITION_POOL");
    eventEntity.save()
    let operator = getOrCreateOperator(event.params.stakingProvider);
    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save();
}

/**
 * stakingProvider = msg.owner
 * source : https://github.com/keep-network/keep-core/blob/b95b8f487e5474659efb8f85e567a6f06a7f0c80/solidity/random-beacon/contracts/libraries/BeaconAuthorization.sol
 *
 * This is confusing, if one wallet staking with another stakingProvider
 * then stakingProvider != msg.owner does.
 *
 * @param event
 */
export function handleOperatorRegistered(event: OperatorRegistered): void {
    let operator = getOrCreateOperator(event.params.stakingProvider)
    if (operator.stakedAt != Const.ZERO_BI && operator.stakedAmount != Const.ZERO_BI){
        let eventEntity = getOrCreateOperatorEvent(event, "REGISTERED_OPERATOR")
        eventEntity.save()

        operator.address = event.params.operator
        operator.isRegisteredOperatorAddress = true
        let events = operator.events
        events.push(eventEntity.id)
        operator.events = events
        operator.save();
    }
}


export function handleRelayEntryRequested(event: RelayEntryRequested): void {
    log.warning("thanhlv2 handleRelayEntryRequested tx = {}, requestId = {},groupId = {} , previousEntry={}", [
        event.transaction.hash.toHexString(),
        event.params.requestId.toString(),
        event.params.groupId.toString(),
        event.params.previousEntry.toHexString(),
    ])
    let groupPubKey = GroupPublicKey.load(event.params.groupId.toString())!
    let pubKey = groupPubKey.pubKey
    let entry = new RelayEntry(event.params.requestId.toString());
    entry.requestedAt = event.block.timestamp;
    entry.requestedBy = event.transaction.from;
    entry.group = getBeaconGroupId(pubKey)
    entry.save();

}

export function handleRelayEntrySubmitted(event: RelayEntrySubmitted): void {
    log.warning("thanhlv2 handleRelayEntrySubmitted tx = {}, requestId = {},submitter = {} , entry={}", [
        event.transaction.hash.toHexString(),
        event.params.requestId.toString(),
        event.params.submitter.toString(),
        event.params.entry.toHexString(),
    ])
    // let status = getStatus();
    let entry = RelayEntry.load(event.params.requestId.toString())!;
    entry.value = event.params.entry;
    entry.submittedAt = event.block.timestamp;
    entry.save();

    let randomContract = RandomBeacon.bind(event.address);
    let group = RandomBeaconGroup.load(entry.group)!;
    let memberships = group.memberships;
    for (let i = 0; i < memberships.length; i++) {
        let membership = RandomBeaconGroupMembership.load(memberships[i])!;
        let availableReward = randomContract.availableRewards(Address.fromString(membership.operator))
        let operator = getOrCreateOperator(Address.fromString(membership.operator));
        operator.availableReward = availableReward;
        operator.save();
    }

}

export function handleRelayEntryTimedOut(event: RelayEntryTimedOut): void {
    log.warning("thanhlv2 handleRelayEntryTimedOut tx = {}, requestId = {},terminatedGroupId = {} ", [
        event.transaction.hash.toHexString(),
        event.params.requestId.toString(),
        event.params.terminatedGroupId.toString()
    ])

    let groupPubKey = GroupPublicKey.load(event.params.terminatedGroupId.toString())
    if (groupPubKey) {
        groupPubKey.terminated = true;
        groupPubKey.save()
    }
}

function slashOperators(groupMembers: Array<Address>, amount: BigInt, event: ethereum.Event,): void {
    for (let i = 0; i < groupMembers.length; i++) {
        let eventEntity = getOrCreateOperatorEvent(event, "SLASHED")
        eventEntity.amount = amount
        eventEntity.save()

        let member = groupMembers[i];
        let operator = getOrCreateOperator(member);
        operator.misbehavedCount += 1;
        operator.totalSlashedAmount = operator.totalSlashedAmount.plus(amount);

        let events = operator.events
        events.push(eventEntity.id)
        operator.events = events

        operator.save()
    }
}

export function handleRelayEntryTimeoutSlashed(
    event: RelayEntryTimeoutSlashed
): void {
    slashOperators(event.params.groupMembers, event.params.slashingAmount, event);
}


export function handleRelayEntryDelaySlashed(
    event: RelayEntryDelaySlashed
): void {
    slashOperators(event.params.groupMembers, event.params.slashingAmount, event);
}

export function handleUnauthorizedSigningSlashed(
    event: UnauthorizedSigningSlashed
): void {
    let groupId = event.params.groupId;
    let slashingAmount = event.params.unauthorizedSigningSlashingAmount;

    let groupPubKey = GroupPublicKey.load(groupId.toString())!
    let group = RandomBeaconGroup.load(getBeaconGroupId(groupPubKey.pubKey))!;
    group.misbehavedCount += 1;
    group.totalSlashedAmount = group.totalSlashedAmount.plus(slashingAmount);
    group.save()

    slashOperators(event.params.groupMembers, slashingAmount, event);
}

export function handleRewardsWithdrawn(event: RewardsWithdrawn): void {
    let eventEntity = getOrCreateOperatorEvent(event, "WITHDRAW_REWARD")
    eventEntity.amount = event.params.amount
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




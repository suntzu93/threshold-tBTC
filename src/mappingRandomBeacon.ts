import {Address, BigInt, Bytes} from "@graphprotocol/graph-ts"
import {
    RandomBeacon,
    AuthorizationDecreaseApproved,
    AuthorizationDecreaseRequested,
    AuthorizationIncreased,
    AuthorizationParametersUpdated,
    CallbackFailed,
    DkgMaliciousResultSlashed,
    DkgMaliciousResultSlashingFailed,
    DkgResultApproved,
    DkgResultChallenged,
    DkgResultSubmitted,
    DkgSeedTimedOut,
    DkgStarted,
    DkgStateLocked,
    DkgTimedOut,
    GasParametersUpdated,
    GovernanceTransferred,
    GroupCreationParametersUpdated,
    GroupRegistered,
    InactivityClaimed,
    InvoluntaryAuthorizationDecreaseFailed,
    OperatorJoinedSortitionPool,
    OperatorRegistered,
    OperatorStatusUpdated,
    ReimbursementPoolUpdated,
    RelayEntryDelaySlashed,
    RelayEntryDelaySlashingFailed,
    RelayEntryParametersUpdated,
    RelayEntryRequested,
    RelayEntrySubmitted,
    RelayEntryTimedOut,
    RelayEntryTimeoutSlashed,
    RelayEntryTimeoutSlashingFailed,
    RequesterAuthorizationUpdated,
    RewardParametersUpdated,
    RewardsWithdrawn,
    SlashingParametersUpdated,
    UnauthorizedSigningSlashed,
    UnauthorizedSigningSlashingFailed
} from "../generated/RandomBeacon/RandomBeacon"

import {
    SortitionPool,
} from "../generated/SortitionPool/SortitionPool"
import {log} from '@graphprotocol/graph-ts'

import {RandomBeaconGroup, RelayEntry, GroupPublicKey} from "../generated/schema"

import {
    getOrCreateOperator,
    getStats,
    getOrCreateOperatorEvent,
    getStatus
} from "./utils/helper"

import * as Const from "./utils/constants"
import {getBeaconGroupId, getIDFromEvent} from "./utils/utils";

export function handleAuthorizationDecreaseApproved(
    event: AuthorizationDecreaseApproved
): void {
}

/**
 * Called when staker unstake part of amount staked
 * @param event
 */
export function handleAuthorizationDecreaseRequested(
    event: AuthorizationDecreaseRequested
): void {
}

/**
 * Called when staker topup more token
 * @param event
 */
export function handleAuthorizationIncreased(
    event: AuthorizationIncreased
): void {
}

export function handleAuthorizationParametersUpdated(
    event: AuthorizationParametersUpdated
): void {
}

export function handleCallbackFailed(event: CallbackFailed): void {
}

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

    let group = new RandomBeaconGroup(getBeaconGroupId(event.params.result.groupPubKey));
    group.createdAt = event.block.timestamp
    group.pubKey = event.params.result.groupPubKey
    group.rewardPerMember = Const.ZERO_BI

    let memberIds = event.params.result.members;

    let randomBeaconContract = RandomBeacon.bind(event.address)
    // Get Sortition contract
    let sortitionPoolAddr = randomBeaconContract.sortitionPool()
    // Bind sortition contract
    let sortitionPoolContract = SortitionPool.bind(sortitionPoolAddr)
    // Get list members address by member ids
    let members = sortitionPoolContract.getIDOperators(memberIds)

    //TODO: not sure we need this code , have to check when we have data
    let uniqueAddresses: string[] = [];
    for (let i = 0; i < members.length; i++) {
        let memberAddress = members[i].toHexString();
        if (!uniqueAddresses.includes(memberAddress)) {
            uniqueAddresses.push(memberAddress);
        }
    }

    for (let i = 0; i < uniqueAddresses.length; i++) {
        let memberAddress = uniqueAddresses[i];

        let operator = getOrCreateOperator(Address.fromString(memberAddress));
        operator.beaconGroupCount += 1;
        let groups = operator.groups
        groups.push(group.id)
        operator.groups = groups

        operator.save();
    }

    group.size = members.length;
    group.uniqueMemberCount = uniqueAddresses.length;
    group.save()
}

export function handleDkgSeedTimedOut(event: DkgSeedTimedOut): void {
}

export function handleDkgStarted(event: DkgStarted): void {
}

export function handleDkgStateLocked(event: DkgStateLocked): void {
}

export function handleDkgTimedOut(event: DkgTimedOut): void {
}

export function handleGasParametersUpdated(event: GasParametersUpdated): void {
}

export function handleGovernanceTransferred(
    event: GovernanceTransferred
): void {
}

export function handleGroupCreationParametersUpdated(
    event: GroupCreationParametersUpdated
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
    let groupId = event.params.groupId.toString()
    let groupPubKey = GroupPublicKey.load(groupId)
    if (!groupPubKey) {
        groupPubKey = new GroupPublicKey(groupId)
    }
    groupPubKey.terminated = false
    groupPubKey.pubKey = event.params.groupPubKey
    groupPubKey.save()
}

export function handleInactivityClaimed(event: InactivityClaimed): void {
}

export function handleInvoluntaryAuthorizationDecreaseFailed(
    event: InvoluntaryAuthorizationDecreaseFailed
): void {
}

export function handleOperatorJoinedSortitionPool(
    event: OperatorJoinedSortitionPool
): void {
    log.warning("thanhlv2 handleOperatorJoinedSortitionPool " +
        "tx = {}, " +
        "stakingProvider = {}," +
        "operator = {}", [
        event.transaction.hash.toHexString(),
        event.params.stakingProvider.toHex(),
        event.params.operator.toHex()
    ])

    let eventEntity = getOrCreateOperatorEvent(event, "JOINED_SORTITION_POOL");
    eventEntity.save()
    let operator = getOrCreateOperator(event.params.stakingProvider);
    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save();
}

export function handleOperatorRegistered(event: OperatorRegistered): void {
    log.warning("thanhlv2 handleOperatorRegistered " +
        "tx = {}, " +
        "stakingProvider = {}," +
        "operator = {}", [
        event.transaction.hash.toHexString(),
        event.params.stakingProvider.toHex(),
        event.params.operator.toHex()
    ])

    let eventEntity = getOrCreateOperatorEvent(event, "REGISTERED_OPERATOR")
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.address = event.params.operator
    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save();
}

export function handleOperatorStatusUpdated(
    event: OperatorStatusUpdated
): void {
    log.warning("thanhlv2 OperatorStatusUpdated " +
        "tx = {}, " +
        "stakingProvider = {}," +
        "operator = {}", [
        event.transaction.hash.toHexString(),
        event.params.stakingProvider.toHex(),
        event.params.operator.toHex()
    ])
}

export function handleReimbursementPoolUpdated(
    event: ReimbursementPoolUpdated
): void {
}

export function handleRelayEntryDelaySlashed(
    event: RelayEntryDelaySlashed
): void {
}

export function handleRelayEntryDelaySlashingFailed(
    event: RelayEntryDelaySlashingFailed
): void {
}

export function handleRelayEntryParametersUpdated(
    event: RelayEntryParametersUpdated
): void {
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
    let entry = new RelayEntry(getIDFromEvent(event));
    entry.requestedAt = event.block.timestamp;
    entry.generatedAt = event.block.timestamp;
    entry.requestedBy = event.transaction.from;
    entry.group = getBeaconGroupId(pubKey)
    entry.requestId = event.params.requestId;
    entry.groupId = event.params.groupId;
    entry.previousEntry = event.params.previousEntry;
    entry.save();

    let status = getStatus();
    status.currentRequestedRelayEntry = entry.id;
    status.save();

}

export function handleRelayEntrySubmitted(event: RelayEntrySubmitted): void {
    log.warning("thanhlv2 handleRelayEntrySubmitted tx = {}, requestId = {},submitter = {} , entry={}", [
        event.transaction.hash.toHexString(),
        event.params.requestId.toString(),
        event.params.submitter.toString(),
        event.params.entry.toHexString(),
    ])
    let status = getStatus();
    let entry = RelayEntry.load(status.currentRequestedRelayEntry!)!;
    let group = RandomBeaconGroup.load(entry.group)!;

    let randomContract = RandomBeacon.bind(event.address);
    let operators = group.operators;
    for (let i = 0; i < operators.length; i++) {
        let operatorAdd = operators[i];
        let availableReward = randomContract.availableRewards(Address.fromString(operatorAdd))
        let operator = getOrCreateOperator(Address.fromString(operatorAdd));
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

export function handleRelayEntryTimeoutSlashed(
    event: RelayEntryTimeoutSlashed
): void {
}

export function handleRelayEntryTimeoutSlashingFailed(
    event: RelayEntryTimeoutSlashingFailed
): void {
}

export function handleRequesterAuthorizationUpdated(
    event: RequesterAuthorizationUpdated
): void {
}

export function handleRewardParametersUpdated(
    event: RewardParametersUpdated
): void {
}

export function handleRewardsWithdrawn(event: RewardsWithdrawn): void {
    let operator = getOrCreateOperator(event.params.stakingProvider);
    operator.rewardDispensed = operator.rewardDispensed.plus(event.params.amount);
    operator.save();
}

export function handleSlashingParametersUpdated(
    event: SlashingParametersUpdated
): void {
}

export function handleUnauthorizedSigningSlashed(
    event: UnauthorizedSigningSlashed
): void {
}

export function handleUnauthorizedSigningSlashingFailed(
    event: UnauthorizedSigningSlashingFailed
): void {
}

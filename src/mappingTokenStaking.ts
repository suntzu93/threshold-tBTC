import {BigInt} from "@graphprotocol/graph-ts"
import {
    AuthorizationDecreaseRequested,
    AuthorizationIncreased,
    OwnerRefreshed,
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

export function handleAuthorizationDecreaseRequested(
    event: AuthorizationDecreaseRequested
): void {

}

export function handleAuthorizationIncreased(
    event: AuthorizationIncreased
): void {
}

export function handleOwnerRefreshed(event: OwnerRefreshed): void {
    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.owner = event.params.newOwner
    operator.save()
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

    let stats = getStats()
    stats.totalStaked = stats.totalStaked.plus(event.params.amount)
    stats.numOperators += 1
    stats.save()
}

/**
 * Slashes
 * @param event
 */
export function handleTokensSeized(event: TokensSeized): void {
    let eventEntity = getOrCreateOperatorEvent(event, "SLASHED")
    eventEntity.amount = event.params.amount
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.stakedAmount = operator.stakedAmount.minus(event.params.amount)

    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events

    operator.save()

    let stats = getStats()
    stats.totalStaked = stats.totalStaked.minus(event.params.amount)
    stats.save()
}

export function handleToppedUp(event: ToppedUp): void {
    let eventEntity = getOrCreateOperatorEvent(event, "TOPUP")
    eventEntity.amount = event.params.amount
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.stakedAmount = operator.stakedAmount.plus(event.params.amount)

    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save()

    let stats = getStats()
    stats.totalStaked = stats.totalStaked.plus(event.params.amount)
    stats.save()
}

export function handleUnstaked(event: Unstaked): void {
    let eventEntity = getOrCreateOperatorEvent(event, "UNSTAKE")
    eventEntity.amount = event.params.amount
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.stakedAmount = operator.stakedAmount.minus(event.params.amount)

    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save()

    let stats = getStats()
    stats.totalStaked = stats.totalStaked.minus(event.params.amount)
    stats.save()
}

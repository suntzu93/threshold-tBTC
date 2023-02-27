import {
    OperatorBonded,
    OperatorConfirmed
} from "../generated/SimplePREApplication/SimplePREApplication"
import {
    getOrCreateOperator, getOrCreateOperatorEvent,
} from "./utils/helper"

/**
 * Registered operator for staking provider on old version
 * new version will use OperatorRegistered in RandomBeacon contract.
 * @param event
 */
export function handleOperatorBonded(event: OperatorBonded): void {
    let eventEntity = getOrCreateOperatorEvent(event, "BOND_OPERATOR")
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    operator.address = event.params.operator
    operator.registeredOperatorAddress = 2
    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save();
}

export function handleOperatorConfirmed(event: OperatorConfirmed): void {
}

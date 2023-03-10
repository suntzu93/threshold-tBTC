import {
    OperatorBonded,
    OperatorConfirmed
} from "../generated/SimplePREApplication/SimplePREApplication"
import {
    getOrCreateOperator, getOrCreateOperatorEvent, getStats,
} from "./utils/helper"
import * as constants from "./utils/constants"
import {Address} from "@graphprotocol/graph-ts"

/**
 * Registered operator for staking provider on old version
 * new version will use OperatorRegistered in RandomBeacon contract.
 * @param event
 */
export function handleOperatorBonded(event: OperatorBonded): void {
    let eventEntity = getOrCreateOperatorEvent(event, "BOND_OPERATOR")
    eventEntity.save()

    let operator = getOrCreateOperator(event.params.stakingProvider)
    if (operator.address.toHex() == constants.ADDRESS_ZERO.toHex()){
        operator.address = event.params.operator
    }
    if (operator.registeredOperatorAddress < 2 && !operator.isBondRegisteredOperatorAddress){
        operator.registeredOperatorAddress = 2
        operator.isBondRegisteredOperatorAddress = true

        let stats = getStats()
        stats.numOperatorsRegisteredNode += 1
        stats.save()
    }
    let events = operator.events
    events.push(eventEntity.id)
    operator.events = events
    operator.save()
}

export function handleOperatorConfirmed(event: OperatorConfirmed): void {
}

import {
    TBTC,
    Transfer
} from "../generated/TBTC/TBTC"

import * as Const from "./utils/constants";
import {
    getOrCreateTbtcToken,
    getOrCreateUser
} from "./utils/helper";

export function handleTransfer(event: Transfer): void {
    let tBtcToken = getOrCreateTbtcToken();
    let fromHolder = getOrCreateUser(event.params.from);
    let toHolder = getOrCreateUser(event.params.to);

    let contract = TBTC.bind(event.address)
    tBtcToken.totalSupply = contract.totalSupply();

    if (event.params.from.toHexString() == Const.ADDRESS_ZERO.toHexString()) {
        //Increase total Mint
        tBtcToken.totalMint = tBtcToken.totalMint.plus(event.params.value);
    } else {
        let fromHolderPreviousBalance = fromHolder.tokenBalance;
        fromHolder.tokenBalance = fromHolder.tokenBalance.minus(event.params.value);
        fromHolder.tbtcToken = tBtcToken.id;

        if (fromHolder.tokenBalance == Const.ZERO_BI && fromHolderPreviousBalance > Const.ZERO_BI) {
            tBtcToken.currentTokenHolders = tBtcToken.currentTokenHolders.minus(Const.ONE_BI);
        } else if (fromHolder.tokenBalance > Const.ZERO_BI && fromHolderPreviousBalance == Const.ZERO_BI) {
            tBtcToken.currentTokenHolders = tBtcToken.currentTokenHolders.plus(Const.ONE_BI);
        }
        fromHolder.save();
    }

    if (event.params.to.toHexString() == Const.ADDRESS_ZERO.toHexString()) {
        //Increase total Burn
        tBtcToken.totalBurn = tBtcToken.totalBurn.plus(event.params.value);
    } else {
        let toHolderPreviousBalance = toHolder.tokenBalance;
        toHolder.tokenBalance = toHolder.tokenBalance.plus(event.params.value);
        toHolder.totalTokensHeld = toHolder.totalTokensHeld.plus(event.params.value);
        toHolder.tbtcToken = tBtcToken.id;

        if (toHolder.tokenBalance == Const.ZERO_BI && toHolderPreviousBalance > Const.ZERO_BI) {
            tBtcToken.currentTokenHolders = tBtcToken.currentTokenHolders.minus(Const.ONE_BI);
        } else if (toHolder.tokenBalance > Const.ZERO_BI && toHolderPreviousBalance == Const.ZERO_BI) {
            tBtcToken.currentTokenHolders = tBtcToken.currentTokenHolders.plus(Const.ONE_BI);
        }
        toHolder.save();
    }
    tBtcToken.save()

}

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
    if (event.params.from.toHex() == Const.ADDRESS_ZERO.toHex()) {
        //Using to address to check if transaction use TBTCVault or Vending Machine
        let toAddress = event.transaction.to;
        if (toAddress) {
            if (toAddress.toHex() == Const.TBTCVault.toHex()) {
                //Increase total Mint by TBTCVault
                tBtcToken.totalMint = tBtcToken.totalMint.plus(event.params.value);
            }
        }
        let contract = TBTC.bind(event.address)
        tBtcToken.totalSupply = contract.totalSupply();
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

    if (event.params.to.toHex() == Const.ADDRESS_ZERO.toHex()) {
        //Using to address to check if transaction use TBTCVault or Vending Machine
        let toAddress = event.transaction.to;
        if (toAddress) {
            if (toAddress.toHex() == Const.TBTCVault.toHex()) {
                //Increase total burn by TBTCVault (v2)
                tBtcToken.totalBurn = tBtcToken.totalBurn.plus(event.params.value);
            }
        }
        let contract = TBTC.bind(event.address)
        tBtcToken.totalSupply = contract.totalSupply();
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

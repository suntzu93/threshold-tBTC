import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';
import {Deposit, Redemption, Transaction, User, TBTCToken} from "../../generated/schema"
import * as constants from "./constants"
import {ADDRESS_TBTC} from "./constants";


export function getOrCreateTransaction(id: Bytes): Transaction {
    let transaction = Transaction.load(id);
    if (transaction == null) {
        transaction = new Transaction(id);
        transaction.id = id;
    }
    return transaction as Transaction;
}

export function getOrCreateUser(id: Bytes): User {
    let user = User.load(id);
    if (!user) {
        user = new User(id)
        user.mintingDebt = constants.ZERO_BI
        user.tokenBalance = constants.ZERO_BI;
        user.totalTokensHeld = constants.ZERO_BI;
        user.tbtcToken = getOrCreateTbtcToken().id;
    }
    return user;
}

export function getOrCreateDeposit(id: Bytes): Deposit {
    let deposit = Deposit.load(id);
    if (!deposit) {
        deposit = new Deposit(id)
        deposit.status = "REVEALED"
        deposit.amount = constants.ZERO_BI
        deposit.transactions = []
        deposit.treasuryFee = constants.ZERO_BI
        deposit.actualAmountReceived = constants.ZERO_BI
        deposit.newDebt = constants.ZERO_BI
    }
    return deposit;
}


export function getOrCreateRedemption(id: Bytes): Redemption {
    let redemption = Redemption.load(id);
    if (!redemption) {
        redemption = new Redemption(id)
        redemption.status = "REQUESTED"
        redemption.amount = constants.ZERO_BI
        redemption.transactions = []
    }
    return redemption;
}


export function getOrCreateTbtcToken(): TBTCToken {
    let tBtcToken = TBTCToken.load("TBTCToken");

    if (tBtcToken == null) {
        tBtcToken = new TBTCToken("TBTCToken");
        tBtcToken.decimals = 18;
        tBtcToken.name = "tBTC v2";
        tBtcToken.symbol = "tBTC";
        tBtcToken.totalSupply = constants.ZERO_BI;
        tBtcToken.totalMint = constants.ZERO_BI;
        tBtcToken.totalBurn = constants.ZERO_BI;
        tBtcToken.address = constants.ADDRESS_TBTC;
        tBtcToken.currentTokenHolders = constants.ZERO_BI;
    }

    return tBtcToken as TBTCToken;
}
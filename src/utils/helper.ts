import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {
    Deposit,
    Redemption,
    Transaction,
    Event,
    User,
    TBTCToken,
    Operator,
    StatsRecord,
    StatusRecord
} from "../../generated/schema"
import * as constants from "./constants"
import {ADDRESS_TBTC, ADDRESS_ZERO} from "./constants";


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

    if (!tBtcToken) {
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

export function getOrCreateOperatorEvent(event: ethereum.Event, status: string): Event {
    let eventEntity = Event.load(event.transaction.hash.toHex());
    if (!eventEntity) {
        eventEntity = new Event(event.transaction.hash.toHex());
        eventEntity.from = event.transaction.from;
        eventEntity.to = event.transaction.to;
        eventEntity.timestamp = event.block.timestamp;
        eventEntity.event = status;
        eventEntity.amount = constants.ZERO_BI;
    }
    return eventEntity as Event;
}

export function getStats(): StatsRecord {
    let stats = StatsRecord.load("current");
    if (stats == null) {
        stats = new StatsRecord("current")
        stats.numOperators = 0;
        stats.totalTBTCAuthorizedAmount = constants.ZERO_BI;
        stats.totalRandomBeaconAuthorizedAmount = constants.ZERO_BI;
    }
    return stats as StatsRecord;
}

export function getStatus(): StatusRecord {
    let stats = StatusRecord.load("current");
    if (stats == null) {
        stats = new StatusRecord("current")
        stats.currentRequestedRelayEntry = null;
    }
    return stats as StatusRecord;
}

export function getOrCreateOperator(address: Address): Operator {
    let operator = Operator.load(address.toHexString());
    if (!operator) {
        operator = new Operator(address.toHexString());
        operator.address = constants.ADDRESS_ZERO;
        operator.stakedAt = constants.ZERO_BI;
        operator.stakeType = 0;
        operator.randomBeaconAuthorized = false;
        operator.tBTCAuthorized = false;
        operator.tBTCAuthorizedAmount = constants.ZERO_BI;
        operator.randomBeaconAuthorizedAmount = constants.ZERO_BI;
        operator.stakedAmount = constants.ZERO_BI;
        operator.availableReward = constants.ZERO_BI;
        operator.totalBeaconRewards = constants.ZERO_BI;
        operator.misbehavedCount = 0;
        operator.poolRewardBanDuration = constants.ZERO_BI;
        operator.totalBeaconRewards = constants.ZERO_BI;
        operator.beaconGroupCount = 0;
        operator.events = [];
        operator.groups = [];
    }
    return operator as Operator;
}
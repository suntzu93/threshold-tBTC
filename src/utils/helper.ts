import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { Deposit, Redemption, Transaction ,User} from "../../generated/schema"
import * as constants from "./constants"

// export enum DepositStatus {
//     REVEALED = "REVEALED",
//     SWEPT = "SWEPT",
//     REFUNDED = "REFUNDED"
// }

// export enum RedemptionStatus {
//     REQUESTED = "REQUESTED",
//     COMPLETED = "COMPLETED",
//     TIMEDOUT = "TIMEDOUT"
// }

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
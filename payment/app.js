const eventHandler = require('eventHandler');
const dynamoHandler = require('dynamoHandler');

const { 
    v4: uuidv4,
} = require('uuid');

const EVENT_SOURCE="Payment";
const EVENT_BUS = process.env.EVENT_BUS;
const PAYMENT_TABLE = process.env.PAYMENT_TABLE;
const PAYMENT_FAIL_PROBABILITY = process.env.PAYMENT_FAIL_PROBABILITY; // Between 0 and 1

exports.lambdaHandler = async (event, context) => {

    const eventType = event['detail-type'];

    if (eventType !== undefined) {

        // EventBridge Invocation
        const order = event.detail;

        switch(eventType) {
            case 'DeliveryEstimated':
                const totalPrice = order.item.price + order.delivery.price;
                await eventHandler.processResult(await makePayment(totalPrice),
                    'PaymentMade', 'PaymentFailed', order, 'payment', EVENT_BUS, EVENT_SOURCE);
                break;
            case 'ItemReturned':
                await eventHandler.processResult(await cancelPayment(order.order.paymentId),
                    'PaymentCanceled', 'ErrorPaymentCanceled', order, 'payment', EVENT_BUS, EVENT_SOURCE);
                break;
            default:
                console.error(`Event '${eventType}' not implemented.`);
            }
    }
};

function shouldPaymentFail() {
    return Math.random() < PAYMENT_FAIL_PROBABILITY;
}

async function makePayment(amount) {

    const paymentId = uuidv4();
    const failed = shouldPaymentFail();
    const status = failed ? 'FAILED' : "PAID";

    const payment =
        `{'paymentId' : '${paymentId}', 'paymentMethod' : 'CREDIT_CARD',
        'amount' : ${amount}, 'status' : '${status}'}`;

    const params = {
        Statement: `INSERT INTO "${PAYMENT_TABLE}" VALUE ${payment}`
    }
    await dynamoHandler.executeStatement(params);

    return [{
        paymentId: paymentId,
        paymentMethod: 'CREDIT_CARD',
        amount: amount,
        status: status
    }]
}

async function cancelPayment(paymentId) {

    const params = {
        Statement: `UPDATE "${PAYMENT_TABLE}"
        SET status = 'CANCELED'
        WHERE paymentId = '${paymentId}'
        AND status = 'PAID'
        RETURNING ALL NEW *`
    }
    const payments = await dynamoHandler.executeStatement(params);

    console.log(payments);

    return payments;
}
const eventHandler = require('eventHandler');
const dynamoHandler = require('dynamoHandler');

const { v4: uuidv4 } = require('uuid');

const EVENT_SOURCE="Order";
const EVENT_BUS = process.env.EVENT_BUS;
const ORDER_TABLE = process.env.ORDER_TABLE;

exports.lambdaHandler = async (event, context) => {
    let result;

    const eventType = event['detail-type'];

    if (eventType !== undefined) {

        // EventBridge Invocation
        const order = event.detail;

        switch(eventType) {
            case 'CreateOrder':
                await createOrder(order.customerId, order.itemId);
                break;
            case 'DeliveryWasDelivered':
                await eventHandler.processResult(await updateOrder('DELIVERED', order),
                    'OrderDelivered', 'ErrorOrderDelivered', order, undefined, EVENT_BUS, EVENT_SOURCE);
                break;
            case 'DeliveryWasCanceled':
                await eventHandler.processResult(await updateOrder('DELIVERY_CANCELED', order),
                    'OrderCanceled', 'ErrorOrderCanceled', order, 'order', EVENT_BUS, EVENT_SOURCE);
                break;
            case 'PaymentMade':
                await storeOrder('PAID', order);
                break;
            case 'PaymentFailed':
                await storeOrder('PAYMENT_FAILED', order);
                break;
            case 'PaymentCanceled':
                await updateOrder('PAYMENT_CANCELED', order);
                break;
            case 'DeliveryStarted':
                await updateOrder('DELIVERING', order);
                break;
            default:
                console.error(`Event '${eventType}' not implemented.`);
        }
    } else {

        // API Gateway Invocation
        const method = event.requestContext.http.method;
        const action = event.pathParameters.action;
        const customerId = event.pathParameters.customerId;
        const what = event.pathParameters.what;
    
        switch(method) {
            case 'GET' : switch(action) {
                case 'create':
                    result = await createOrder(customerId, what);
                    break;
                default:
                    return {
                        statusCode: 501,
                        body: `Action '${action}' not implemented.`
                    };
            }
        }
        
        const response = {
            statusCode: result.length > 0 ? 200 : 404,
            body: result.length > 0? JSON.stringify(result[0]) : "Not Found"
        };
    
        return response;
    }
};

async function createOrder(customerId, itemId) {
    console.log('create order')
    console.log('testing uuid ' + uuidv4());
    
    const orderId = new Date().toISOString();
    const order = {
        customerId,
        orderId,
        itemId
    };

    await eventHandler.sendEvent("OrderCreated", order, EVENT_BUS, EVENT_SOURCE);
    console.log('event sent')
    return [order];
}

async function storeOrder(orderStatus, order) {

    const orderDate = new Date().toISOString();
    const dbOrder = `{'customerId' : '${order.customerId}',
    'orderId' : '${order.orderId}', 'orderStatus' : '${orderStatus}',
    'itemId' : '${order.itemId}', 'itemPrice' : ${order.item.price},
    'deliveryPrice': ${order.delivery.price}, 'totalPrice': ${order.payment.amount},
    'paymentId': '${order.payment.paymentId}', 'deliveryAddress': '${order.customer.address}',
    'orderDate': '${orderDate}', 'updateDate': '${orderDate}'}`;
    const params = {
        Statement: `INSERT INTO "${ORDER_TABLE}" VALUE ${dbOrder}`
    }

    await dynamoHandler.executeStatement(params);

    return;
}

async function updateOrder(orderStatus, order) {

    const updateDate = new Date().toISOString();
    const params = {
        Statement: `UPDATE "${ORDER_TABLE}"
        SET orderStatus = '${orderStatus}', updateDate = '${updateDate}'
        WHERE customerId = '${order.customerId}'
        AND orderId = '${order.orderId}'
        RETURNING ALL NEW *`
    }
    const updates = await dynamoHandler.executeStatement(params);

    console.log(updates);

    return updates;
}
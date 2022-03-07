const eventHandler = require('eventHandler');
const dynamoHandler = require('dynamoHandler');
const locationHandler = require('locationHandler')

const EVENT_SOURCE="Delivery";
const EVENT_BUS = process.env.EVENT_BUS;
const PLACE_INDEX = process.env.PLACE_INDEX;
const ROUTE_CALCULATOR = process.env.ROUTE_CALCULATOR;
const DELIVERY_TABLE = process.env.DELIVERY_TABLE;

const START_ADDRESS = '60 Holborn Viaduct, London EC1A 2FD, UK';

var startAddressPlace;

exports.lambdaHandler = async (event, context) => {

    if (startAddressPlace === undefined) {
        startAddressPlace = await locationHandler.getPlaceFromAddress(START_ADDRESS, PLACE_INDEX);
    }

    const eventType = event['detail-type'];

    if (eventType !== undefined) {

        // EventBridge Invocation
        const order = event.detail;

        switch(eventType) {
            case 'CustomerDescribed':
                await eventHandler.processResult(await estimateDelivery(order.customer.address),
                    "DeliveryEstimated", "ErrorDeliveryEstimated",
                    order, "delivery", EVENT_BUS, EVENT_SOURCE);
                break;
            case 'ItemRemoved':
                await eventHandler.processResult(await startDelivery(order.customerId, order.orderId, order.customer.address),
                    "DeliveryStarted", "ErrorDeliveryStarted",
                    order, "delivery", EVENT_BUS, EVENT_SOURCE);
                break;
            case 'Delivered':
                await eventHandler.processResult(await delivered(order.customerId, order.orderId),
                    "DeliveryWasDelivered", "ErrorDeliveryWasDelivered",
                    order, "delivery", EVENT_BUS, EVENT_SOURCE);
                break;
            case 'DeliveryCanceled':
                await eventHandler.processResult(await cancelDelivery(order.customerId, order.orderId),
                    "DeliveryWasCanceled", "ErrorDeliveryWasCanceled",
                    order, "delivery", EVENT_BUS, EVENT_SOURCE);
                break;
            default:
                console.error(`Event '${eventType}' not implemented.`);
        }
    }
};

async function getRouteSummaryFor(address) {
    const route = await locationHandler.getRouteForAddress(address, startAddressPlace, PLACE_INDEX, ROUTE_CALCULATOR);
    const routeSummary = route.Summary;
    routeSummary.price = Math.round(routeSummary.DurationSeconds) / 100; // Be careful when rounding money values!
    return routeSummary;
}

async function estimateDelivery(address) {
    const delivery = await getRouteSummaryFor(address);
    return [delivery];
}

async function startDelivery(customerId, orderId, address) {

    const deliveryStatus = 'DELIVERING';
    const routeSummary = await getRouteSummaryFor(address);

    const delivery =
        `{'customerId' : '${customerId}', 'orderId' : '${orderId}',
        'address' : '${address}', 'deliveryStatus' : '${deliveryStatus}',
        'price' : ${routeSummary.price}}`;
    const params = {
        Statement: `INSERT INTO "${DELIVERY_TABLE}" VALUE ${delivery}`
    }
    await dynamoHandler.executeStatement(params);

    return [{
        customerId: customerId,
        orderId: orderId,
        address: address,
        deliveryStatus: deliveryStatus
    }];
}

async function cancelDelivery(customerId, orderId) {

    const params = {
        Statement: `UPDATE "${DELIVERY_TABLE}"
        SET deliveryStatus = 'CANCELED'
        WHERE customerId = '${customerId}'
        AND orderId = '${orderId}'
        RETURNING MODIFIED NEW *`
    }
    const updates = await dynamoHandler.executeStatement(params);

    return updates;
}

async function delivered(customerId, orderId) {

    const params = {
        Statement: `UPDATE "${DELIVERY_TABLE}"
        SET deliveryStatus = 'DELIVERED'
        WHERE customerId = '${customerId}'
        AND orderId = '${orderId}'
        RETURNING MODIFIED NEW *`
    }
    const updates = await dynamoHandler.executeStatement(params);

    return updates;
}
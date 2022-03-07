const eventHandler = require('eventHandler');
const dynamoHandler = require('dynamoHandler');

const EVENT_SOURCE="Inventory";
const EVENT_BUS = process.env.EVENT_BUS;
const INVENTORY_TABLE = process.env.INVENTORY_TABLE;

exports.lambdaHandler = async (event, context) => {

    const eventType = event['detail-type'];

    if (eventType !== undefined) {

        // EventBridge Invocation
        const order = event.detail;

        switch(eventType) {
            case 'OrderCreated': 
                await eventHandler.processResult(await reserveItem(order.itemId),
                'ItemReserved', 'ItemNotAvailable',
                order, '', EVENT_BUS, EVENT_SOURCE);
                break;
            case 'PaymentFailed':
                await eventHandler.processResult(await unreserveItem(order.itemId),
                    'ItemUnreserved', 'ErrorItemUnreserved',
                    order, '', EVENT_BUS, EVENT_SOURCE);
                break;
            case 'PaymentMade':
                await eventHandler.processResult(await removeReservedItem(order.itemId),
                    'ItemRemoved', 'ErrorItemRemoved',
                    order, '', EVENT_BUS, EVENT_SOURCE);
                break;        
            case 'OrderCanceled':
                await eventHandler.processResult(await returnItemAsAvailable(order.order.itemId),
                    'ItemReturned', 'ErrorItemReturned',
                    order, '', EVENT_BUS, EVENT_SOURCE);
                break;
            case 'ItemReserved':
                await eventHandler.processResult(await describeItem(order.itemId),
                    'ItemDescribed', 'ErrorItemDescribed',
                    order, 'item', EVENT_BUS, EVENT_SOURCE);
                break;
            default:
                console.error(`Event '${eventType}' not implemented.`);
        }
    }
};

async function describeItem(itemId) {
    const params = {
        Statement: `SELECT *
        FROM "${INVENTORY_TABLE}"
        WHERE itemId = '${itemId}'`
    };
    return await dynamoHandler.executeStatement(params);
}

async function reserveItem(itemId) {
    const params = {
        Statement: `UPDATE "${INVENTORY_TABLE}"
        SET available = available - 1
        SET reserved = reserved + 1
        WHERE itemId = '${itemId}' AND available > 0
        RETURNING MODIFIED NEW *`
    }
    return await dynamoHandler.executeStatement(params);
}

async function unreserveItem(itemId) {
    const params = {
        Statement: `UPDATE "${INVENTORY_TABLE}"
        SET available = available + 1
        SET reserved = reserved - 1
        WHERE itemId = '${itemId}' AND reserved > 0
        RETURNING MODIFIED NEW *`
    }
    return await dynamoHandler.executeStatement(params);
}

async function removeReservedItem(itemId) {
    const params = {
        Statement: `UPDATE "${INVENTORY_TABLE}"
        SET reserved = reserved - 1
        WHERE itemId = '${itemId}' AND reserved > 0
        RETURNING MODIFIED NEW *`
    }
    return await dynamoHandler.executeStatement(params);
}

async function returnItemAsAvailable(itemId) {
    const params = {
        Statement: `UPDATE "${INVENTORY_TABLE}"
        SET available = available + 1
        WHERE itemId = '${itemId}'
        RETURNING MODIFIED NEW *`
    }
    return await dynamoHandler.executeStatement(params);
}
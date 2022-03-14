const eventHandler = require('eventHandler');
const dynamoHandler = require('dynamoHandler');

const EVENT_SOURCE="Customer";
const EVENT_BUS = process.env.EVENT_BUS;
const CUSTOMER_TABLE = process.env.CUSTOMER_TABLE;

exports.lambdaHandler = async (event, context) => {

    const eventType = event['detail-type'];

    if (eventType !== undefined) {

        // EventBridge Invocation
        const order = event.detail;

        switch(eventType) {
            case 'ItemDescribed':
                await eventHandler.processResult(await describeCustomer(order.customerId),
                    "CustomerDescribed", "ErrorCustomerDescribed",
                    order, "customer", EVENT_BUS, EVENT_SOURCE);
                break;
            default:
                console.error(`Event '${eventType}' not implemented.`);
        }
    }
};

async function describeCustomer(customerId) {
    const params = {
        Statement: `SELECT *
        FROM "${CUSTOMER_TABLE}"
        WHERE customerId = '${customerId}'`
    };
    return await dynamoHandler.executeStatement(params);
}
# Event design table

| API (sync)  |            Input Events            |  Service   |      Action      |                 Output Events                  |             Notes             |
| :---------: | :--------------------------------: | :--------: | :--------------: | :--------------------------------------------: | :---------------------------: |
| CreateOrder |            CreateOrder             |   Order    |   CreateOrder    |                  OrderCreated                  |          Public API.          |
|             |            OrderCreated            | Inventory  |   ReserveItem    |         ItemReserved ItemNotAvailable          |                               |
|             |            ItemReserved            | Inventory  |   DescribeItem   |                 ItemDescribed                  |                               |
|             |            ItemDescribed           |  Customer  | DescribeCustomer |    CustomerDescribed ErrorCustomerDescribed    |  Get name, address, and email |
|             |         CustomerDescribed          |  Delivery  | EstimateDelivery |               DeliveryEstimated                |   Including delivery price.   |
|             |          DeliveryEstimated         |  Payment   |   MakePayement   |            PaymentMade PaymentFailed           |                               |
|             |             PaymentMade            | Inventory  |    RemoveItem    |        ItemRemoved ErrorItemUnreserved         |                               |
|             |             ItemRemoved            |  Delivery  |   StartDelivery  |                DeliveryStarted                 |                               |
|             |     Delivered (from logistics)     |  Delivery  |    Delivered     | DeliveryWasDelivered ErrorDeliveryWasDelivered |                               |
|             |        DeliveryWasDelivered        |   Order    |   UpdateOrder    |    OrderDelivered (END) ErrorOrdeDelivered     |       Order delivered.        |
|             |        DeliveryWasCanceled         |   Order    |   UpdateOrder    |        OrderCanceled ErrorOrderCanceled        |        Order canceled.        |
|             |            PaymentFailed           | Inventory  |   UnreserveItem  |    ItemUnreserved (END) ErrorItemUnreserved    |                               |
|             |            OrderCanceled           |  Inventory |    ReturnItem    |          ItemReturned ItemNotReturned          |                               |
|             |            ItemReturned            |   Payment  |   CancelPayment  |             PaymentCanceled (END)              |                               |
|             |  DeliveryCanceled (from logistics) |  Delivery  |  CancelDelivery  |  DeliveryWasCanceled ErrorDeliveryWasCanceled  |           Public API.         |

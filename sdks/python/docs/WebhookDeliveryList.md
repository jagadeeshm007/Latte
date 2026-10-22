# WebhookDeliveryList


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**items** | [**List[WebhookDelivery]**](WebhookDelivery.md) |  | 
**total** | **float** |  | 

## Example

```python
from latte_sdk.models.webhook_delivery_list import WebhookDeliveryList

# TODO update the JSON string below
json = "{}"
# create an instance of WebhookDeliveryList from a JSON string
webhook_delivery_list_instance = WebhookDeliveryList.from_json(json)
# print the JSON string representation of the object
print(WebhookDeliveryList.to_json())

# convert the object into a dict
webhook_delivery_list_dict = webhook_delivery_list_instance.to_dict()
# create an instance of WebhookDeliveryList from a dict
webhook_delivery_list_from_dict = WebhookDeliveryList.from_dict(webhook_delivery_list_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



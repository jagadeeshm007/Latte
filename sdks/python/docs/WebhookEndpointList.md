# WebhookEndpointList


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**items** | [**List[WebhookEndpoint]**](WebhookEndpoint.md) |  | 

## Example

```python
from latte_sdk.models.webhook_endpoint_list import WebhookEndpointList

# TODO update the JSON string below
json = "{}"
# create an instance of WebhookEndpointList from a JSON string
webhook_endpoint_list_instance = WebhookEndpointList.from_json(json)
# print the JSON string representation of the object
print(WebhookEndpointList.to_json())

# convert the object into a dict
webhook_endpoint_list_dict = webhook_endpoint_list_instance.to_dict()
# create an instance of WebhookEndpointList from a dict
webhook_endpoint_list_from_dict = WebhookEndpointList.from_dict(webhook_endpoint_list_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



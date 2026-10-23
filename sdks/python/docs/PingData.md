# PingData

A test event, sent from the endpoint page or the API.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **str** |  | 

## Example

```python
from latte_sdk.models.ping_data import PingData

# TODO update the JSON string below
json = "{}"
# create an instance of PingData from a JSON string
ping_data_instance = PingData.from_json(json)
# print the JSON string representation of the object
print(PingData.to_json())

# convert the object into a dict
ping_data_dict = ping_data_instance.to_dict()
# create an instance of PingData from a dict
ping_data_from_dict = PingData.from_dict(ping_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



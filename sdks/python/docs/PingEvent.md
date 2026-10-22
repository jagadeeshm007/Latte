# PingEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | the event id; the same on every redelivery | 
**type** | **str** |  | 
**created_at** | **str** | ISO 8601 | 
**data** | [**PingData**](PingData.md) |  | 

## Example

```python
from latte_sdk.models.ping_event import PingEvent

# TODO update the JSON string below
json = "{}"
# create an instance of PingEvent from a JSON string
ping_event_instance = PingEvent.from_json(json)
# print the JSON string representation of the object
print(PingEvent.to_json())

# convert the object into a dict
ping_event_dict = ping_event_instance.to_dict()
# create an instance of PingEvent from a dict
ping_event_from_dict = PingEvent.from_dict(ping_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



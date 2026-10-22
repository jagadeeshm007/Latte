# CallFailedEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | the event id; the same on every redelivery | 
**type** | **str** |  | 
**created_at** | **str** | ISO 8601 | 
**data** | [**CallFailedData**](CallFailedData.md) |  | 

## Example

```python
from latte_sdk.models.call_failed_event import CallFailedEvent

# TODO update the JSON string below
json = "{}"
# create an instance of CallFailedEvent from a JSON string
call_failed_event_instance = CallFailedEvent.from_json(json)
# print the JSON string representation of the object
print(CallFailedEvent.to_json())

# convert the object into a dict
call_failed_event_dict = call_failed_event_instance.to_dict()
# create an instance of CallFailedEvent from a dict
call_failed_event_from_dict = CallFailedEvent.from_dict(call_failed_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



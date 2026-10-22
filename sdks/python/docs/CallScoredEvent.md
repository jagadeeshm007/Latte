# CallScoredEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | the event id; the same on every redelivery | 
**type** | **str** |  | 
**created_at** | **str** | ISO 8601 | 
**data** | [**CallScoredData**](CallScoredData.md) |  | 

## Example

```python
from latte_sdk.models.call_scored_event import CallScoredEvent

# TODO update the JSON string below
json = "{}"
# create an instance of CallScoredEvent from a JSON string
call_scored_event_instance = CallScoredEvent.from_json(json)
# print the JSON string representation of the object
print(CallScoredEvent.to_json())

# convert the object into a dict
call_scored_event_dict = call_scored_event_instance.to_dict()
# create an instance of CallScoredEvent from a dict
call_scored_event_from_dict = CallScoredEvent.from_dict(call_scored_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# BatchCompletedEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | the event id; the same on every redelivery | 
**type** | **str** |  | 
**created_at** | **str** | ISO 8601 | 
**data** | [**BatchCompletedData**](BatchCompletedData.md) |  | 

## Example

```python
from latte_sdk.models.batch_completed_event import BatchCompletedEvent

# TODO update the JSON string below
json = "{}"
# create an instance of BatchCompletedEvent from a JSON string
batch_completed_event_instance = BatchCompletedEvent.from_json(json)
# print the JSON string representation of the object
print(BatchCompletedEvent.to_json())

# convert the object into a dict
batch_completed_event_dict = batch_completed_event_instance.to_dict()
# create an instance of BatchCompletedEvent from a dict
batch_completed_event_from_dict = BatchCompletedEvent.from_dict(batch_completed_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



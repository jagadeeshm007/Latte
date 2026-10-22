# DigestReadyEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | the event id; the same on every redelivery | 
**type** | **str** |  | 
**created_at** | **str** | ISO 8601 | 
**data** | [**DigestReadyData**](DigestReadyData.md) |  | 

## Example

```python
from latte_sdk.models.digest_ready_event import DigestReadyEvent

# TODO update the JSON string below
json = "{}"
# create an instance of DigestReadyEvent from a JSON string
digest_ready_event_instance = DigestReadyEvent.from_json(json)
# print the JSON string representation of the object
print(DigestReadyEvent.to_json())

# convert the object into a dict
digest_ready_event_dict = digest_ready_event_instance.to_dict()
# create an instance of DigestReadyEvent from a dict
digest_ready_event_from_dict = DigestReadyEvent.from_dict(digest_ready_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



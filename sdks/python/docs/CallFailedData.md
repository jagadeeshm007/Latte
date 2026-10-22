# CallFailedData

A call could not be processed; retry it once the reason is fixed.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**call_id** | **str** |  | 
**reason** | **str** | why processing gave up, for a person | 

## Example

```python
from latte_sdk.models.call_failed_data import CallFailedData

# TODO update the JSON string below
json = "{}"
# create an instance of CallFailedData from a JSON string
call_failed_data_instance = CallFailedData.from_json(json)
# print the JSON string representation of the object
print(CallFailedData.to_json())

# convert the object into a dict
call_failed_data_dict = call_failed_data_instance.to_dict()
# create an instance of CallFailedData from a dict
call_failed_data_from_dict = CallFailedData.from_dict(call_failed_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



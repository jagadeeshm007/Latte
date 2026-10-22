# CallList


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**items** | [**List[CallSummary]**](CallSummary.md) |  | 
**next_cursor** | **str** |  | 
**total** | **float** |  | 

## Example

```python
from latte_sdk.models.call_list import CallList

# TODO update the JSON string below
json = "{}"
# create an instance of CallList from a JSON string
call_list_instance = CallList.from_json(json)
# print the JSON string representation of the object
print(CallList.to_json())

# convert the object into a dict
call_list_dict = call_list_instance.to_dict()
# create an instance of CallList from a dict
call_list_from_dict = CallList.from_dict(call_list_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



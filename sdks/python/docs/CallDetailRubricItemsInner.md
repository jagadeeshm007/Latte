# CallDetailRubricItemsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**key** | **str** | Stable key; findings and agreement group by it | 
**type** | **str** |  | 
**label** | **str** |  | 
**description** | **str** |  | 

## Example

```python
from latte_sdk.models.call_detail_rubric_items_inner import CallDetailRubricItemsInner

# TODO update the JSON string below
json = "{}"
# create an instance of CallDetailRubricItemsInner from a JSON string
call_detail_rubric_items_inner_instance = CallDetailRubricItemsInner.from_json(json)
# print the JSON string representation of the object
print(CallDetailRubricItemsInner.to_json())

# convert the object into a dict
call_detail_rubric_items_inner_dict = call_detail_rubric_items_inner_instance.to_dict()
# create an instance of CallDetailRubricItemsInner from a dict
call_detail_rubric_items_inner_from_dict = CallDetailRubricItemsInner.from_dict(call_detail_rubric_items_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



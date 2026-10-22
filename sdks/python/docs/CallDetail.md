# CallDetail


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**call** | [**CallSummary**](CallSummary.md) |  | 
**audio_available** | **bool** |  | 
**score** | [**CallDetailScore**](CallDetailScore.md) |  | 
**rubric_items** | [**List[CallDetailRubricItemsInner]**](CallDetailRubricItemsInner.md) |  | 
**segments** | [**List[Segment]**](Segment.md) |  | 
**findings** | [**List[Finding]**](Finding.md) |  | 
**redactions** | **float** |  | [default to 0]

## Example

```python
from latte_sdk.models.call_detail import CallDetail

# TODO update the JSON string below
json = "{}"
# create an instance of CallDetail from a JSON string
call_detail_instance = CallDetail.from_json(json)
# print the JSON string representation of the object
print(CallDetail.to_json())

# convert the object into a dict
call_detail_dict = call_detail_instance.to_dict()
# create an instance of CallDetail from a dict
call_detail_from_dict = CallDetail.from_dict(call_detail_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



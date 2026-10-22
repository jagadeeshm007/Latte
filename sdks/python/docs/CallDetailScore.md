# CallDetailScore


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**rubric_version** | **float** |  | 
**talk_ratio** | **float** |  | 
**coaching_notes** | **List[str]** |  | 
**judge_error** | **str** |  | 
**reviewed_by** | **str** |  | 
**reviewed_at** | **str** |  | 

## Example

```python
from latte_sdk.models.call_detail_score import CallDetailScore

# TODO update the JSON string below
json = "{}"
# create an instance of CallDetailScore from a JSON string
call_detail_score_instance = CallDetailScore.from_json(json)
# print the JSON string representation of the object
print(CallDetailScore.to_json())

# convert the object into a dict
call_detail_score_dict = call_detail_score_instance.to_dict()
# create an instance of CallDetailScore from a dict
call_detail_score_from_dict = CallDetailScore.from_dict(call_detail_score_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# CallScoredData

A call has its score and findings.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**call_id** | **str** |  | 
**batch_id** | **str** |  | 
**agent_id** | **str** |  | 
**team_id** | **str** |  | 
**product_id** | **str** |  | 
**overall_score** | **float** | 0 to 100; null when the judge could not score | 
**needs_review** | **bool** | true when QA should look at the call | 
**judge_status** | **str** | ok, or why the judge failed | 
**breaches** | **int** | prohibited statements found | 

## Example

```python
from latte_sdk.models.call_scored_data import CallScoredData

# TODO update the JSON string below
json = "{}"
# create an instance of CallScoredData from a JSON string
call_scored_data_instance = CallScoredData.from_json(json)
# print the JSON string representation of the object
print(CallScoredData.to_json())

# convert the object into a dict
call_scored_data_dict = call_scored_data_instance.to_dict()
# create an instance of CallScoredData from a dict
call_scored_data_from_dict = CallScoredData.from_dict(call_scored_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



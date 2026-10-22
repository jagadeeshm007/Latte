# CallSummary


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**agent_id** | **str** |  | 
**agent_name** | **str** |  | 
**team_name** | **str** |  | 
**product_name** | **str** |  | 
**call_date** | **str** |  | 
**original_filename** | **str** |  | 
**language** | **str** |  | 
**status** | **str** |  | 
**error** | **str** |  | 
**duration_ms** | **float** |  | 
**created_at** | **str** |  | 
**overall_score** | **float** |  | 
**judge_status** | **str** |  | 
**needs_review** | **bool** |  | 
**review_status** | **str** |  | 
**breaches** | **float** |  | 
**missed** | **float** |  | 
**flag** | **str** |  | 
**archived_at** | **str** |  | 
**batch_id** | **str** |  | 
**batch_name** | **str** |  | 
**input** | **str** |  | [default to 'audio']
**timed** | **bool** |  | [default to True]

## Example

```python
from latte_sdk.models.call_summary import CallSummary

# TODO update the JSON string below
json = "{}"
# create an instance of CallSummary from a JSON string
call_summary_instance = CallSummary.from_json(json)
# print the JSON string representation of the object
print(CallSummary.to_json())

# convert the object into a dict
call_summary_dict = call_summary_instance.to_dict()
# create an instance of CallSummary from a dict
call_summary_from_dict = CallSummary.from_dict(call_summary_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



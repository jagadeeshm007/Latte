# BatchSummary


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**source** | **str** |  | 
**created_by** | **str** |  | 
**created_by_name** | **str** |  | 
**created_at** | **str** |  | 
**archived_at** | **str** |  | 
**total** | **float** |  | 
**queued** | **float** |  | 
**processing** | **float** |  | 
**scored** | **float** |  | 
**failed** | **float** |  | 
**flagged** | **float** |  | 
**avg_score** | **float** |  | 
**state** | **str** |  | 

## Example

```python
from latte_sdk.models.batch_summary import BatchSummary

# TODO update the JSON string below
json = "{}"
# create an instance of BatchSummary from a JSON string
batch_summary_instance = BatchSummary.from_json(json)
# print the JSON string representation of the object
print(BatchSummary.to_json())

# convert the object into a dict
batch_summary_dict = batch_summary_instance.to_dict()
# create an instance of BatchSummary from a dict
batch_summary_from_dict = BatchSummary.from_dict(batch_summary_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



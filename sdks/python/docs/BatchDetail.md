# BatchDetail


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
**breaches** | **float** |  | 
**audio_ms** | **float** |  | 
**cost_usd** | **float** |  | 
**last_activity_at** | **str** |  | 

## Example

```python
from latte_sdk.models.batch_detail import BatchDetail

# TODO update the JSON string below
json = "{}"
# create an instance of BatchDetail from a JSON string
batch_detail_instance = BatchDetail.from_json(json)
# print the JSON string representation of the object
print(BatchDetail.to_json())

# convert the object into a dict
batch_detail_dict = batch_detail_instance.to_dict()
# create an instance of BatchDetail from a dict
batch_detail_from_dict = BatchDetail.from_dict(batch_detail_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



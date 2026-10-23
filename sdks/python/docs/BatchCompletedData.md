# BatchCompletedData

Every call in a batch is scored or failed.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**batch_id** | **str** |  | 
**name** | **str** |  | 
**total** | **int** |  | 
**scored** | **int** |  | 
**failed** | **int** |  | 

## Example

```python
from latte_sdk.models.batch_completed_data import BatchCompletedData

# TODO update the JSON string below
json = "{}"
# create an instance of BatchCompletedData from a JSON string
batch_completed_data_instance = BatchCompletedData.from_json(json)
# print the JSON string representation of the object
print(BatchCompletedData.to_json())

# convert the object into a dict
batch_completed_data_dict = batch_completed_data_instance.to_dict()
# create an instance of BatchCompletedData from a dict
batch_completed_data_from_dict = BatchCompletedData.from_dict(batch_completed_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



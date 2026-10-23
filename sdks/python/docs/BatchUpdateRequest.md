# BatchUpdateRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | [optional] 
**archived** | **bool** |  | [optional] 

## Example

```python
from latte_sdk.models.batch_update_request import BatchUpdateRequest

# TODO update the JSON string below
json = "{}"
# create an instance of BatchUpdateRequest from a JSON string
batch_update_request_instance = BatchUpdateRequest.from_json(json)
# print the JSON string representation of the object
print(BatchUpdateRequest.to_json())

# convert the object into a dict
batch_update_request_dict = batch_update_request_instance.to_dict()
# create an instance of BatchUpdateRequest from a dict
batch_update_request_from_dict = BatchUpdateRequest.from_dict(batch_update_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



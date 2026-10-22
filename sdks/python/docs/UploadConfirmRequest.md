# UploadConfirmRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**files** | [**List[UploadConfirmRequestFilesInner]**](UploadConfirmRequestFilesInner.md) |  | 
**batch_id** | **UUID** |  | [optional] 
**batch_name** | **str** |  | [optional] 

## Example

```python
from latte_sdk.models.upload_confirm_request import UploadConfirmRequest

# TODO update the JSON string below
json = "{}"
# create an instance of UploadConfirmRequest from a JSON string
upload_confirm_request_instance = UploadConfirmRequest.from_json(json)
# print the JSON string representation of the object
print(UploadConfirmRequest.to_json())

# convert the object into a dict
upload_confirm_request_dict = upload_confirm_request_instance.to_dict()
# create an instance of UploadConfirmRequest from a dict
upload_confirm_request_from_dict = UploadConfirmRequest.from_dict(upload_confirm_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



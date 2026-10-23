# UploadConfirmRequestFilesInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**path** | **str** |  | 
**original_filename** | **str** |  | 
**mime_type** | **str** |  | 
**size_bytes** | **int** |  | 
**agent_id** | **UUID** |  | 
**team_id** | **UUID** |  | 
**product_id** | **UUID** |  | 
**call_date** | **str** |  | 
**language** | **str** |  | [optional] [default to 'en-IN']

## Example

```python
from latte_sdk.models.upload_confirm_request_files_inner import UploadConfirmRequestFilesInner

# TODO update the JSON string below
json = "{}"
# create an instance of UploadConfirmRequestFilesInner from a JSON string
upload_confirm_request_files_inner_instance = UploadConfirmRequestFilesInner.from_json(json)
# print the JSON string representation of the object
print(UploadConfirmRequestFilesInner.to_json())

# convert the object into a dict
upload_confirm_request_files_inner_dict = upload_confirm_request_files_inner_instance.to_dict()
# create an instance of UploadConfirmRequestFilesInner from a dict
upload_confirm_request_files_inner_from_dict = UploadConfirmRequestFilesInner.from_dict(upload_confirm_request_files_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



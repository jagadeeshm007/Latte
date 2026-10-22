# UploadSignRequestFilesInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**type** | **str** |  | 
**size** | **int** |  | 

## Example

```python
from latte_sdk.models.upload_sign_request_files_inner import UploadSignRequestFilesInner

# TODO update the JSON string below
json = "{}"
# create an instance of UploadSignRequestFilesInner from a JSON string
upload_sign_request_files_inner_instance = UploadSignRequestFilesInner.from_json(json)
# print the JSON string representation of the object
print(UploadSignRequestFilesInner.to_json())

# convert the object into a dict
upload_sign_request_files_inner_dict = upload_sign_request_files_inner_instance.to_dict()
# create an instance of UploadSignRequestFilesInner from a dict
upload_sign_request_files_inner_from_dict = UploadSignRequestFilesInner.from_dict(upload_sign_request_files_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



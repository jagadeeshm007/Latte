# UploadSignResponseUploadsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**path** | **str** |  | 
**signed_url** | **str** |  | 
**token** | **str** |  | 

## Example

```python
from latte_sdk.models.upload_sign_response_uploads_inner import UploadSignResponseUploadsInner

# TODO update the JSON string below
json = "{}"
# create an instance of UploadSignResponseUploadsInner from a JSON string
upload_sign_response_uploads_inner_instance = UploadSignResponseUploadsInner.from_json(json)
# print the JSON string representation of the object
print(UploadSignResponseUploadsInner.to_json())

# convert the object into a dict
upload_sign_response_uploads_inner_dict = upload_sign_response_uploads_inner_instance.to_dict()
# create an instance of UploadSignResponseUploadsInner from a dict
upload_sign_response_uploads_inner_from_dict = UploadSignResponseUploadsInner.from_dict(upload_sign_response_uploads_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



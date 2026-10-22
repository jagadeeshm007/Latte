# UploadSignResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**uploads** | [**List[UploadSignResponseUploadsInner]**](UploadSignResponseUploadsInner.md) |  | 

## Example

```python
from latte_sdk.models.upload_sign_response import UploadSignResponse

# TODO update the JSON string below
json = "{}"
# create an instance of UploadSignResponse from a JSON string
upload_sign_response_instance = UploadSignResponse.from_json(json)
# print the JSON string representation of the object
print(UploadSignResponse.to_json())

# convert the object into a dict
upload_sign_response_dict = upload_sign_response_instance.to_dict()
# create an instance of UploadSignResponse from a dict
upload_sign_response_from_dict = UploadSignResponse.from_dict(upload_sign_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



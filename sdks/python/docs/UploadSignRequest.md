# UploadSignRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**files** | [**List[UploadSignRequestFilesInner]**](UploadSignRequestFilesInner.md) |  | 

## Example

```python
from latte_sdk.models.upload_sign_request import UploadSignRequest

# TODO update the JSON string below
json = "{}"
# create an instance of UploadSignRequest from a JSON string
upload_sign_request_instance = UploadSignRequest.from_json(json)
# print the JSON string representation of the object
print(UploadSignRequest.to_json())

# convert the object into a dict
upload_sign_request_dict = upload_sign_request_instance.to_dict()
# create an instance of UploadSignRequest from a dict
upload_sign_request_from_dict = UploadSignRequest.from_dict(upload_sign_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



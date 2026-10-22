# AudioUrlRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**download** | **bool** |  | [optional] 

## Example

```python
from latte_sdk.models.audio_url_request import AudioUrlRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AudioUrlRequest from a JSON string
audio_url_request_instance = AudioUrlRequest.from_json(json)
# print the JSON string representation of the object
print(AudioUrlRequest.to_json())

# convert the object into a dict
audio_url_request_dict = audio_url_request_instance.to_dict()
# create an instance of AudioUrlRequest from a dict
audio_url_request_from_dict = AudioUrlRequest.from_dict(audio_url_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



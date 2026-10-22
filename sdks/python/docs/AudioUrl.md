# AudioUrl


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**url** | **str** |  | 
**expires_in_seconds** | **float** |  | 

## Example

```python
from latte_sdk.models.audio_url import AudioUrl

# TODO update the JSON string below
json = "{}"
# create an instance of AudioUrl from a JSON string
audio_url_instance = AudioUrl.from_json(json)
# print the JSON string representation of the object
print(AudioUrl.to_json())

# convert the object into a dict
audio_url_dict = audio_url_instance.to_dict()
# create an instance of AudioUrl from a dict
audio_url_from_dict = AudioUrl.from_dict(audio_url_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



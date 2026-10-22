# TranscriptUploadRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transcripts** | [**List[TranscriptUploadRequestTranscriptsInner]**](TranscriptUploadRequestTranscriptsInner.md) |  | 
**batch_id** | **UUID** |  | [optional] 
**batch_name** | **str** |  | [optional] 

## Example

```python
from latte_sdk.models.transcript_upload_request import TranscriptUploadRequest

# TODO update the JSON string below
json = "{}"
# create an instance of TranscriptUploadRequest from a JSON string
transcript_upload_request_instance = TranscriptUploadRequest.from_json(json)
# print the JSON string representation of the object
print(TranscriptUploadRequest.to_json())

# convert the object into a dict
transcript_upload_request_dict = transcript_upload_request_instance.to_dict()
# create an instance of TranscriptUploadRequest from a dict
transcript_upload_request_from_dict = TranscriptUploadRequest.from_dict(transcript_upload_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



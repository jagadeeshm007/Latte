# TranscriptUploadRequestTranscriptsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**original_filename** | **str** |  | 
**agent_id** | **UUID** |  | 
**team_id** | **UUID** |  | 
**product_id** | **UUID** |  | 
**call_date** | **str** |  | 
**language** | **str** |  | [optional] [default to 'en-IN']
**lines** | [**List[TranscriptLine]**](TranscriptLine.md) |  | 

## Example

```python
from latte_sdk.models.transcript_upload_request_transcripts_inner import TranscriptUploadRequestTranscriptsInner

# TODO update the JSON string below
json = "{}"
# create an instance of TranscriptUploadRequestTranscriptsInner from a JSON string
transcript_upload_request_transcripts_inner_instance = TranscriptUploadRequestTranscriptsInner.from_json(json)
# print the JSON string representation of the object
print(TranscriptUploadRequestTranscriptsInner.to_json())

# convert the object into a dict
transcript_upload_request_transcripts_inner_dict = transcript_upload_request_transcripts_inner_instance.to_dict()
# create an instance of TranscriptUploadRequestTranscriptsInner from a dict
transcript_upload_request_transcripts_inner_from_dict = TranscriptUploadRequestTranscriptsInner.from_dict(transcript_upload_request_transcripts_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# TranscriptLine


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**speaker** | **str** |  | 
**text** | **str** |  | 
**start_ms** | **int** |  | [optional] 
**end_ms** | **int** |  | [optional] 

## Example

```python
from latte_sdk.models.transcript_line import TranscriptLine

# TODO update the JSON string below
json = "{}"
# create an instance of TranscriptLine from a JSON string
transcript_line_instance = TranscriptLine.from_json(json)
# print the JSON string representation of the object
print(TranscriptLine.to_json())

# convert the object into a dict
transcript_line_dict = transcript_line_instance.to_dict()
# create an instance of TranscriptLine from a dict
transcript_line_from_dict = TranscriptLine.from_dict(transcript_line_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



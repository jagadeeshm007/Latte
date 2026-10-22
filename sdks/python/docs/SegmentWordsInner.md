# SegmentWordsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**text** | **str** |  | 
**start_ms** | **float** |  | 
**end_ms** | **float** |  | 

## Example

```python
from latte_sdk.models.segment_words_inner import SegmentWordsInner

# TODO update the JSON string below
json = "{}"
# create an instance of SegmentWordsInner from a JSON string
segment_words_inner_instance = SegmentWordsInner.from_json(json)
# print the JSON string representation of the object
print(SegmentWordsInner.to_json())

# convert the object into a dict
segment_words_inner_dict = segment_words_inner_instance.to_dict()
# create an instance of SegmentWordsInner from a dict
segment_words_inner_from_dict = SegmentWordsInner.from_dict(segment_words_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



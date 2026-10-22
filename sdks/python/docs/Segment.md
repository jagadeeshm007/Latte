# Segment


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**seq** | **float** |  | 
**channel** | **str** |  | 
**start_ms** | **float** |  | 
**end_ms** | **float** |  | 
**text** | **str** |  | 
**language** | **str** |  | 
**avg_logprob** | **float** |  | 
**words** | [**List[SegmentWordsInner]**](SegmentWordsInner.md) |  | 
**translation** | **str** |  | 

## Example

```python
from latte_sdk.models.segment import Segment

# TODO update the JSON string below
json = "{}"
# create an instance of Segment from a JSON string
segment_instance = Segment.from_json(json)
# print the JSON string representation of the object
print(Segment.to_json())

# convert the object into a dict
segment_dict = segment_instance.to_dict()
# create an instance of Segment from a dict
segment_from_dict = Segment.from_dict(segment_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



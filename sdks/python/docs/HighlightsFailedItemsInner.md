# HighlightsFailedItemsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**key** | **str** |  | 
**label** | **str** |  | 
**failed** | **float** |  | 
**applicable** | **float** |  | 
**fail_rate** | **float** |  | 

## Example

```python
from latte_sdk.models.highlights_failed_items_inner import HighlightsFailedItemsInner

# TODO update the JSON string below
json = "{}"
# create an instance of HighlightsFailedItemsInner from a JSON string
highlights_failed_items_inner_instance = HighlightsFailedItemsInner.from_json(json)
# print the JSON string representation of the object
print(HighlightsFailedItemsInner.to_json())

# convert the object into a dict
highlights_failed_items_inner_dict = highlights_failed_items_inner_instance.to_dict()
# create an instance of HighlightsFailedItemsInner from a dict
highlights_failed_items_inner_from_dict = HighlightsFailedItemsInner.from_dict(highlights_failed_items_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



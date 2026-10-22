# Highlights


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**var_from** | **str** |  | 
**to** | **str** |  | 
**previous_from** | **str** |  | 
**previous_to** | **str** |  | 
**kpis** | [**HighlightsKpis**](HighlightsKpis.md) |  | 
**top_agents** | [**List[HighlightsTopAgentsInner]**](HighlightsTopAgentsInner.md) |  | 
**bottom_agents** | [**List[HighlightsTopAgentsInner]**](HighlightsTopAgentsInner.md) |  | 
**riskiest_teams** | [**List[HighlightsTopAgentsInner]**](HighlightsTopAgentsInner.md) |  | 
**failed_items** | [**List[HighlightsFailedItemsInner]**](HighlightsFailedItemsInner.md) |  | 
**language_mix** | [**List[HighlightsLanguageMixInner]**](HighlightsLanguageMixInner.md) |  | 
**product_mix** | [**List[HighlightsLanguageMixInner]**](HighlightsLanguageMixInner.md) |  | 

## Example

```python
from latte_sdk.models.highlights import Highlights

# TODO update the JSON string below
json = "{}"
# create an instance of Highlights from a JSON string
highlights_instance = Highlights.from_json(json)
# print the JSON string representation of the object
print(Highlights.to_json())

# convert the object into a dict
highlights_dict = highlights_instance.to_dict()
# create an instance of Highlights from a dict
highlights_from_dict = Highlights.from_dict(highlights_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



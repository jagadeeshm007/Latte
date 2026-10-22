# HighlightsTopAgentsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**calls_scored** | **float** |  | 
**flagged** | **float** |  | 
**flag_rate** | **float** |  | 
**avg_overall** | **float** |  | 
**breaches** | **float** |  | 
**items** | [**List[DashboardGroupsInnerItemsInner]**](DashboardGroupsInnerItemsInner.md) |  | 

## Example

```python
from latte_sdk.models.highlights_top_agents_inner import HighlightsTopAgentsInner

# TODO update the JSON string below
json = "{}"
# create an instance of HighlightsTopAgentsInner from a JSON string
highlights_top_agents_inner_instance = HighlightsTopAgentsInner.from_json(json)
# print the JSON string representation of the object
print(HighlightsTopAgentsInner.to_json())

# convert the object into a dict
highlights_top_agents_inner_dict = highlights_top_agents_inner_instance.to_dict()
# create an instance of HighlightsTopAgentsInner from a dict
highlights_top_agents_inner_from_dict = HighlightsTopAgentsInner.from_dict(highlights_top_agents_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



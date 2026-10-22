# HighlightsKpis


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**calls_scored** | [**HighlightsKpisCallsScored**](HighlightsKpisCallsScored.md) |  | 
**avg_score** | [**HighlightsKpisCallsScored**](HighlightsKpisCallsScored.md) |  | 
**flag_rate** | [**HighlightsKpisCallsScored**](HighlightsKpisCallsScored.md) |  | 
**breaches** | [**HighlightsKpisCallsScored**](HighlightsKpisCallsScored.md) |  | 
**review_backlog** | **float** |  | 

## Example

```python
from latte_sdk.models.highlights_kpis import HighlightsKpis

# TODO update the JSON string below
json = "{}"
# create an instance of HighlightsKpis from a JSON string
highlights_kpis_instance = HighlightsKpis.from_json(json)
# print the JSON string representation of the object
print(HighlightsKpis.to_json())

# convert the object into a dict
highlights_kpis_dict = highlights_kpis_instance.to_dict()
# create an instance of HighlightsKpis from a dict
highlights_kpis_from_dict = HighlightsKpis.from_dict(highlights_kpis_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



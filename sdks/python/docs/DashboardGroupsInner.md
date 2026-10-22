# DashboardGroupsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**calls_scored** | **float** |  | 
**flagged** | **float** |  | 
**flag_rate** | **float** |  | 
**avg_overall** | **float** |  | 
**items** | [**List[DashboardGroupsInnerItemsInner]**](DashboardGroupsInnerItemsInner.md) |  | 

## Example

```python
from latte_sdk.models.dashboard_groups_inner import DashboardGroupsInner

# TODO update the JSON string below
json = "{}"
# create an instance of DashboardGroupsInner from a JSON string
dashboard_groups_inner_instance = DashboardGroupsInner.from_json(json)
# print the JSON string representation of the object
print(DashboardGroupsInner.to_json())

# convert the object into a dict
dashboard_groups_inner_dict = dashboard_groups_inner_instance.to_dict()
# create an instance of DashboardGroupsInner from a dict
dashboard_groups_inner_from_dict = DashboardGroupsInner.from_dict(dashboard_groups_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



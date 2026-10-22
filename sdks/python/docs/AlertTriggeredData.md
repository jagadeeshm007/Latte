# AlertTriggeredData

An alert rule fired for a team, product or agent.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**rule_id** | **str** |  | 
**rule_name** | **str** |  | 
**metric** | **str** |  | 
**scope** | **str** |  | 
**item_key** | **str** | the rubric item, for an item fail-rate rule | 
**group_id** | **str** |  | 
**group_name** | **str** |  | 
**value** | **float** | the metric over the recent window | 
**baseline** | **float** | the metric over the baseline window | 
**calls** | **int** |  | 

## Example

```python
from latte_sdk.models.alert_triggered_data import AlertTriggeredData

# TODO update the JSON string below
json = "{}"
# create an instance of AlertTriggeredData from a JSON string
alert_triggered_data_instance = AlertTriggeredData.from_json(json)
# print the JSON string representation of the object
print(AlertTriggeredData.to_json())

# convert the object into a dict
alert_triggered_data_dict = alert_triggered_data_instance.to_dict()
# create an instance of AlertTriggeredData from a dict
alert_triggered_data_from_dict = AlertTriggeredData.from_dict(alert_triggered_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



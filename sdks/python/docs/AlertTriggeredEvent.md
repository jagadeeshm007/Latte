# AlertTriggeredEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | the event id; the same on every redelivery | 
**type** | **str** |  | 
**created_at** | **str** | ISO 8601 | 
**data** | [**AlertTriggeredData**](AlertTriggeredData.md) |  | 

## Example

```python
from latte_sdk.models.alert_triggered_event import AlertTriggeredEvent

# TODO update the JSON string below
json = "{}"
# create an instance of AlertTriggeredEvent from a JSON string
alert_triggered_event_instance = AlertTriggeredEvent.from_json(json)
# print the JSON string representation of the object
print(AlertTriggeredEvent.to_json())

# convert the object into a dict
alert_triggered_event_dict = alert_triggered_event_instance.to_dict()
# create an instance of AlertTriggeredEvent from a dict
alert_triggered_event_from_dict = AlertTriggeredEvent.from_dict(alert_triggered_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# ReferenceAgentsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**team_id** | **str** |  | 
**external_code** | **str** |  | 

## Example

```python
from latte_sdk.models.reference_agents_inner import ReferenceAgentsInner

# TODO update the JSON string below
json = "{}"
# create an instance of ReferenceAgentsInner from a JSON string
reference_agents_inner_instance = ReferenceAgentsInner.from_json(json)
# print the JSON string representation of the object
print(ReferenceAgentsInner.to_json())

# convert the object into a dict
reference_agents_inner_dict = reference_agents_inner_instance.to_dict()
# create an instance of ReferenceAgentsInner from a dict
reference_agents_inner_from_dict = ReferenceAgentsInner.from_dict(reference_agents_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



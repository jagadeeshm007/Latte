# DigestReadyData

A daily or weekly digest was built.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**frequency** | **str** |  | 
**var_from** | **str** |  | 
**to** | **str** |  | 
**kpis** | [**HighlightsKpis**](HighlightsKpis.md) |  | 

## Example

```python
from latte_sdk.models.digest_ready_data import DigestReadyData

# TODO update the JSON string below
json = "{}"
# create an instance of DigestReadyData from a JSON string
digest_ready_data_instance = DigestReadyData.from_json(json)
# print the JSON string representation of the object
print(DigestReadyData.to_json())

# convert the object into a dict
digest_ready_data_dict = digest_ready_data_instance.to_dict()
# create an instance of DigestReadyData from a dict
digest_ready_data_from_dict = DigestReadyData.from_dict(digest_ready_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



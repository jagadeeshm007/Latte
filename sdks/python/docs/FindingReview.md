# FindingReview


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**decision** | **str** |  | 
**note** | **str** |  | 
**reviewer_name** | **str** |  | 
**updated_at** | **str** |  | 

## Example

```python
from latte_sdk.models.finding_review import FindingReview

# TODO update the JSON string below
json = "{}"
# create an instance of FindingReview from a JSON string
finding_review_instance = FindingReview.from_json(json)
# print the JSON string representation of the object
print(FindingReview.to_json())

# convert the object into a dict
finding_review_dict = finding_review_instance.to_dict()
# create an instance of FindingReview from a dict
finding_review_from_dict = FindingReview.from_dict(finding_review_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



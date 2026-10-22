# FindingReview

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Decision** | **string** |  | 
**Note** | **NullableString** |  | 
**ReviewerName** | **string** |  | 
**UpdatedAt** | **string** |  | 

## Methods

### NewFindingReview

`func NewFindingReview(decision string, note NullableString, reviewerName string, updatedAt string, ) *FindingReview`

NewFindingReview instantiates a new FindingReview object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewFindingReviewWithDefaults

`func NewFindingReviewWithDefaults() *FindingReview`

NewFindingReviewWithDefaults instantiates a new FindingReview object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDecision

`func (o *FindingReview) GetDecision() string`

GetDecision returns the Decision field if non-nil, zero value otherwise.

### GetDecisionOk

`func (o *FindingReview) GetDecisionOk() (*string, bool)`

GetDecisionOk returns a tuple with the Decision field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDecision

`func (o *FindingReview) SetDecision(v string)`

SetDecision sets Decision field to given value.


### GetNote

`func (o *FindingReview) GetNote() string`

GetNote returns the Note field if non-nil, zero value otherwise.

### GetNoteOk

`func (o *FindingReview) GetNoteOk() (*string, bool)`

GetNoteOk returns a tuple with the Note field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNote

`func (o *FindingReview) SetNote(v string)`

SetNote sets Note field to given value.


### SetNoteNil

`func (o *FindingReview) SetNoteNil(b bool)`

 SetNoteNil sets the value for Note to be an explicit nil

### UnsetNote
`func (o *FindingReview) UnsetNote()`

UnsetNote ensures that no value is present for Note, not even an explicit nil
### GetReviewerName

`func (o *FindingReview) GetReviewerName() string`

GetReviewerName returns the ReviewerName field if non-nil, zero value otherwise.

### GetReviewerNameOk

`func (o *FindingReview) GetReviewerNameOk() (*string, bool)`

GetReviewerNameOk returns a tuple with the ReviewerName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReviewerName

`func (o *FindingReview) SetReviewerName(v string)`

SetReviewerName sets ReviewerName field to given value.


### GetUpdatedAt

`func (o *FindingReview) GetUpdatedAt() string`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *FindingReview) GetUpdatedAtOk() (*string, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *FindingReview) SetUpdatedAt(v string)`

SetUpdatedAt sets UpdatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



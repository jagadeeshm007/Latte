# CallDetail

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Call** | [**CallSummary**](CallSummary.md) |  | 
**AudioAvailable** | **bool** |  | 
**Score** | [**NullableCallDetailScore**](CallDetailScore.md) |  | 
**RubricItems** | [**[]CallDetailRubricItemsInner**](CallDetailRubricItemsInner.md) |  | 
**Segments** | [**[]Segment**](Segment.md) |  | 
**Findings** | [**[]Finding**](Finding.md) |  | 
**Redactions** | **float32** |  | [default to 0]

## Methods

### NewCallDetail

`func NewCallDetail(call CallSummary, audioAvailable bool, score NullableCallDetailScore, rubricItems []CallDetailRubricItemsInner, segments []Segment, findings []Finding, redactions float32, ) *CallDetail`

NewCallDetail instantiates a new CallDetail object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCallDetailWithDefaults

`func NewCallDetailWithDefaults() *CallDetail`

NewCallDetailWithDefaults instantiates a new CallDetail object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCall

`func (o *CallDetail) GetCall() CallSummary`

GetCall returns the Call field if non-nil, zero value otherwise.

### GetCallOk

`func (o *CallDetail) GetCallOk() (*CallSummary, bool)`

GetCallOk returns a tuple with the Call field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCall

`func (o *CallDetail) SetCall(v CallSummary)`

SetCall sets Call field to given value.


### GetAudioAvailable

`func (o *CallDetail) GetAudioAvailable() bool`

GetAudioAvailable returns the AudioAvailable field if non-nil, zero value otherwise.

### GetAudioAvailableOk

`func (o *CallDetail) GetAudioAvailableOk() (*bool, bool)`

GetAudioAvailableOk returns a tuple with the AudioAvailable field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAudioAvailable

`func (o *CallDetail) SetAudioAvailable(v bool)`

SetAudioAvailable sets AudioAvailable field to given value.


### GetScore

`func (o *CallDetail) GetScore() CallDetailScore`

GetScore returns the Score field if non-nil, zero value otherwise.

### GetScoreOk

`func (o *CallDetail) GetScoreOk() (*CallDetailScore, bool)`

GetScoreOk returns a tuple with the Score field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScore

`func (o *CallDetail) SetScore(v CallDetailScore)`

SetScore sets Score field to given value.


### SetScoreNil

`func (o *CallDetail) SetScoreNil(b bool)`

 SetScoreNil sets the value for Score to be an explicit nil

### UnsetScore
`func (o *CallDetail) UnsetScore()`

UnsetScore ensures that no value is present for Score, not even an explicit nil
### GetRubricItems

`func (o *CallDetail) GetRubricItems() []CallDetailRubricItemsInner`

GetRubricItems returns the RubricItems field if non-nil, zero value otherwise.

### GetRubricItemsOk

`func (o *CallDetail) GetRubricItemsOk() (*[]CallDetailRubricItemsInner, bool)`

GetRubricItemsOk returns a tuple with the RubricItems field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRubricItems

`func (o *CallDetail) SetRubricItems(v []CallDetailRubricItemsInner)`

SetRubricItems sets RubricItems field to given value.


### GetSegments

`func (o *CallDetail) GetSegments() []Segment`

GetSegments returns the Segments field if non-nil, zero value otherwise.

### GetSegmentsOk

`func (o *CallDetail) GetSegmentsOk() (*[]Segment, bool)`

GetSegmentsOk returns a tuple with the Segments field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSegments

`func (o *CallDetail) SetSegments(v []Segment)`

SetSegments sets Segments field to given value.


### GetFindings

`func (o *CallDetail) GetFindings() []Finding`

GetFindings returns the Findings field if non-nil, zero value otherwise.

### GetFindingsOk

`func (o *CallDetail) GetFindingsOk() (*[]Finding, bool)`

GetFindingsOk returns a tuple with the Findings field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFindings

`func (o *CallDetail) SetFindings(v []Finding)`

SetFindings sets Findings field to given value.


### GetRedactions

`func (o *CallDetail) GetRedactions() float32`

GetRedactions returns the Redactions field if non-nil, zero value otherwise.

### GetRedactionsOk

`func (o *CallDetail) GetRedactionsOk() (*float32, bool)`

GetRedactionsOk returns a tuple with the Redactions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRedactions

`func (o *CallDetail) SetRedactions(v float32)`

SetRedactions sets Redactions field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



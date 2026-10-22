# CallDetailScore

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**RubricVersion** | **float32** |  | 
**TalkRatio** | **float32** |  | 
**CoachingNotes** | **[]string** |  | 
**JudgeError** | **NullableString** |  | 
**ReviewedBy** | **NullableString** |  | 
**ReviewedAt** | **NullableString** |  | 

## Methods

### NewCallDetailScore

`func NewCallDetailScore(id string, rubricVersion float32, talkRatio float32, coachingNotes []string, judgeError NullableString, reviewedBy NullableString, reviewedAt NullableString, ) *CallDetailScore`

NewCallDetailScore instantiates a new CallDetailScore object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCallDetailScoreWithDefaults

`func NewCallDetailScoreWithDefaults() *CallDetailScore`

NewCallDetailScoreWithDefaults instantiates a new CallDetailScore object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CallDetailScore) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CallDetailScore) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CallDetailScore) SetId(v string)`

SetId sets Id field to given value.


### GetRubricVersion

`func (o *CallDetailScore) GetRubricVersion() float32`

GetRubricVersion returns the RubricVersion field if non-nil, zero value otherwise.

### GetRubricVersionOk

`func (o *CallDetailScore) GetRubricVersionOk() (*float32, bool)`

GetRubricVersionOk returns a tuple with the RubricVersion field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRubricVersion

`func (o *CallDetailScore) SetRubricVersion(v float32)`

SetRubricVersion sets RubricVersion field to given value.


### GetTalkRatio

`func (o *CallDetailScore) GetTalkRatio() float32`

GetTalkRatio returns the TalkRatio field if non-nil, zero value otherwise.

### GetTalkRatioOk

`func (o *CallDetailScore) GetTalkRatioOk() (*float32, bool)`

GetTalkRatioOk returns a tuple with the TalkRatio field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTalkRatio

`func (o *CallDetailScore) SetTalkRatio(v float32)`

SetTalkRatio sets TalkRatio field to given value.


### GetCoachingNotes

`func (o *CallDetailScore) GetCoachingNotes() []string`

GetCoachingNotes returns the CoachingNotes field if non-nil, zero value otherwise.

### GetCoachingNotesOk

`func (o *CallDetailScore) GetCoachingNotesOk() (*[]string, bool)`

GetCoachingNotesOk returns a tuple with the CoachingNotes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCoachingNotes

`func (o *CallDetailScore) SetCoachingNotes(v []string)`

SetCoachingNotes sets CoachingNotes field to given value.


### GetJudgeError

`func (o *CallDetailScore) GetJudgeError() string`

GetJudgeError returns the JudgeError field if non-nil, zero value otherwise.

### GetJudgeErrorOk

`func (o *CallDetailScore) GetJudgeErrorOk() (*string, bool)`

GetJudgeErrorOk returns a tuple with the JudgeError field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetJudgeError

`func (o *CallDetailScore) SetJudgeError(v string)`

SetJudgeError sets JudgeError field to given value.


### SetJudgeErrorNil

`func (o *CallDetailScore) SetJudgeErrorNil(b bool)`

 SetJudgeErrorNil sets the value for JudgeError to be an explicit nil

### UnsetJudgeError
`func (o *CallDetailScore) UnsetJudgeError()`

UnsetJudgeError ensures that no value is present for JudgeError, not even an explicit nil
### GetReviewedBy

`func (o *CallDetailScore) GetReviewedBy() string`

GetReviewedBy returns the ReviewedBy field if non-nil, zero value otherwise.

### GetReviewedByOk

`func (o *CallDetailScore) GetReviewedByOk() (*string, bool)`

GetReviewedByOk returns a tuple with the ReviewedBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReviewedBy

`func (o *CallDetailScore) SetReviewedBy(v string)`

SetReviewedBy sets ReviewedBy field to given value.


### SetReviewedByNil

`func (o *CallDetailScore) SetReviewedByNil(b bool)`

 SetReviewedByNil sets the value for ReviewedBy to be an explicit nil

### UnsetReviewedBy
`func (o *CallDetailScore) UnsetReviewedBy()`

UnsetReviewedBy ensures that no value is present for ReviewedBy, not even an explicit nil
### GetReviewedAt

`func (o *CallDetailScore) GetReviewedAt() string`

GetReviewedAt returns the ReviewedAt field if non-nil, zero value otherwise.

### GetReviewedAtOk

`func (o *CallDetailScore) GetReviewedAtOk() (*string, bool)`

GetReviewedAtOk returns a tuple with the ReviewedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReviewedAt

`func (o *CallDetailScore) SetReviewedAt(v string)`

SetReviewedAt sets ReviewedAt field to given value.


### SetReviewedAtNil

`func (o *CallDetailScore) SetReviewedAtNil(b bool)`

 SetReviewedAtNil sets the value for ReviewedAt to be an explicit nil

### UnsetReviewedAt
`func (o *CallDetailScore) UnsetReviewedAt()`

UnsetReviewedAt ensures that no value is present for ReviewedAt, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# CallScoredData

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CallId** | **string** |  | 
**BatchId** | **string** |  | 
**AgentId** | **string** |  | 
**TeamId** | **string** |  | 
**ProductId** | **string** |  | 
**OverallScore** | **NullableFloat32** | 0 to 100; null when the judge could not score | 
**NeedsReview** | **NullableBool** | true when QA should look at the call | 
**JudgeStatus** | **NullableString** | ok, or why the judge failed | 
**Breaches** | **int32** | prohibited statements found | 

## Methods

### NewCallScoredData

`func NewCallScoredData(callId string, batchId string, agentId string, teamId string, productId string, overallScore NullableFloat32, needsReview NullableBool, judgeStatus NullableString, breaches int32, ) *CallScoredData`

NewCallScoredData instantiates a new CallScoredData object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCallScoredDataWithDefaults

`func NewCallScoredDataWithDefaults() *CallScoredData`

NewCallScoredDataWithDefaults instantiates a new CallScoredData object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCallId

`func (o *CallScoredData) GetCallId() string`

GetCallId returns the CallId field if non-nil, zero value otherwise.

### GetCallIdOk

`func (o *CallScoredData) GetCallIdOk() (*string, bool)`

GetCallIdOk returns a tuple with the CallId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCallId

`func (o *CallScoredData) SetCallId(v string)`

SetCallId sets CallId field to given value.


### GetBatchId

`func (o *CallScoredData) GetBatchId() string`

GetBatchId returns the BatchId field if non-nil, zero value otherwise.

### GetBatchIdOk

`func (o *CallScoredData) GetBatchIdOk() (*string, bool)`

GetBatchIdOk returns a tuple with the BatchId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchId

`func (o *CallScoredData) SetBatchId(v string)`

SetBatchId sets BatchId field to given value.


### GetAgentId

`func (o *CallScoredData) GetAgentId() string`

GetAgentId returns the AgentId field if non-nil, zero value otherwise.

### GetAgentIdOk

`func (o *CallScoredData) GetAgentIdOk() (*string, bool)`

GetAgentIdOk returns a tuple with the AgentId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAgentId

`func (o *CallScoredData) SetAgentId(v string)`

SetAgentId sets AgentId field to given value.


### GetTeamId

`func (o *CallScoredData) GetTeamId() string`

GetTeamId returns the TeamId field if non-nil, zero value otherwise.

### GetTeamIdOk

`func (o *CallScoredData) GetTeamIdOk() (*string, bool)`

GetTeamIdOk returns a tuple with the TeamId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTeamId

`func (o *CallScoredData) SetTeamId(v string)`

SetTeamId sets TeamId field to given value.


### GetProductId

`func (o *CallScoredData) GetProductId() string`

GetProductId returns the ProductId field if non-nil, zero value otherwise.

### GetProductIdOk

`func (o *CallScoredData) GetProductIdOk() (*string, bool)`

GetProductIdOk returns a tuple with the ProductId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProductId

`func (o *CallScoredData) SetProductId(v string)`

SetProductId sets ProductId field to given value.


### GetOverallScore

`func (o *CallScoredData) GetOverallScore() float32`

GetOverallScore returns the OverallScore field if non-nil, zero value otherwise.

### GetOverallScoreOk

`func (o *CallScoredData) GetOverallScoreOk() (*float32, bool)`

GetOverallScoreOk returns a tuple with the OverallScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOverallScore

`func (o *CallScoredData) SetOverallScore(v float32)`

SetOverallScore sets OverallScore field to given value.


### SetOverallScoreNil

`func (o *CallScoredData) SetOverallScoreNil(b bool)`

 SetOverallScoreNil sets the value for OverallScore to be an explicit nil

### UnsetOverallScore
`func (o *CallScoredData) UnsetOverallScore()`

UnsetOverallScore ensures that no value is present for OverallScore, not even an explicit nil
### GetNeedsReview

`func (o *CallScoredData) GetNeedsReview() bool`

GetNeedsReview returns the NeedsReview field if non-nil, zero value otherwise.

### GetNeedsReviewOk

`func (o *CallScoredData) GetNeedsReviewOk() (*bool, bool)`

GetNeedsReviewOk returns a tuple with the NeedsReview field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNeedsReview

`func (o *CallScoredData) SetNeedsReview(v bool)`

SetNeedsReview sets NeedsReview field to given value.


### SetNeedsReviewNil

`func (o *CallScoredData) SetNeedsReviewNil(b bool)`

 SetNeedsReviewNil sets the value for NeedsReview to be an explicit nil

### UnsetNeedsReview
`func (o *CallScoredData) UnsetNeedsReview()`

UnsetNeedsReview ensures that no value is present for NeedsReview, not even an explicit nil
### GetJudgeStatus

`func (o *CallScoredData) GetJudgeStatus() string`

GetJudgeStatus returns the JudgeStatus field if non-nil, zero value otherwise.

### GetJudgeStatusOk

`func (o *CallScoredData) GetJudgeStatusOk() (*string, bool)`

GetJudgeStatusOk returns a tuple with the JudgeStatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetJudgeStatus

`func (o *CallScoredData) SetJudgeStatus(v string)`

SetJudgeStatus sets JudgeStatus field to given value.


### SetJudgeStatusNil

`func (o *CallScoredData) SetJudgeStatusNil(b bool)`

 SetJudgeStatusNil sets the value for JudgeStatus to be an explicit nil

### UnsetJudgeStatus
`func (o *CallScoredData) UnsetJudgeStatus()`

UnsetJudgeStatus ensures that no value is present for JudgeStatus, not even an explicit nil
### GetBreaches

`func (o *CallScoredData) GetBreaches() int32`

GetBreaches returns the Breaches field if non-nil, zero value otherwise.

### GetBreachesOk

`func (o *CallScoredData) GetBreachesOk() (*int32, bool)`

GetBreachesOk returns a tuple with the Breaches field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBreaches

`func (o *CallScoredData) SetBreaches(v int32)`

SetBreaches sets Breaches field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# CallSummary

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**AgentId** | **string** |  | 
**AgentName** | **string** |  | 
**TeamName** | **string** |  | 
**ProductName** | **string** |  | 
**CallDate** | **string** |  | 
**OriginalFilename** | **string** |  | 
**Language** | **string** |  | 
**Status** | **string** |  | 
**Error** | **NullableString** |  | 
**DurationMs** | **NullableFloat32** |  | 
**CreatedAt** | **string** |  | 
**OverallScore** | **NullableFloat32** |  | 
**JudgeStatus** | **NullableString** |  | 
**NeedsReview** | **NullableBool** |  | 
**ReviewStatus** | **NullableString** |  | 
**Breaches** | **float32** |  | 
**Missed** | **float32** |  | 
**Flag** | **string** |  | 
**ArchivedAt** | **NullableString** |  | 
**BatchId** | **string** |  | 
**BatchName** | **string** |  | 
**Input** | **string** |  | [default to "audio"]
**Timed** | **bool** |  | [default to true]

## Methods

### NewCallSummary

`func NewCallSummary(id string, agentId string, agentName string, teamName string, productName string, callDate string, originalFilename string, language string, status string, error_ NullableString, durationMs NullableFloat32, createdAt string, overallScore NullableFloat32, judgeStatus NullableString, needsReview NullableBool, reviewStatus NullableString, breaches float32, missed float32, flag string, archivedAt NullableString, batchId string, batchName string, input string, timed bool, ) *CallSummary`

NewCallSummary instantiates a new CallSummary object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCallSummaryWithDefaults

`func NewCallSummaryWithDefaults() *CallSummary`

NewCallSummaryWithDefaults instantiates a new CallSummary object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CallSummary) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CallSummary) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CallSummary) SetId(v string)`

SetId sets Id field to given value.


### GetAgentId

`func (o *CallSummary) GetAgentId() string`

GetAgentId returns the AgentId field if non-nil, zero value otherwise.

### GetAgentIdOk

`func (o *CallSummary) GetAgentIdOk() (*string, bool)`

GetAgentIdOk returns a tuple with the AgentId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAgentId

`func (o *CallSummary) SetAgentId(v string)`

SetAgentId sets AgentId field to given value.


### GetAgentName

`func (o *CallSummary) GetAgentName() string`

GetAgentName returns the AgentName field if non-nil, zero value otherwise.

### GetAgentNameOk

`func (o *CallSummary) GetAgentNameOk() (*string, bool)`

GetAgentNameOk returns a tuple with the AgentName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAgentName

`func (o *CallSummary) SetAgentName(v string)`

SetAgentName sets AgentName field to given value.


### GetTeamName

`func (o *CallSummary) GetTeamName() string`

GetTeamName returns the TeamName field if non-nil, zero value otherwise.

### GetTeamNameOk

`func (o *CallSummary) GetTeamNameOk() (*string, bool)`

GetTeamNameOk returns a tuple with the TeamName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTeamName

`func (o *CallSummary) SetTeamName(v string)`

SetTeamName sets TeamName field to given value.


### GetProductName

`func (o *CallSummary) GetProductName() string`

GetProductName returns the ProductName field if non-nil, zero value otherwise.

### GetProductNameOk

`func (o *CallSummary) GetProductNameOk() (*string, bool)`

GetProductNameOk returns a tuple with the ProductName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProductName

`func (o *CallSummary) SetProductName(v string)`

SetProductName sets ProductName field to given value.


### GetCallDate

`func (o *CallSummary) GetCallDate() string`

GetCallDate returns the CallDate field if non-nil, zero value otherwise.

### GetCallDateOk

`func (o *CallSummary) GetCallDateOk() (*string, bool)`

GetCallDateOk returns a tuple with the CallDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCallDate

`func (o *CallSummary) SetCallDate(v string)`

SetCallDate sets CallDate field to given value.


### GetOriginalFilename

`func (o *CallSummary) GetOriginalFilename() string`

GetOriginalFilename returns the OriginalFilename field if non-nil, zero value otherwise.

### GetOriginalFilenameOk

`func (o *CallSummary) GetOriginalFilenameOk() (*string, bool)`

GetOriginalFilenameOk returns a tuple with the OriginalFilename field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOriginalFilename

`func (o *CallSummary) SetOriginalFilename(v string)`

SetOriginalFilename sets OriginalFilename field to given value.


### GetLanguage

`func (o *CallSummary) GetLanguage() string`

GetLanguage returns the Language field if non-nil, zero value otherwise.

### GetLanguageOk

`func (o *CallSummary) GetLanguageOk() (*string, bool)`

GetLanguageOk returns a tuple with the Language field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLanguage

`func (o *CallSummary) SetLanguage(v string)`

SetLanguage sets Language field to given value.


### GetStatus

`func (o *CallSummary) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *CallSummary) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *CallSummary) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetError

`func (o *CallSummary) GetError() string`

GetError returns the Error field if non-nil, zero value otherwise.

### GetErrorOk

`func (o *CallSummary) GetErrorOk() (*string, bool)`

GetErrorOk returns a tuple with the Error field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetError

`func (o *CallSummary) SetError(v string)`

SetError sets Error field to given value.


### SetErrorNil

`func (o *CallSummary) SetErrorNil(b bool)`

 SetErrorNil sets the value for Error to be an explicit nil

### UnsetError
`func (o *CallSummary) UnsetError()`

UnsetError ensures that no value is present for Error, not even an explicit nil
### GetDurationMs

`func (o *CallSummary) GetDurationMs() float32`

GetDurationMs returns the DurationMs field if non-nil, zero value otherwise.

### GetDurationMsOk

`func (o *CallSummary) GetDurationMsOk() (*float32, bool)`

GetDurationMsOk returns a tuple with the DurationMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDurationMs

`func (o *CallSummary) SetDurationMs(v float32)`

SetDurationMs sets DurationMs field to given value.


### SetDurationMsNil

`func (o *CallSummary) SetDurationMsNil(b bool)`

 SetDurationMsNil sets the value for DurationMs to be an explicit nil

### UnsetDurationMs
`func (o *CallSummary) UnsetDurationMs()`

UnsetDurationMs ensures that no value is present for DurationMs, not even an explicit nil
### GetCreatedAt

`func (o *CallSummary) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CallSummary) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CallSummary) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetOverallScore

`func (o *CallSummary) GetOverallScore() float32`

GetOverallScore returns the OverallScore field if non-nil, zero value otherwise.

### GetOverallScoreOk

`func (o *CallSummary) GetOverallScoreOk() (*float32, bool)`

GetOverallScoreOk returns a tuple with the OverallScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOverallScore

`func (o *CallSummary) SetOverallScore(v float32)`

SetOverallScore sets OverallScore field to given value.


### SetOverallScoreNil

`func (o *CallSummary) SetOverallScoreNil(b bool)`

 SetOverallScoreNil sets the value for OverallScore to be an explicit nil

### UnsetOverallScore
`func (o *CallSummary) UnsetOverallScore()`

UnsetOverallScore ensures that no value is present for OverallScore, not even an explicit nil
### GetJudgeStatus

`func (o *CallSummary) GetJudgeStatus() string`

GetJudgeStatus returns the JudgeStatus field if non-nil, zero value otherwise.

### GetJudgeStatusOk

`func (o *CallSummary) GetJudgeStatusOk() (*string, bool)`

GetJudgeStatusOk returns a tuple with the JudgeStatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetJudgeStatus

`func (o *CallSummary) SetJudgeStatus(v string)`

SetJudgeStatus sets JudgeStatus field to given value.


### SetJudgeStatusNil

`func (o *CallSummary) SetJudgeStatusNil(b bool)`

 SetJudgeStatusNil sets the value for JudgeStatus to be an explicit nil

### UnsetJudgeStatus
`func (o *CallSummary) UnsetJudgeStatus()`

UnsetJudgeStatus ensures that no value is present for JudgeStatus, not even an explicit nil
### GetNeedsReview

`func (o *CallSummary) GetNeedsReview() bool`

GetNeedsReview returns the NeedsReview field if non-nil, zero value otherwise.

### GetNeedsReviewOk

`func (o *CallSummary) GetNeedsReviewOk() (*bool, bool)`

GetNeedsReviewOk returns a tuple with the NeedsReview field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNeedsReview

`func (o *CallSummary) SetNeedsReview(v bool)`

SetNeedsReview sets NeedsReview field to given value.


### SetNeedsReviewNil

`func (o *CallSummary) SetNeedsReviewNil(b bool)`

 SetNeedsReviewNil sets the value for NeedsReview to be an explicit nil

### UnsetNeedsReview
`func (o *CallSummary) UnsetNeedsReview()`

UnsetNeedsReview ensures that no value is present for NeedsReview, not even an explicit nil
### GetReviewStatus

`func (o *CallSummary) GetReviewStatus() string`

GetReviewStatus returns the ReviewStatus field if non-nil, zero value otherwise.

### GetReviewStatusOk

`func (o *CallSummary) GetReviewStatusOk() (*string, bool)`

GetReviewStatusOk returns a tuple with the ReviewStatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReviewStatus

`func (o *CallSummary) SetReviewStatus(v string)`

SetReviewStatus sets ReviewStatus field to given value.


### SetReviewStatusNil

`func (o *CallSummary) SetReviewStatusNil(b bool)`

 SetReviewStatusNil sets the value for ReviewStatus to be an explicit nil

### UnsetReviewStatus
`func (o *CallSummary) UnsetReviewStatus()`

UnsetReviewStatus ensures that no value is present for ReviewStatus, not even an explicit nil
### GetBreaches

`func (o *CallSummary) GetBreaches() float32`

GetBreaches returns the Breaches field if non-nil, zero value otherwise.

### GetBreachesOk

`func (o *CallSummary) GetBreachesOk() (*float32, bool)`

GetBreachesOk returns a tuple with the Breaches field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBreaches

`func (o *CallSummary) SetBreaches(v float32)`

SetBreaches sets Breaches field to given value.


### GetMissed

`func (o *CallSummary) GetMissed() float32`

GetMissed returns the Missed field if non-nil, zero value otherwise.

### GetMissedOk

`func (o *CallSummary) GetMissedOk() (*float32, bool)`

GetMissedOk returns a tuple with the Missed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMissed

`func (o *CallSummary) SetMissed(v float32)`

SetMissed sets Missed field to given value.


### GetFlag

`func (o *CallSummary) GetFlag() string`

GetFlag returns the Flag field if non-nil, zero value otherwise.

### GetFlagOk

`func (o *CallSummary) GetFlagOk() (*string, bool)`

GetFlagOk returns a tuple with the Flag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFlag

`func (o *CallSummary) SetFlag(v string)`

SetFlag sets Flag field to given value.


### GetArchivedAt

`func (o *CallSummary) GetArchivedAt() string`

GetArchivedAt returns the ArchivedAt field if non-nil, zero value otherwise.

### GetArchivedAtOk

`func (o *CallSummary) GetArchivedAtOk() (*string, bool)`

GetArchivedAtOk returns a tuple with the ArchivedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetArchivedAt

`func (o *CallSummary) SetArchivedAt(v string)`

SetArchivedAt sets ArchivedAt field to given value.


### SetArchivedAtNil

`func (o *CallSummary) SetArchivedAtNil(b bool)`

 SetArchivedAtNil sets the value for ArchivedAt to be an explicit nil

### UnsetArchivedAt
`func (o *CallSummary) UnsetArchivedAt()`

UnsetArchivedAt ensures that no value is present for ArchivedAt, not even an explicit nil
### GetBatchId

`func (o *CallSummary) GetBatchId() string`

GetBatchId returns the BatchId field if non-nil, zero value otherwise.

### GetBatchIdOk

`func (o *CallSummary) GetBatchIdOk() (*string, bool)`

GetBatchIdOk returns a tuple with the BatchId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchId

`func (o *CallSummary) SetBatchId(v string)`

SetBatchId sets BatchId field to given value.


### GetBatchName

`func (o *CallSummary) GetBatchName() string`

GetBatchName returns the BatchName field if non-nil, zero value otherwise.

### GetBatchNameOk

`func (o *CallSummary) GetBatchNameOk() (*string, bool)`

GetBatchNameOk returns a tuple with the BatchName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchName

`func (o *CallSummary) SetBatchName(v string)`

SetBatchName sets BatchName field to given value.


### GetInput

`func (o *CallSummary) GetInput() string`

GetInput returns the Input field if non-nil, zero value otherwise.

### GetInputOk

`func (o *CallSummary) GetInputOk() (*string, bool)`

GetInputOk returns a tuple with the Input field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInput

`func (o *CallSummary) SetInput(v string)`

SetInput sets Input field to given value.


### GetTimed

`func (o *CallSummary) GetTimed() bool`

GetTimed returns the Timed field if non-nil, zero value otherwise.

### GetTimedOk

`func (o *CallSummary) GetTimedOk() (*bool, bool)`

GetTimedOk returns a tuple with the Timed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimed

`func (o *CallSummary) SetTimed(v bool)`

SetTimed sets Timed field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



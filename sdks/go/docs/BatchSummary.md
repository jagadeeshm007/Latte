# BatchSummary

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Name** | **string** |  | 
**Source** | **string** |  | 
**CreatedBy** | **string** |  | 
**CreatedByName** | **string** |  | 
**CreatedAt** | **string** |  | 
**ArchivedAt** | **NullableString** |  | 
**Total** | **float32** |  | 
**Queued** | **float32** |  | 
**Processing** | **float32** |  | 
**Scored** | **float32** |  | 
**Failed** | **float32** |  | 
**Flagged** | **float32** |  | 
**AvgScore** | **NullableFloat32** |  | 
**State** | **string** |  | 

## Methods

### NewBatchSummary

`func NewBatchSummary(id string, name string, source string, createdBy string, createdByName string, createdAt string, archivedAt NullableString, total float32, queued float32, processing float32, scored float32, failed float32, flagged float32, avgScore NullableFloat32, state string, ) *BatchSummary`

NewBatchSummary instantiates a new BatchSummary object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewBatchSummaryWithDefaults

`func NewBatchSummaryWithDefaults() *BatchSummary`

NewBatchSummaryWithDefaults instantiates a new BatchSummary object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *BatchSummary) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *BatchSummary) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *BatchSummary) SetId(v string)`

SetId sets Id field to given value.


### GetName

`func (o *BatchSummary) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *BatchSummary) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *BatchSummary) SetName(v string)`

SetName sets Name field to given value.


### GetSource

`func (o *BatchSummary) GetSource() string`

GetSource returns the Source field if non-nil, zero value otherwise.

### GetSourceOk

`func (o *BatchSummary) GetSourceOk() (*string, bool)`

GetSourceOk returns a tuple with the Source field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSource

`func (o *BatchSummary) SetSource(v string)`

SetSource sets Source field to given value.


### GetCreatedBy

`func (o *BatchSummary) GetCreatedBy() string`

GetCreatedBy returns the CreatedBy field if non-nil, zero value otherwise.

### GetCreatedByOk

`func (o *BatchSummary) GetCreatedByOk() (*string, bool)`

GetCreatedByOk returns a tuple with the CreatedBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedBy

`func (o *BatchSummary) SetCreatedBy(v string)`

SetCreatedBy sets CreatedBy field to given value.


### GetCreatedByName

`func (o *BatchSummary) GetCreatedByName() string`

GetCreatedByName returns the CreatedByName field if non-nil, zero value otherwise.

### GetCreatedByNameOk

`func (o *BatchSummary) GetCreatedByNameOk() (*string, bool)`

GetCreatedByNameOk returns a tuple with the CreatedByName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedByName

`func (o *BatchSummary) SetCreatedByName(v string)`

SetCreatedByName sets CreatedByName field to given value.


### GetCreatedAt

`func (o *BatchSummary) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *BatchSummary) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *BatchSummary) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetArchivedAt

`func (o *BatchSummary) GetArchivedAt() string`

GetArchivedAt returns the ArchivedAt field if non-nil, zero value otherwise.

### GetArchivedAtOk

`func (o *BatchSummary) GetArchivedAtOk() (*string, bool)`

GetArchivedAtOk returns a tuple with the ArchivedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetArchivedAt

`func (o *BatchSummary) SetArchivedAt(v string)`

SetArchivedAt sets ArchivedAt field to given value.


### SetArchivedAtNil

`func (o *BatchSummary) SetArchivedAtNil(b bool)`

 SetArchivedAtNil sets the value for ArchivedAt to be an explicit nil

### UnsetArchivedAt
`func (o *BatchSummary) UnsetArchivedAt()`

UnsetArchivedAt ensures that no value is present for ArchivedAt, not even an explicit nil
### GetTotal

`func (o *BatchSummary) GetTotal() float32`

GetTotal returns the Total field if non-nil, zero value otherwise.

### GetTotalOk

`func (o *BatchSummary) GetTotalOk() (*float32, bool)`

GetTotalOk returns a tuple with the Total field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotal

`func (o *BatchSummary) SetTotal(v float32)`

SetTotal sets Total field to given value.


### GetQueued

`func (o *BatchSummary) GetQueued() float32`

GetQueued returns the Queued field if non-nil, zero value otherwise.

### GetQueuedOk

`func (o *BatchSummary) GetQueuedOk() (*float32, bool)`

GetQueuedOk returns a tuple with the Queued field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQueued

`func (o *BatchSummary) SetQueued(v float32)`

SetQueued sets Queued field to given value.


### GetProcessing

`func (o *BatchSummary) GetProcessing() float32`

GetProcessing returns the Processing field if non-nil, zero value otherwise.

### GetProcessingOk

`func (o *BatchSummary) GetProcessingOk() (*float32, bool)`

GetProcessingOk returns a tuple with the Processing field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProcessing

`func (o *BatchSummary) SetProcessing(v float32)`

SetProcessing sets Processing field to given value.


### GetScored

`func (o *BatchSummary) GetScored() float32`

GetScored returns the Scored field if non-nil, zero value otherwise.

### GetScoredOk

`func (o *BatchSummary) GetScoredOk() (*float32, bool)`

GetScoredOk returns a tuple with the Scored field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScored

`func (o *BatchSummary) SetScored(v float32)`

SetScored sets Scored field to given value.


### GetFailed

`func (o *BatchSummary) GetFailed() float32`

GetFailed returns the Failed field if non-nil, zero value otherwise.

### GetFailedOk

`func (o *BatchSummary) GetFailedOk() (*float32, bool)`

GetFailedOk returns a tuple with the Failed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailed

`func (o *BatchSummary) SetFailed(v float32)`

SetFailed sets Failed field to given value.


### GetFlagged

`func (o *BatchSummary) GetFlagged() float32`

GetFlagged returns the Flagged field if non-nil, zero value otherwise.

### GetFlaggedOk

`func (o *BatchSummary) GetFlaggedOk() (*float32, bool)`

GetFlaggedOk returns a tuple with the Flagged field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFlagged

`func (o *BatchSummary) SetFlagged(v float32)`

SetFlagged sets Flagged field to given value.


### GetAvgScore

`func (o *BatchSummary) GetAvgScore() float32`

GetAvgScore returns the AvgScore field if non-nil, zero value otherwise.

### GetAvgScoreOk

`func (o *BatchSummary) GetAvgScoreOk() (*float32, bool)`

GetAvgScoreOk returns a tuple with the AvgScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvgScore

`func (o *BatchSummary) SetAvgScore(v float32)`

SetAvgScore sets AvgScore field to given value.


### SetAvgScoreNil

`func (o *BatchSummary) SetAvgScoreNil(b bool)`

 SetAvgScoreNil sets the value for AvgScore to be an explicit nil

### UnsetAvgScore
`func (o *BatchSummary) UnsetAvgScore()`

UnsetAvgScore ensures that no value is present for AvgScore, not even an explicit nil
### GetState

`func (o *BatchSummary) GetState() string`

GetState returns the State field if non-nil, zero value otherwise.

### GetStateOk

`func (o *BatchSummary) GetStateOk() (*string, bool)`

GetStateOk returns a tuple with the State field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetState

`func (o *BatchSummary) SetState(v string)`

SetState sets State field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



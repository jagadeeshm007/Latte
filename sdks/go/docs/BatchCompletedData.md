# BatchCompletedData

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**BatchId** | **string** |  | 
**Name** | **string** |  | 
**Total** | **int32** |  | 
**Scored** | **int32** |  | 
**Failed** | **int32** |  | 

## Methods

### NewBatchCompletedData

`func NewBatchCompletedData(batchId string, name string, total int32, scored int32, failed int32, ) *BatchCompletedData`

NewBatchCompletedData instantiates a new BatchCompletedData object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewBatchCompletedDataWithDefaults

`func NewBatchCompletedDataWithDefaults() *BatchCompletedData`

NewBatchCompletedDataWithDefaults instantiates a new BatchCompletedData object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetBatchId

`func (o *BatchCompletedData) GetBatchId() string`

GetBatchId returns the BatchId field if non-nil, zero value otherwise.

### GetBatchIdOk

`func (o *BatchCompletedData) GetBatchIdOk() (*string, bool)`

GetBatchIdOk returns a tuple with the BatchId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchId

`func (o *BatchCompletedData) SetBatchId(v string)`

SetBatchId sets BatchId field to given value.


### GetName

`func (o *BatchCompletedData) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *BatchCompletedData) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *BatchCompletedData) SetName(v string)`

SetName sets Name field to given value.


### GetTotal

`func (o *BatchCompletedData) GetTotal() int32`

GetTotal returns the Total field if non-nil, zero value otherwise.

### GetTotalOk

`func (o *BatchCompletedData) GetTotalOk() (*int32, bool)`

GetTotalOk returns a tuple with the Total field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotal

`func (o *BatchCompletedData) SetTotal(v int32)`

SetTotal sets Total field to given value.


### GetScored

`func (o *BatchCompletedData) GetScored() int32`

GetScored returns the Scored field if non-nil, zero value otherwise.

### GetScoredOk

`func (o *BatchCompletedData) GetScoredOk() (*int32, bool)`

GetScoredOk returns a tuple with the Scored field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScored

`func (o *BatchCompletedData) SetScored(v int32)`

SetScored sets Scored field to given value.


### GetFailed

`func (o *BatchCompletedData) GetFailed() int32`

GetFailed returns the Failed field if non-nil, zero value otherwise.

### GetFailedOk

`func (o *BatchCompletedData) GetFailedOk() (*int32, bool)`

GetFailedOk returns a tuple with the Failed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailed

`func (o *BatchCompletedData) SetFailed(v int32)`

SetFailed sets Failed field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



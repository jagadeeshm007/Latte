# UploadConfirmRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Files** | [**[]UploadConfirmRequestFilesInner**](UploadConfirmRequestFilesInner.md) |  | 
**BatchId** | Pointer to **string** |  | [optional] 
**BatchName** | Pointer to **string** |  | [optional] 

## Methods

### NewUploadConfirmRequest

`func NewUploadConfirmRequest(files []UploadConfirmRequestFilesInner, ) *UploadConfirmRequest`

NewUploadConfirmRequest instantiates a new UploadConfirmRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUploadConfirmRequestWithDefaults

`func NewUploadConfirmRequestWithDefaults() *UploadConfirmRequest`

NewUploadConfirmRequestWithDefaults instantiates a new UploadConfirmRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetFiles

`func (o *UploadConfirmRequest) GetFiles() []UploadConfirmRequestFilesInner`

GetFiles returns the Files field if non-nil, zero value otherwise.

### GetFilesOk

`func (o *UploadConfirmRequest) GetFilesOk() (*[]UploadConfirmRequestFilesInner, bool)`

GetFilesOk returns a tuple with the Files field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFiles

`func (o *UploadConfirmRequest) SetFiles(v []UploadConfirmRequestFilesInner)`

SetFiles sets Files field to given value.


### GetBatchId

`func (o *UploadConfirmRequest) GetBatchId() string`

GetBatchId returns the BatchId field if non-nil, zero value otherwise.

### GetBatchIdOk

`func (o *UploadConfirmRequest) GetBatchIdOk() (*string, bool)`

GetBatchIdOk returns a tuple with the BatchId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchId

`func (o *UploadConfirmRequest) SetBatchId(v string)`

SetBatchId sets BatchId field to given value.

### HasBatchId

`func (o *UploadConfirmRequest) HasBatchId() bool`

HasBatchId returns a boolean if a field has been set.

### GetBatchName

`func (o *UploadConfirmRequest) GetBatchName() string`

GetBatchName returns the BatchName field if non-nil, zero value otherwise.

### GetBatchNameOk

`func (o *UploadConfirmRequest) GetBatchNameOk() (*string, bool)`

GetBatchNameOk returns a tuple with the BatchName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchName

`func (o *UploadConfirmRequest) SetBatchName(v string)`

SetBatchName sets BatchName field to given value.

### HasBatchName

`func (o *UploadConfirmRequest) HasBatchName() bool`

HasBatchName returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



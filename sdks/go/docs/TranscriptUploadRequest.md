# TranscriptUploadRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Transcripts** | [**[]TranscriptUploadRequestTranscriptsInner**](TranscriptUploadRequestTranscriptsInner.md) |  | 
**BatchId** | Pointer to **string** |  | [optional] 
**BatchName** | Pointer to **string** |  | [optional] 

## Methods

### NewTranscriptUploadRequest

`func NewTranscriptUploadRequest(transcripts []TranscriptUploadRequestTranscriptsInner, ) *TranscriptUploadRequest`

NewTranscriptUploadRequest instantiates a new TranscriptUploadRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTranscriptUploadRequestWithDefaults

`func NewTranscriptUploadRequestWithDefaults() *TranscriptUploadRequest`

NewTranscriptUploadRequestWithDefaults instantiates a new TranscriptUploadRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTranscripts

`func (o *TranscriptUploadRequest) GetTranscripts() []TranscriptUploadRequestTranscriptsInner`

GetTranscripts returns the Transcripts field if non-nil, zero value otherwise.

### GetTranscriptsOk

`func (o *TranscriptUploadRequest) GetTranscriptsOk() (*[]TranscriptUploadRequestTranscriptsInner, bool)`

GetTranscriptsOk returns a tuple with the Transcripts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTranscripts

`func (o *TranscriptUploadRequest) SetTranscripts(v []TranscriptUploadRequestTranscriptsInner)`

SetTranscripts sets Transcripts field to given value.


### GetBatchId

`func (o *TranscriptUploadRequest) GetBatchId() string`

GetBatchId returns the BatchId field if non-nil, zero value otherwise.

### GetBatchIdOk

`func (o *TranscriptUploadRequest) GetBatchIdOk() (*string, bool)`

GetBatchIdOk returns a tuple with the BatchId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchId

`func (o *TranscriptUploadRequest) SetBatchId(v string)`

SetBatchId sets BatchId field to given value.

### HasBatchId

`func (o *TranscriptUploadRequest) HasBatchId() bool`

HasBatchId returns a boolean if a field has been set.

### GetBatchName

`func (o *TranscriptUploadRequest) GetBatchName() string`

GetBatchName returns the BatchName field if non-nil, zero value otherwise.

### GetBatchNameOk

`func (o *TranscriptUploadRequest) GetBatchNameOk() (*string, bool)`

GetBatchNameOk returns a tuple with the BatchName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchName

`func (o *TranscriptUploadRequest) SetBatchName(v string)`

SetBatchName sets BatchName field to given value.

### HasBatchName

`func (o *TranscriptUploadRequest) HasBatchName() bool`

HasBatchName returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



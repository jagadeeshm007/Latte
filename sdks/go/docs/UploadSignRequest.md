# UploadSignRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Files** | [**[]UploadSignRequestFilesInner**](UploadSignRequestFilesInner.md) |  | 

## Methods

### NewUploadSignRequest

`func NewUploadSignRequest(files []UploadSignRequestFilesInner, ) *UploadSignRequest`

NewUploadSignRequest instantiates a new UploadSignRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUploadSignRequestWithDefaults

`func NewUploadSignRequestWithDefaults() *UploadSignRequest`

NewUploadSignRequestWithDefaults instantiates a new UploadSignRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetFiles

`func (o *UploadSignRequest) GetFiles() []UploadSignRequestFilesInner`

GetFiles returns the Files field if non-nil, zero value otherwise.

### GetFilesOk

`func (o *UploadSignRequest) GetFilesOk() (*[]UploadSignRequestFilesInner, bool)`

GetFilesOk returns a tuple with the Files field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFiles

`func (o *UploadSignRequest) SetFiles(v []UploadSignRequestFilesInner)`

SetFiles sets Files field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



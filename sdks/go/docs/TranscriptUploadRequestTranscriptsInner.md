# TranscriptUploadRequestTranscriptsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**OriginalFilename** | **string** |  | 
**AgentId** | **string** |  | 
**TeamId** | **string** |  | 
**ProductId** | **string** |  | 
**CallDate** | **string** |  | 
**Language** | Pointer to **string** |  | [optional] [default to "en-IN"]
**Lines** | [**[]TranscriptLine**](TranscriptLine.md) |  | 

## Methods

### NewTranscriptUploadRequestTranscriptsInner

`func NewTranscriptUploadRequestTranscriptsInner(originalFilename string, agentId string, teamId string, productId string, callDate string, lines []TranscriptLine, ) *TranscriptUploadRequestTranscriptsInner`

NewTranscriptUploadRequestTranscriptsInner instantiates a new TranscriptUploadRequestTranscriptsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTranscriptUploadRequestTranscriptsInnerWithDefaults

`func NewTranscriptUploadRequestTranscriptsInnerWithDefaults() *TranscriptUploadRequestTranscriptsInner`

NewTranscriptUploadRequestTranscriptsInnerWithDefaults instantiates a new TranscriptUploadRequestTranscriptsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetOriginalFilename

`func (o *TranscriptUploadRequestTranscriptsInner) GetOriginalFilename() string`

GetOriginalFilename returns the OriginalFilename field if non-nil, zero value otherwise.

### GetOriginalFilenameOk

`func (o *TranscriptUploadRequestTranscriptsInner) GetOriginalFilenameOk() (*string, bool)`

GetOriginalFilenameOk returns a tuple with the OriginalFilename field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOriginalFilename

`func (o *TranscriptUploadRequestTranscriptsInner) SetOriginalFilename(v string)`

SetOriginalFilename sets OriginalFilename field to given value.


### GetAgentId

`func (o *TranscriptUploadRequestTranscriptsInner) GetAgentId() string`

GetAgentId returns the AgentId field if non-nil, zero value otherwise.

### GetAgentIdOk

`func (o *TranscriptUploadRequestTranscriptsInner) GetAgentIdOk() (*string, bool)`

GetAgentIdOk returns a tuple with the AgentId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAgentId

`func (o *TranscriptUploadRequestTranscriptsInner) SetAgentId(v string)`

SetAgentId sets AgentId field to given value.


### GetTeamId

`func (o *TranscriptUploadRequestTranscriptsInner) GetTeamId() string`

GetTeamId returns the TeamId field if non-nil, zero value otherwise.

### GetTeamIdOk

`func (o *TranscriptUploadRequestTranscriptsInner) GetTeamIdOk() (*string, bool)`

GetTeamIdOk returns a tuple with the TeamId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTeamId

`func (o *TranscriptUploadRequestTranscriptsInner) SetTeamId(v string)`

SetTeamId sets TeamId field to given value.


### GetProductId

`func (o *TranscriptUploadRequestTranscriptsInner) GetProductId() string`

GetProductId returns the ProductId field if non-nil, zero value otherwise.

### GetProductIdOk

`func (o *TranscriptUploadRequestTranscriptsInner) GetProductIdOk() (*string, bool)`

GetProductIdOk returns a tuple with the ProductId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProductId

`func (o *TranscriptUploadRequestTranscriptsInner) SetProductId(v string)`

SetProductId sets ProductId field to given value.


### GetCallDate

`func (o *TranscriptUploadRequestTranscriptsInner) GetCallDate() string`

GetCallDate returns the CallDate field if non-nil, zero value otherwise.

### GetCallDateOk

`func (o *TranscriptUploadRequestTranscriptsInner) GetCallDateOk() (*string, bool)`

GetCallDateOk returns a tuple with the CallDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCallDate

`func (o *TranscriptUploadRequestTranscriptsInner) SetCallDate(v string)`

SetCallDate sets CallDate field to given value.


### GetLanguage

`func (o *TranscriptUploadRequestTranscriptsInner) GetLanguage() string`

GetLanguage returns the Language field if non-nil, zero value otherwise.

### GetLanguageOk

`func (o *TranscriptUploadRequestTranscriptsInner) GetLanguageOk() (*string, bool)`

GetLanguageOk returns a tuple with the Language field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLanguage

`func (o *TranscriptUploadRequestTranscriptsInner) SetLanguage(v string)`

SetLanguage sets Language field to given value.

### HasLanguage

`func (o *TranscriptUploadRequestTranscriptsInner) HasLanguage() bool`

HasLanguage returns a boolean if a field has been set.

### GetLines

`func (o *TranscriptUploadRequestTranscriptsInner) GetLines() []TranscriptLine`

GetLines returns the Lines field if non-nil, zero value otherwise.

### GetLinesOk

`func (o *TranscriptUploadRequestTranscriptsInner) GetLinesOk() (*[]TranscriptLine, bool)`

GetLinesOk returns a tuple with the Lines field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLines

`func (o *TranscriptUploadRequestTranscriptsInner) SetLines(v []TranscriptLine)`

SetLines sets Lines field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



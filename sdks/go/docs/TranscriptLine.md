# TranscriptLine

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Speaker** | **string** |  | 
**Text** | **string** |  | 
**StartMs** | Pointer to **int32** |  | [optional] 
**EndMs** | Pointer to **int32** |  | [optional] 

## Methods

### NewTranscriptLine

`func NewTranscriptLine(speaker string, text string, ) *TranscriptLine`

NewTranscriptLine instantiates a new TranscriptLine object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTranscriptLineWithDefaults

`func NewTranscriptLineWithDefaults() *TranscriptLine`

NewTranscriptLineWithDefaults instantiates a new TranscriptLine object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSpeaker

`func (o *TranscriptLine) GetSpeaker() string`

GetSpeaker returns the Speaker field if non-nil, zero value otherwise.

### GetSpeakerOk

`func (o *TranscriptLine) GetSpeakerOk() (*string, bool)`

GetSpeakerOk returns a tuple with the Speaker field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSpeaker

`func (o *TranscriptLine) SetSpeaker(v string)`

SetSpeaker sets Speaker field to given value.


### GetText

`func (o *TranscriptLine) GetText() string`

GetText returns the Text field if non-nil, zero value otherwise.

### GetTextOk

`func (o *TranscriptLine) GetTextOk() (*string, bool)`

GetTextOk returns a tuple with the Text field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetText

`func (o *TranscriptLine) SetText(v string)`

SetText sets Text field to given value.


### GetStartMs

`func (o *TranscriptLine) GetStartMs() int32`

GetStartMs returns the StartMs field if non-nil, zero value otherwise.

### GetStartMsOk

`func (o *TranscriptLine) GetStartMsOk() (*int32, bool)`

GetStartMsOk returns a tuple with the StartMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartMs

`func (o *TranscriptLine) SetStartMs(v int32)`

SetStartMs sets StartMs field to given value.

### HasStartMs

`func (o *TranscriptLine) HasStartMs() bool`

HasStartMs returns a boolean if a field has been set.

### GetEndMs

`func (o *TranscriptLine) GetEndMs() int32`

GetEndMs returns the EndMs field if non-nil, zero value otherwise.

### GetEndMsOk

`func (o *TranscriptLine) GetEndMsOk() (*int32, bool)`

GetEndMsOk returns a tuple with the EndMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndMs

`func (o *TranscriptLine) SetEndMs(v int32)`

SetEndMs sets EndMs field to given value.

### HasEndMs

`func (o *TranscriptLine) HasEndMs() bool`

HasEndMs returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



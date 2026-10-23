# Segment

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Seq** | **float32** |  | 
**Channel** | **string** |  | 
**StartMs** | **float32** |  | 
**EndMs** | **float32** |  | 
**Text** | **string** |  | 
**Language** | **NullableString** |  | 
**AvgLogprob** | **NullableFloat32** |  | 
**Words** | [**[]SegmentWordsInner**](SegmentWordsInner.md) |  | 
**Translation** | **NullableString** |  | 

## Methods

### NewSegment

`func NewSegment(seq float32, channel string, startMs float32, endMs float32, text string, language NullableString, avgLogprob NullableFloat32, words []SegmentWordsInner, translation NullableString, ) *Segment`

NewSegment instantiates a new Segment object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewSegmentWithDefaults

`func NewSegmentWithDefaults() *Segment`

NewSegmentWithDefaults instantiates a new Segment object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSeq

`func (o *Segment) GetSeq() float32`

GetSeq returns the Seq field if non-nil, zero value otherwise.

### GetSeqOk

`func (o *Segment) GetSeqOk() (*float32, bool)`

GetSeqOk returns a tuple with the Seq field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeq

`func (o *Segment) SetSeq(v float32)`

SetSeq sets Seq field to given value.


### GetChannel

`func (o *Segment) GetChannel() string`

GetChannel returns the Channel field if non-nil, zero value otherwise.

### GetChannelOk

`func (o *Segment) GetChannelOk() (*string, bool)`

GetChannelOk returns a tuple with the Channel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannel

`func (o *Segment) SetChannel(v string)`

SetChannel sets Channel field to given value.


### GetStartMs

`func (o *Segment) GetStartMs() float32`

GetStartMs returns the StartMs field if non-nil, zero value otherwise.

### GetStartMsOk

`func (o *Segment) GetStartMsOk() (*float32, bool)`

GetStartMsOk returns a tuple with the StartMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartMs

`func (o *Segment) SetStartMs(v float32)`

SetStartMs sets StartMs field to given value.


### GetEndMs

`func (o *Segment) GetEndMs() float32`

GetEndMs returns the EndMs field if non-nil, zero value otherwise.

### GetEndMsOk

`func (o *Segment) GetEndMsOk() (*float32, bool)`

GetEndMsOk returns a tuple with the EndMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndMs

`func (o *Segment) SetEndMs(v float32)`

SetEndMs sets EndMs field to given value.


### GetText

`func (o *Segment) GetText() string`

GetText returns the Text field if non-nil, zero value otherwise.

### GetTextOk

`func (o *Segment) GetTextOk() (*string, bool)`

GetTextOk returns a tuple with the Text field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetText

`func (o *Segment) SetText(v string)`

SetText sets Text field to given value.


### GetLanguage

`func (o *Segment) GetLanguage() string`

GetLanguage returns the Language field if non-nil, zero value otherwise.

### GetLanguageOk

`func (o *Segment) GetLanguageOk() (*string, bool)`

GetLanguageOk returns a tuple with the Language field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLanguage

`func (o *Segment) SetLanguage(v string)`

SetLanguage sets Language field to given value.


### SetLanguageNil

`func (o *Segment) SetLanguageNil(b bool)`

 SetLanguageNil sets the value for Language to be an explicit nil

### UnsetLanguage
`func (o *Segment) UnsetLanguage()`

UnsetLanguage ensures that no value is present for Language, not even an explicit nil
### GetAvgLogprob

`func (o *Segment) GetAvgLogprob() float32`

GetAvgLogprob returns the AvgLogprob field if non-nil, zero value otherwise.

### GetAvgLogprobOk

`func (o *Segment) GetAvgLogprobOk() (*float32, bool)`

GetAvgLogprobOk returns a tuple with the AvgLogprob field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvgLogprob

`func (o *Segment) SetAvgLogprob(v float32)`

SetAvgLogprob sets AvgLogprob field to given value.


### SetAvgLogprobNil

`func (o *Segment) SetAvgLogprobNil(b bool)`

 SetAvgLogprobNil sets the value for AvgLogprob to be an explicit nil

### UnsetAvgLogprob
`func (o *Segment) UnsetAvgLogprob()`

UnsetAvgLogprob ensures that no value is present for AvgLogprob, not even an explicit nil
### GetWords

`func (o *Segment) GetWords() []SegmentWordsInner`

GetWords returns the Words field if non-nil, zero value otherwise.

### GetWordsOk

`func (o *Segment) GetWordsOk() (*[]SegmentWordsInner, bool)`

GetWordsOk returns a tuple with the Words field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWords

`func (o *Segment) SetWords(v []SegmentWordsInner)`

SetWords sets Words field to given value.


### GetTranslation

`func (o *Segment) GetTranslation() string`

GetTranslation returns the Translation field if non-nil, zero value otherwise.

### GetTranslationOk

`func (o *Segment) GetTranslationOk() (*string, bool)`

GetTranslationOk returns a tuple with the Translation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTranslation

`func (o *Segment) SetTranslation(v string)`

SetTranslation sets Translation field to given value.


### SetTranslationNil

`func (o *Segment) SetTranslationNil(b bool)`

 SetTranslationNil sets the value for Translation to be an explicit nil

### UnsetTranslation
`func (o *Segment) UnsetTranslation()`

UnsetTranslation ensures that no value is present for Translation, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



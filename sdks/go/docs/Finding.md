# Finding

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**ItemKey** | **string** |  | 
**ItemType** | **string** |  | 
**Status** | **string** |  | 
**Source** | **string** |  | 
**Quote** | **NullableString** |  | 
**SegmentSeq** | **NullableFloat32** |  | 
**StartMs** | **NullableFloat32** |  | 
**EndMs** | **NullableFloat32** |  | 
**Channel** | **NullableString** |  | 
**Rationale** | **NullableString** |  | 
**Grounded** | **bool** |  | 
**Review** | [**NullableFindingReview**](FindingReview.md) |  | 

## Methods

### NewFinding

`func NewFinding(id string, itemKey string, itemType string, status string, source string, quote NullableString, segmentSeq NullableFloat32, startMs NullableFloat32, endMs NullableFloat32, channel NullableString, rationale NullableString, grounded bool, review NullableFindingReview, ) *Finding`

NewFinding instantiates a new Finding object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewFindingWithDefaults

`func NewFindingWithDefaults() *Finding`

NewFindingWithDefaults instantiates a new Finding object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *Finding) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *Finding) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *Finding) SetId(v string)`

SetId sets Id field to given value.


### GetItemKey

`func (o *Finding) GetItemKey() string`

GetItemKey returns the ItemKey field if non-nil, zero value otherwise.

### GetItemKeyOk

`func (o *Finding) GetItemKeyOk() (*string, bool)`

GetItemKeyOk returns a tuple with the ItemKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItemKey

`func (o *Finding) SetItemKey(v string)`

SetItemKey sets ItemKey field to given value.


### GetItemType

`func (o *Finding) GetItemType() string`

GetItemType returns the ItemType field if non-nil, zero value otherwise.

### GetItemTypeOk

`func (o *Finding) GetItemTypeOk() (*string, bool)`

GetItemTypeOk returns a tuple with the ItemType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItemType

`func (o *Finding) SetItemType(v string)`

SetItemType sets ItemType field to given value.


### GetStatus

`func (o *Finding) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *Finding) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *Finding) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetSource

`func (o *Finding) GetSource() string`

GetSource returns the Source field if non-nil, zero value otherwise.

### GetSourceOk

`func (o *Finding) GetSourceOk() (*string, bool)`

GetSourceOk returns a tuple with the Source field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSource

`func (o *Finding) SetSource(v string)`

SetSource sets Source field to given value.


### GetQuote

`func (o *Finding) GetQuote() string`

GetQuote returns the Quote field if non-nil, zero value otherwise.

### GetQuoteOk

`func (o *Finding) GetQuoteOk() (*string, bool)`

GetQuoteOk returns a tuple with the Quote field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQuote

`func (o *Finding) SetQuote(v string)`

SetQuote sets Quote field to given value.


### SetQuoteNil

`func (o *Finding) SetQuoteNil(b bool)`

 SetQuoteNil sets the value for Quote to be an explicit nil

### UnsetQuote
`func (o *Finding) UnsetQuote()`

UnsetQuote ensures that no value is present for Quote, not even an explicit nil
### GetSegmentSeq

`func (o *Finding) GetSegmentSeq() float32`

GetSegmentSeq returns the SegmentSeq field if non-nil, zero value otherwise.

### GetSegmentSeqOk

`func (o *Finding) GetSegmentSeqOk() (*float32, bool)`

GetSegmentSeqOk returns a tuple with the SegmentSeq field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSegmentSeq

`func (o *Finding) SetSegmentSeq(v float32)`

SetSegmentSeq sets SegmentSeq field to given value.


### SetSegmentSeqNil

`func (o *Finding) SetSegmentSeqNil(b bool)`

 SetSegmentSeqNil sets the value for SegmentSeq to be an explicit nil

### UnsetSegmentSeq
`func (o *Finding) UnsetSegmentSeq()`

UnsetSegmentSeq ensures that no value is present for SegmentSeq, not even an explicit nil
### GetStartMs

`func (o *Finding) GetStartMs() float32`

GetStartMs returns the StartMs field if non-nil, zero value otherwise.

### GetStartMsOk

`func (o *Finding) GetStartMsOk() (*float32, bool)`

GetStartMsOk returns a tuple with the StartMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartMs

`func (o *Finding) SetStartMs(v float32)`

SetStartMs sets StartMs field to given value.


### SetStartMsNil

`func (o *Finding) SetStartMsNil(b bool)`

 SetStartMsNil sets the value for StartMs to be an explicit nil

### UnsetStartMs
`func (o *Finding) UnsetStartMs()`

UnsetStartMs ensures that no value is present for StartMs, not even an explicit nil
### GetEndMs

`func (o *Finding) GetEndMs() float32`

GetEndMs returns the EndMs field if non-nil, zero value otherwise.

### GetEndMsOk

`func (o *Finding) GetEndMsOk() (*float32, bool)`

GetEndMsOk returns a tuple with the EndMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndMs

`func (o *Finding) SetEndMs(v float32)`

SetEndMs sets EndMs field to given value.


### SetEndMsNil

`func (o *Finding) SetEndMsNil(b bool)`

 SetEndMsNil sets the value for EndMs to be an explicit nil

### UnsetEndMs
`func (o *Finding) UnsetEndMs()`

UnsetEndMs ensures that no value is present for EndMs, not even an explicit nil
### GetChannel

`func (o *Finding) GetChannel() string`

GetChannel returns the Channel field if non-nil, zero value otherwise.

### GetChannelOk

`func (o *Finding) GetChannelOk() (*string, bool)`

GetChannelOk returns a tuple with the Channel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannel

`func (o *Finding) SetChannel(v string)`

SetChannel sets Channel field to given value.


### SetChannelNil

`func (o *Finding) SetChannelNil(b bool)`

 SetChannelNil sets the value for Channel to be an explicit nil

### UnsetChannel
`func (o *Finding) UnsetChannel()`

UnsetChannel ensures that no value is present for Channel, not even an explicit nil
### GetRationale

`func (o *Finding) GetRationale() string`

GetRationale returns the Rationale field if non-nil, zero value otherwise.

### GetRationaleOk

`func (o *Finding) GetRationaleOk() (*string, bool)`

GetRationaleOk returns a tuple with the Rationale field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRationale

`func (o *Finding) SetRationale(v string)`

SetRationale sets Rationale field to given value.


### SetRationaleNil

`func (o *Finding) SetRationaleNil(b bool)`

 SetRationaleNil sets the value for Rationale to be an explicit nil

### UnsetRationale
`func (o *Finding) UnsetRationale()`

UnsetRationale ensures that no value is present for Rationale, not even an explicit nil
### GetGrounded

`func (o *Finding) GetGrounded() bool`

GetGrounded returns the Grounded field if non-nil, zero value otherwise.

### GetGroundedOk

`func (o *Finding) GetGroundedOk() (*bool, bool)`

GetGroundedOk returns a tuple with the Grounded field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGrounded

`func (o *Finding) SetGrounded(v bool)`

SetGrounded sets Grounded field to given value.


### GetReview

`func (o *Finding) GetReview() FindingReview`

GetReview returns the Review field if non-nil, zero value otherwise.

### GetReviewOk

`func (o *Finding) GetReviewOk() (*FindingReview, bool)`

GetReviewOk returns a tuple with the Review field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReview

`func (o *Finding) SetReview(v FindingReview)`

SetReview sets Review field to given value.


### SetReviewNil

`func (o *Finding) SetReviewNil(b bool)`

 SetReviewNil sets the value for Review to be an explicit nil

### UnsetReview
`func (o *Finding) UnsetReview()`

UnsetReview ensures that no value is present for Review, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



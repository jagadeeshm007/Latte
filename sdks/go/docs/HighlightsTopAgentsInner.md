# HighlightsTopAgentsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Name** | **string** |  | 
**CallsScored** | **float32** |  | 
**Flagged** | **float32** |  | 
**FlagRate** | **NullableFloat32** |  | 
**AvgOverall** | **NullableFloat32** |  | 
**Breaches** | **float32** |  | 
**Items** | [**[]DashboardGroupsInnerItemsInner**](DashboardGroupsInnerItemsInner.md) |  | 

## Methods

### NewHighlightsTopAgentsInner

`func NewHighlightsTopAgentsInner(id string, name string, callsScored float32, flagged float32, flagRate NullableFloat32, avgOverall NullableFloat32, breaches float32, items []DashboardGroupsInnerItemsInner, ) *HighlightsTopAgentsInner`

NewHighlightsTopAgentsInner instantiates a new HighlightsTopAgentsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewHighlightsTopAgentsInnerWithDefaults

`func NewHighlightsTopAgentsInnerWithDefaults() *HighlightsTopAgentsInner`

NewHighlightsTopAgentsInnerWithDefaults instantiates a new HighlightsTopAgentsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *HighlightsTopAgentsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *HighlightsTopAgentsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *HighlightsTopAgentsInner) SetId(v string)`

SetId sets Id field to given value.


### GetName

`func (o *HighlightsTopAgentsInner) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *HighlightsTopAgentsInner) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *HighlightsTopAgentsInner) SetName(v string)`

SetName sets Name field to given value.


### GetCallsScored

`func (o *HighlightsTopAgentsInner) GetCallsScored() float32`

GetCallsScored returns the CallsScored field if non-nil, zero value otherwise.

### GetCallsScoredOk

`func (o *HighlightsTopAgentsInner) GetCallsScoredOk() (*float32, bool)`

GetCallsScoredOk returns a tuple with the CallsScored field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCallsScored

`func (o *HighlightsTopAgentsInner) SetCallsScored(v float32)`

SetCallsScored sets CallsScored field to given value.


### GetFlagged

`func (o *HighlightsTopAgentsInner) GetFlagged() float32`

GetFlagged returns the Flagged field if non-nil, zero value otherwise.

### GetFlaggedOk

`func (o *HighlightsTopAgentsInner) GetFlaggedOk() (*float32, bool)`

GetFlaggedOk returns a tuple with the Flagged field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFlagged

`func (o *HighlightsTopAgentsInner) SetFlagged(v float32)`

SetFlagged sets Flagged field to given value.


### GetFlagRate

`func (o *HighlightsTopAgentsInner) GetFlagRate() float32`

GetFlagRate returns the FlagRate field if non-nil, zero value otherwise.

### GetFlagRateOk

`func (o *HighlightsTopAgentsInner) GetFlagRateOk() (*float32, bool)`

GetFlagRateOk returns a tuple with the FlagRate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFlagRate

`func (o *HighlightsTopAgentsInner) SetFlagRate(v float32)`

SetFlagRate sets FlagRate field to given value.


### SetFlagRateNil

`func (o *HighlightsTopAgentsInner) SetFlagRateNil(b bool)`

 SetFlagRateNil sets the value for FlagRate to be an explicit nil

### UnsetFlagRate
`func (o *HighlightsTopAgentsInner) UnsetFlagRate()`

UnsetFlagRate ensures that no value is present for FlagRate, not even an explicit nil
### GetAvgOverall

`func (o *HighlightsTopAgentsInner) GetAvgOverall() float32`

GetAvgOverall returns the AvgOverall field if non-nil, zero value otherwise.

### GetAvgOverallOk

`func (o *HighlightsTopAgentsInner) GetAvgOverallOk() (*float32, bool)`

GetAvgOverallOk returns a tuple with the AvgOverall field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvgOverall

`func (o *HighlightsTopAgentsInner) SetAvgOverall(v float32)`

SetAvgOverall sets AvgOverall field to given value.


### SetAvgOverallNil

`func (o *HighlightsTopAgentsInner) SetAvgOverallNil(b bool)`

 SetAvgOverallNil sets the value for AvgOverall to be an explicit nil

### UnsetAvgOverall
`func (o *HighlightsTopAgentsInner) UnsetAvgOverall()`

UnsetAvgOverall ensures that no value is present for AvgOverall, not even an explicit nil
### GetBreaches

`func (o *HighlightsTopAgentsInner) GetBreaches() float32`

GetBreaches returns the Breaches field if non-nil, zero value otherwise.

### GetBreachesOk

`func (o *HighlightsTopAgentsInner) GetBreachesOk() (*float32, bool)`

GetBreachesOk returns a tuple with the Breaches field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBreaches

`func (o *HighlightsTopAgentsInner) SetBreaches(v float32)`

SetBreaches sets Breaches field to given value.


### GetItems

`func (o *HighlightsTopAgentsInner) GetItems() []DashboardGroupsInnerItemsInner`

GetItems returns the Items field if non-nil, zero value otherwise.

### GetItemsOk

`func (o *HighlightsTopAgentsInner) GetItemsOk() (*[]DashboardGroupsInnerItemsInner, bool)`

GetItemsOk returns a tuple with the Items field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItems

`func (o *HighlightsTopAgentsInner) SetItems(v []DashboardGroupsInnerItemsInner)`

SetItems sets Items field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



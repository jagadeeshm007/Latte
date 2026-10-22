# DashboardGroupsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Name** | **string** |  | 
**CallsScored** | **float32** |  | 
**Flagged** | **float32** |  | 
**FlagRate** | **NullableFloat32** |  | 
**AvgOverall** | **NullableFloat32** |  | 
**Items** | [**[]DashboardGroupsInnerItemsInner**](DashboardGroupsInnerItemsInner.md) |  | 

## Methods

### NewDashboardGroupsInner

`func NewDashboardGroupsInner(id string, name string, callsScored float32, flagged float32, flagRate NullableFloat32, avgOverall NullableFloat32, items []DashboardGroupsInnerItemsInner, ) *DashboardGroupsInner`

NewDashboardGroupsInner instantiates a new DashboardGroupsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewDashboardGroupsInnerWithDefaults

`func NewDashboardGroupsInnerWithDefaults() *DashboardGroupsInner`

NewDashboardGroupsInnerWithDefaults instantiates a new DashboardGroupsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *DashboardGroupsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *DashboardGroupsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *DashboardGroupsInner) SetId(v string)`

SetId sets Id field to given value.


### GetName

`func (o *DashboardGroupsInner) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *DashboardGroupsInner) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *DashboardGroupsInner) SetName(v string)`

SetName sets Name field to given value.


### GetCallsScored

`func (o *DashboardGroupsInner) GetCallsScored() float32`

GetCallsScored returns the CallsScored field if non-nil, zero value otherwise.

### GetCallsScoredOk

`func (o *DashboardGroupsInner) GetCallsScoredOk() (*float32, bool)`

GetCallsScoredOk returns a tuple with the CallsScored field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCallsScored

`func (o *DashboardGroupsInner) SetCallsScored(v float32)`

SetCallsScored sets CallsScored field to given value.


### GetFlagged

`func (o *DashboardGroupsInner) GetFlagged() float32`

GetFlagged returns the Flagged field if non-nil, zero value otherwise.

### GetFlaggedOk

`func (o *DashboardGroupsInner) GetFlaggedOk() (*float32, bool)`

GetFlaggedOk returns a tuple with the Flagged field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFlagged

`func (o *DashboardGroupsInner) SetFlagged(v float32)`

SetFlagged sets Flagged field to given value.


### GetFlagRate

`func (o *DashboardGroupsInner) GetFlagRate() float32`

GetFlagRate returns the FlagRate field if non-nil, zero value otherwise.

### GetFlagRateOk

`func (o *DashboardGroupsInner) GetFlagRateOk() (*float32, bool)`

GetFlagRateOk returns a tuple with the FlagRate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFlagRate

`func (o *DashboardGroupsInner) SetFlagRate(v float32)`

SetFlagRate sets FlagRate field to given value.


### SetFlagRateNil

`func (o *DashboardGroupsInner) SetFlagRateNil(b bool)`

 SetFlagRateNil sets the value for FlagRate to be an explicit nil

### UnsetFlagRate
`func (o *DashboardGroupsInner) UnsetFlagRate()`

UnsetFlagRate ensures that no value is present for FlagRate, not even an explicit nil
### GetAvgOverall

`func (o *DashboardGroupsInner) GetAvgOverall() float32`

GetAvgOverall returns the AvgOverall field if non-nil, zero value otherwise.

### GetAvgOverallOk

`func (o *DashboardGroupsInner) GetAvgOverallOk() (*float32, bool)`

GetAvgOverallOk returns a tuple with the AvgOverall field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvgOverall

`func (o *DashboardGroupsInner) SetAvgOverall(v float32)`

SetAvgOverall sets AvgOverall field to given value.


### SetAvgOverallNil

`func (o *DashboardGroupsInner) SetAvgOverallNil(b bool)`

 SetAvgOverallNil sets the value for AvgOverall to be an explicit nil

### UnsetAvgOverall
`func (o *DashboardGroupsInner) UnsetAvgOverall()`

UnsetAvgOverall ensures that no value is present for AvgOverall, not even an explicit nil
### GetItems

`func (o *DashboardGroupsInner) GetItems() []DashboardGroupsInnerItemsInner`

GetItems returns the Items field if non-nil, zero value otherwise.

### GetItemsOk

`func (o *DashboardGroupsInner) GetItemsOk() (*[]DashboardGroupsInnerItemsInner, bool)`

GetItemsOk returns a tuple with the Items field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItems

`func (o *DashboardGroupsInner) SetItems(v []DashboardGroupsInnerItemsInner)`

SetItems sets Items field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



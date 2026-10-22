# Leaderboard

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**GroupBy** | **string** |  | 
**Items** | [**[]HighlightsTopAgentsInner**](HighlightsTopAgentsInner.md) |  | 
**Total** | **float32** |  | 

## Methods

### NewLeaderboard

`func NewLeaderboard(groupBy string, items []HighlightsTopAgentsInner, total float32, ) *Leaderboard`

NewLeaderboard instantiates a new Leaderboard object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewLeaderboardWithDefaults

`func NewLeaderboardWithDefaults() *Leaderboard`

NewLeaderboardWithDefaults instantiates a new Leaderboard object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetGroupBy

`func (o *Leaderboard) GetGroupBy() string`

GetGroupBy returns the GroupBy field if non-nil, zero value otherwise.

### GetGroupByOk

`func (o *Leaderboard) GetGroupByOk() (*string, bool)`

GetGroupByOk returns a tuple with the GroupBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroupBy

`func (o *Leaderboard) SetGroupBy(v string)`

SetGroupBy sets GroupBy field to given value.


### GetItems

`func (o *Leaderboard) GetItems() []HighlightsTopAgentsInner`

GetItems returns the Items field if non-nil, zero value otherwise.

### GetItemsOk

`func (o *Leaderboard) GetItemsOk() (*[]HighlightsTopAgentsInner, bool)`

GetItemsOk returns a tuple with the Items field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItems

`func (o *Leaderboard) SetItems(v []HighlightsTopAgentsInner)`

SetItems sets Items field to given value.


### GetTotal

`func (o *Leaderboard) GetTotal() float32`

GetTotal returns the Total field if non-nil, zero value otherwise.

### GetTotalOk

`func (o *Leaderboard) GetTotalOk() (*float32, bool)`

GetTotalOk returns a tuple with the Total field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotal

`func (o *Leaderboard) SetTotal(v float32)`

SetTotal sets Total field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



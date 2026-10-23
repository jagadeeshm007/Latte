# BatchList

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Items** | [**[]BatchSummary**](BatchSummary.md) |  | 
**Total** | **float32** |  | 

## Methods

### NewBatchList

`func NewBatchList(items []BatchSummary, total float32, ) *BatchList`

NewBatchList instantiates a new BatchList object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewBatchListWithDefaults

`func NewBatchListWithDefaults() *BatchList`

NewBatchListWithDefaults instantiates a new BatchList object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetItems

`func (o *BatchList) GetItems() []BatchSummary`

GetItems returns the Items field if non-nil, zero value otherwise.

### GetItemsOk

`func (o *BatchList) GetItemsOk() (*[]BatchSummary, bool)`

GetItemsOk returns a tuple with the Items field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItems

`func (o *BatchList) SetItems(v []BatchSummary)`

SetItems sets Items field to given value.


### GetTotal

`func (o *BatchList) GetTotal() float32`

GetTotal returns the Total field if non-nil, zero value otherwise.

### GetTotalOk

`func (o *BatchList) GetTotalOk() (*float32, bool)`

GetTotalOk returns a tuple with the Total field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotal

`func (o *BatchList) SetTotal(v float32)`

SetTotal sets Total field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



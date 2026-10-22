# CallScoredEvent

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | the event id; the same on every redelivery | 
**Type** | **string** |  | 
**CreatedAt** | **string** | ISO 8601 | 
**Data** | [**CallScoredData**](CallScoredData.md) |  | 

## Methods

### NewCallScoredEvent

`func NewCallScoredEvent(id string, type_ string, createdAt string, data CallScoredData, ) *CallScoredEvent`

NewCallScoredEvent instantiates a new CallScoredEvent object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCallScoredEventWithDefaults

`func NewCallScoredEventWithDefaults() *CallScoredEvent`

NewCallScoredEventWithDefaults instantiates a new CallScoredEvent object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CallScoredEvent) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CallScoredEvent) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CallScoredEvent) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *CallScoredEvent) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *CallScoredEvent) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *CallScoredEvent) SetType(v string)`

SetType sets Type field to given value.


### GetCreatedAt

`func (o *CallScoredEvent) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CallScoredEvent) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CallScoredEvent) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetData

`func (o *CallScoredEvent) GetData() CallScoredData`

GetData returns the Data field if non-nil, zero value otherwise.

### GetDataOk

`func (o *CallScoredEvent) GetDataOk() (*CallScoredData, bool)`

GetDataOk returns a tuple with the Data field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetData

`func (o *CallScoredEvent) SetData(v CallScoredData)`

SetData sets Data field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



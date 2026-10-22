# CallFailedEvent

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | the event id; the same on every redelivery | 
**Type** | **string** |  | 
**CreatedAt** | **string** | ISO 8601 | 
**Data** | [**CallFailedData**](CallFailedData.md) |  | 

## Methods

### NewCallFailedEvent

`func NewCallFailedEvent(id string, type_ string, createdAt string, data CallFailedData, ) *CallFailedEvent`

NewCallFailedEvent instantiates a new CallFailedEvent object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCallFailedEventWithDefaults

`func NewCallFailedEventWithDefaults() *CallFailedEvent`

NewCallFailedEventWithDefaults instantiates a new CallFailedEvent object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CallFailedEvent) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CallFailedEvent) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CallFailedEvent) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *CallFailedEvent) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *CallFailedEvent) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *CallFailedEvent) SetType(v string)`

SetType sets Type field to given value.


### GetCreatedAt

`func (o *CallFailedEvent) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CallFailedEvent) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CallFailedEvent) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetData

`func (o *CallFailedEvent) GetData() CallFailedData`

GetData returns the Data field if non-nil, zero value otherwise.

### GetDataOk

`func (o *CallFailedEvent) GetDataOk() (*CallFailedData, bool)`

GetDataOk returns a tuple with the Data field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetData

`func (o *CallFailedEvent) SetData(v CallFailedData)`

SetData sets Data field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



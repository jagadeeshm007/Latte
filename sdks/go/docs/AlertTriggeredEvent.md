# AlertTriggeredEvent

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | the event id; the same on every redelivery | 
**Type** | **string** |  | 
**CreatedAt** | **string** | ISO 8601 | 
**Data** | [**AlertTriggeredData**](AlertTriggeredData.md) |  | 

## Methods

### NewAlertTriggeredEvent

`func NewAlertTriggeredEvent(id string, type_ string, createdAt string, data AlertTriggeredData, ) *AlertTriggeredEvent`

NewAlertTriggeredEvent instantiates a new AlertTriggeredEvent object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAlertTriggeredEventWithDefaults

`func NewAlertTriggeredEventWithDefaults() *AlertTriggeredEvent`

NewAlertTriggeredEventWithDefaults instantiates a new AlertTriggeredEvent object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *AlertTriggeredEvent) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *AlertTriggeredEvent) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *AlertTriggeredEvent) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *AlertTriggeredEvent) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *AlertTriggeredEvent) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *AlertTriggeredEvent) SetType(v string)`

SetType sets Type field to given value.


### GetCreatedAt

`func (o *AlertTriggeredEvent) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *AlertTriggeredEvent) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *AlertTriggeredEvent) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetData

`func (o *AlertTriggeredEvent) GetData() AlertTriggeredData`

GetData returns the Data field if non-nil, zero value otherwise.

### GetDataOk

`func (o *AlertTriggeredEvent) GetDataOk() (*AlertTriggeredData, bool)`

GetDataOk returns a tuple with the Data field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetData

`func (o *AlertTriggeredEvent) SetData(v AlertTriggeredData)`

SetData sets Data field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



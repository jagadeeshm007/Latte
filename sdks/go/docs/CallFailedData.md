# CallFailedData

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CallId** | **string** |  | 
**Reason** | **string** | why processing gave up, for a person | 

## Methods

### NewCallFailedData

`func NewCallFailedData(callId string, reason string, ) *CallFailedData`

NewCallFailedData instantiates a new CallFailedData object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCallFailedDataWithDefaults

`func NewCallFailedDataWithDefaults() *CallFailedData`

NewCallFailedDataWithDefaults instantiates a new CallFailedData object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCallId

`func (o *CallFailedData) GetCallId() string`

GetCallId returns the CallId field if non-nil, zero value otherwise.

### GetCallIdOk

`func (o *CallFailedData) GetCallIdOk() (*string, bool)`

GetCallIdOk returns a tuple with the CallId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCallId

`func (o *CallFailedData) SetCallId(v string)`

SetCallId sets CallId field to given value.


### GetReason

`func (o *CallFailedData) GetReason() string`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *CallFailedData) GetReasonOk() (*string, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *CallFailedData) SetReason(v string)`

SetReason sets Reason field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



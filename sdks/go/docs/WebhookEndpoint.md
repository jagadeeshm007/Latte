# WebhookEndpoint

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Url** | **string** |  | 
**Description** | **string** |  | 
**Events** | **[]string** |  | 
**CreatedBy** | **string** |  | 
**CreatedAt** | **string** |  | 
**DisabledAt** | **NullableString** |  | 
**DisabledReason** | **NullableString** |  | 
**ConsecutiveFailures** | **float32** |  | 
**Deliveries24h** | **float32** |  | 
**Failures24h** | **float32** |  | 

## Methods

### NewWebhookEndpoint

`func NewWebhookEndpoint(id string, url string, description string, events []string, createdBy string, createdAt string, disabledAt NullableString, disabledReason NullableString, consecutiveFailures float32, deliveries24h float32, failures24h float32, ) *WebhookEndpoint`

NewWebhookEndpoint instantiates a new WebhookEndpoint object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewWebhookEndpointWithDefaults

`func NewWebhookEndpointWithDefaults() *WebhookEndpoint`

NewWebhookEndpointWithDefaults instantiates a new WebhookEndpoint object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *WebhookEndpoint) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *WebhookEndpoint) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *WebhookEndpoint) SetId(v string)`

SetId sets Id field to given value.


### GetUrl

`func (o *WebhookEndpoint) GetUrl() string`

GetUrl returns the Url field if non-nil, zero value otherwise.

### GetUrlOk

`func (o *WebhookEndpoint) GetUrlOk() (*string, bool)`

GetUrlOk returns a tuple with the Url field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrl

`func (o *WebhookEndpoint) SetUrl(v string)`

SetUrl sets Url field to given value.


### GetDescription

`func (o *WebhookEndpoint) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *WebhookEndpoint) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *WebhookEndpoint) SetDescription(v string)`

SetDescription sets Description field to given value.


### GetEvents

`func (o *WebhookEndpoint) GetEvents() []string`

GetEvents returns the Events field if non-nil, zero value otherwise.

### GetEventsOk

`func (o *WebhookEndpoint) GetEventsOk() (*[]string, bool)`

GetEventsOk returns a tuple with the Events field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvents

`func (o *WebhookEndpoint) SetEvents(v []string)`

SetEvents sets Events field to given value.


### GetCreatedBy

`func (o *WebhookEndpoint) GetCreatedBy() string`

GetCreatedBy returns the CreatedBy field if non-nil, zero value otherwise.

### GetCreatedByOk

`func (o *WebhookEndpoint) GetCreatedByOk() (*string, bool)`

GetCreatedByOk returns a tuple with the CreatedBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedBy

`func (o *WebhookEndpoint) SetCreatedBy(v string)`

SetCreatedBy sets CreatedBy field to given value.


### GetCreatedAt

`func (o *WebhookEndpoint) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *WebhookEndpoint) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *WebhookEndpoint) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetDisabledAt

`func (o *WebhookEndpoint) GetDisabledAt() string`

GetDisabledAt returns the DisabledAt field if non-nil, zero value otherwise.

### GetDisabledAtOk

`func (o *WebhookEndpoint) GetDisabledAtOk() (*string, bool)`

GetDisabledAtOk returns a tuple with the DisabledAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisabledAt

`func (o *WebhookEndpoint) SetDisabledAt(v string)`

SetDisabledAt sets DisabledAt field to given value.


### SetDisabledAtNil

`func (o *WebhookEndpoint) SetDisabledAtNil(b bool)`

 SetDisabledAtNil sets the value for DisabledAt to be an explicit nil

### UnsetDisabledAt
`func (o *WebhookEndpoint) UnsetDisabledAt()`

UnsetDisabledAt ensures that no value is present for DisabledAt, not even an explicit nil
### GetDisabledReason

`func (o *WebhookEndpoint) GetDisabledReason() string`

GetDisabledReason returns the DisabledReason field if non-nil, zero value otherwise.

### GetDisabledReasonOk

`func (o *WebhookEndpoint) GetDisabledReasonOk() (*string, bool)`

GetDisabledReasonOk returns a tuple with the DisabledReason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisabledReason

`func (o *WebhookEndpoint) SetDisabledReason(v string)`

SetDisabledReason sets DisabledReason field to given value.


### SetDisabledReasonNil

`func (o *WebhookEndpoint) SetDisabledReasonNil(b bool)`

 SetDisabledReasonNil sets the value for DisabledReason to be an explicit nil

### UnsetDisabledReason
`func (o *WebhookEndpoint) UnsetDisabledReason()`

UnsetDisabledReason ensures that no value is present for DisabledReason, not even an explicit nil
### GetConsecutiveFailures

`func (o *WebhookEndpoint) GetConsecutiveFailures() float32`

GetConsecutiveFailures returns the ConsecutiveFailures field if non-nil, zero value otherwise.

### GetConsecutiveFailuresOk

`func (o *WebhookEndpoint) GetConsecutiveFailuresOk() (*float32, bool)`

GetConsecutiveFailuresOk returns a tuple with the ConsecutiveFailures field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConsecutiveFailures

`func (o *WebhookEndpoint) SetConsecutiveFailures(v float32)`

SetConsecutiveFailures sets ConsecutiveFailures field to given value.


### GetDeliveries24h

`func (o *WebhookEndpoint) GetDeliveries24h() float32`

GetDeliveries24h returns the Deliveries24h field if non-nil, zero value otherwise.

### GetDeliveries24hOk

`func (o *WebhookEndpoint) GetDeliveries24hOk() (*float32, bool)`

GetDeliveries24hOk returns a tuple with the Deliveries24h field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeliveries24h

`func (o *WebhookEndpoint) SetDeliveries24h(v float32)`

SetDeliveries24h sets Deliveries24h field to given value.


### GetFailures24h

`func (o *WebhookEndpoint) GetFailures24h() float32`

GetFailures24h returns the Failures24h field if non-nil, zero value otherwise.

### GetFailures24hOk

`func (o *WebhookEndpoint) GetFailures24hOk() (*float32, bool)`

GetFailures24hOk returns a tuple with the Failures24h field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailures24h

`func (o *WebhookEndpoint) SetFailures24h(v float32)`

SetFailures24h sets Failures24h field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



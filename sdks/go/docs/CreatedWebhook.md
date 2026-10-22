# CreatedWebhook

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Endpoint** | [**WebhookEndpoint**](WebhookEndpoint.md) |  | 
**Secret** | **string** |  | 

## Methods

### NewCreatedWebhook

`func NewCreatedWebhook(endpoint WebhookEndpoint, secret string, ) *CreatedWebhook`

NewCreatedWebhook instantiates a new CreatedWebhook object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCreatedWebhookWithDefaults

`func NewCreatedWebhookWithDefaults() *CreatedWebhook`

NewCreatedWebhookWithDefaults instantiates a new CreatedWebhook object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEndpoint

`func (o *CreatedWebhook) GetEndpoint() WebhookEndpoint`

GetEndpoint returns the Endpoint field if non-nil, zero value otherwise.

### GetEndpointOk

`func (o *CreatedWebhook) GetEndpointOk() (*WebhookEndpoint, bool)`

GetEndpointOk returns a tuple with the Endpoint field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndpoint

`func (o *CreatedWebhook) SetEndpoint(v WebhookEndpoint)`

SetEndpoint sets Endpoint field to given value.


### GetSecret

`func (o *CreatedWebhook) GetSecret() string`

GetSecret returns the Secret field if non-nil, zero value otherwise.

### GetSecretOk

`func (o *CreatedWebhook) GetSecretOk() (*string, bool)`

GetSecretOk returns a tuple with the Secret field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecret

`func (o *CreatedWebhook) SetSecret(v string)`

SetSecret sets Secret field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



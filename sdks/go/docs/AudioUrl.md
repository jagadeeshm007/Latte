# AudioUrl

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Url** | **string** |  | 
**ExpiresInSeconds** | **float32** |  | 

## Methods

### NewAudioUrl

`func NewAudioUrl(url string, expiresInSeconds float32, ) *AudioUrl`

NewAudioUrl instantiates a new AudioUrl object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAudioUrlWithDefaults

`func NewAudioUrlWithDefaults() *AudioUrl`

NewAudioUrlWithDefaults instantiates a new AudioUrl object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetUrl

`func (o *AudioUrl) GetUrl() string`

GetUrl returns the Url field if non-nil, zero value otherwise.

### GetUrlOk

`func (o *AudioUrl) GetUrlOk() (*string, bool)`

GetUrlOk returns a tuple with the Url field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrl

`func (o *AudioUrl) SetUrl(v string)`

SetUrl sets Url field to given value.


### GetExpiresInSeconds

`func (o *AudioUrl) GetExpiresInSeconds() float32`

GetExpiresInSeconds returns the ExpiresInSeconds field if non-nil, zero value otherwise.

### GetExpiresInSecondsOk

`func (o *AudioUrl) GetExpiresInSecondsOk() (*float32, bool)`

GetExpiresInSecondsOk returns a tuple with the ExpiresInSeconds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresInSeconds

`func (o *AudioUrl) SetExpiresInSeconds(v float32)`

SetExpiresInSeconds sets ExpiresInSeconds field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



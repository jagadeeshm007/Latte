# Reference

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Agents** | [**[]ReferenceAgentsInner**](ReferenceAgentsInner.md) |  | 
**Teams** | [**[]ReferenceTeamsInner**](ReferenceTeamsInner.md) |  | 
**Products** | [**[]ReferenceTeamsInner**](ReferenceTeamsInner.md) |  | 

## Methods

### NewReference

`func NewReference(agents []ReferenceAgentsInner, teams []ReferenceTeamsInner, products []ReferenceTeamsInner, ) *Reference`

NewReference instantiates a new Reference object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewReferenceWithDefaults

`func NewReferenceWithDefaults() *Reference`

NewReferenceWithDefaults instantiates a new Reference object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAgents

`func (o *Reference) GetAgents() []ReferenceAgentsInner`

GetAgents returns the Agents field if non-nil, zero value otherwise.

### GetAgentsOk

`func (o *Reference) GetAgentsOk() (*[]ReferenceAgentsInner, bool)`

GetAgentsOk returns a tuple with the Agents field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAgents

`func (o *Reference) SetAgents(v []ReferenceAgentsInner)`

SetAgents sets Agents field to given value.


### GetTeams

`func (o *Reference) GetTeams() []ReferenceTeamsInner`

GetTeams returns the Teams field if non-nil, zero value otherwise.

### GetTeamsOk

`func (o *Reference) GetTeamsOk() (*[]ReferenceTeamsInner, bool)`

GetTeamsOk returns a tuple with the Teams field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTeams

`func (o *Reference) SetTeams(v []ReferenceTeamsInner)`

SetTeams sets Teams field to given value.


### GetProducts

`func (o *Reference) GetProducts() []ReferenceTeamsInner`

GetProducts returns the Products field if non-nil, zero value otherwise.

### GetProductsOk

`func (o *Reference) GetProductsOk() (*[]ReferenceTeamsInner, bool)`

GetProductsOk returns a tuple with the Products field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProducts

`func (o *Reference) SetProducts(v []ReferenceTeamsInner)`

SetProducts sets Products field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



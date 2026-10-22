# Highlights

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**From** | **string** |  | 
**To** | **string** |  | 
**PreviousFrom** | **string** |  | 
**PreviousTo** | **string** |  | 
**Kpis** | [**HighlightsKpis**](HighlightsKpis.md) |  | 
**TopAgents** | [**[]HighlightsTopAgentsInner**](HighlightsTopAgentsInner.md) |  | 
**BottomAgents** | [**[]HighlightsTopAgentsInner**](HighlightsTopAgentsInner.md) |  | 
**RiskiestTeams** | [**[]HighlightsTopAgentsInner**](HighlightsTopAgentsInner.md) |  | 
**FailedItems** | [**[]HighlightsFailedItemsInner**](HighlightsFailedItemsInner.md) |  | 
**LanguageMix** | [**[]HighlightsLanguageMixInner**](HighlightsLanguageMixInner.md) |  | 
**ProductMix** | [**[]HighlightsLanguageMixInner**](HighlightsLanguageMixInner.md) |  | 

## Methods

### NewHighlights

`func NewHighlights(from string, to string, previousFrom string, previousTo string, kpis HighlightsKpis, topAgents []HighlightsTopAgentsInner, bottomAgents []HighlightsTopAgentsInner, riskiestTeams []HighlightsTopAgentsInner, failedItems []HighlightsFailedItemsInner, languageMix []HighlightsLanguageMixInner, productMix []HighlightsLanguageMixInner, ) *Highlights`

NewHighlights instantiates a new Highlights object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewHighlightsWithDefaults

`func NewHighlightsWithDefaults() *Highlights`

NewHighlightsWithDefaults instantiates a new Highlights object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetFrom

`func (o *Highlights) GetFrom() string`

GetFrom returns the From field if non-nil, zero value otherwise.

### GetFromOk

`func (o *Highlights) GetFromOk() (*string, bool)`

GetFromOk returns a tuple with the From field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFrom

`func (o *Highlights) SetFrom(v string)`

SetFrom sets From field to given value.


### GetTo

`func (o *Highlights) GetTo() string`

GetTo returns the To field if non-nil, zero value otherwise.

### GetToOk

`func (o *Highlights) GetToOk() (*string, bool)`

GetToOk returns a tuple with the To field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTo

`func (o *Highlights) SetTo(v string)`

SetTo sets To field to given value.


### GetPreviousFrom

`func (o *Highlights) GetPreviousFrom() string`

GetPreviousFrom returns the PreviousFrom field if non-nil, zero value otherwise.

### GetPreviousFromOk

`func (o *Highlights) GetPreviousFromOk() (*string, bool)`

GetPreviousFromOk returns a tuple with the PreviousFrom field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPreviousFrom

`func (o *Highlights) SetPreviousFrom(v string)`

SetPreviousFrom sets PreviousFrom field to given value.


### GetPreviousTo

`func (o *Highlights) GetPreviousTo() string`

GetPreviousTo returns the PreviousTo field if non-nil, zero value otherwise.

### GetPreviousToOk

`func (o *Highlights) GetPreviousToOk() (*string, bool)`

GetPreviousToOk returns a tuple with the PreviousTo field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPreviousTo

`func (o *Highlights) SetPreviousTo(v string)`

SetPreviousTo sets PreviousTo field to given value.


### GetKpis

`func (o *Highlights) GetKpis() HighlightsKpis`

GetKpis returns the Kpis field if non-nil, zero value otherwise.

### GetKpisOk

`func (o *Highlights) GetKpisOk() (*HighlightsKpis, bool)`

GetKpisOk returns a tuple with the Kpis field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKpis

`func (o *Highlights) SetKpis(v HighlightsKpis)`

SetKpis sets Kpis field to given value.


### GetTopAgents

`func (o *Highlights) GetTopAgents() []HighlightsTopAgentsInner`

GetTopAgents returns the TopAgents field if non-nil, zero value otherwise.

### GetTopAgentsOk

`func (o *Highlights) GetTopAgentsOk() (*[]HighlightsTopAgentsInner, bool)`

GetTopAgentsOk returns a tuple with the TopAgents field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopAgents

`func (o *Highlights) SetTopAgents(v []HighlightsTopAgentsInner)`

SetTopAgents sets TopAgents field to given value.


### GetBottomAgents

`func (o *Highlights) GetBottomAgents() []HighlightsTopAgentsInner`

GetBottomAgents returns the BottomAgents field if non-nil, zero value otherwise.

### GetBottomAgentsOk

`func (o *Highlights) GetBottomAgentsOk() (*[]HighlightsTopAgentsInner, bool)`

GetBottomAgentsOk returns a tuple with the BottomAgents field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBottomAgents

`func (o *Highlights) SetBottomAgents(v []HighlightsTopAgentsInner)`

SetBottomAgents sets BottomAgents field to given value.


### GetRiskiestTeams

`func (o *Highlights) GetRiskiestTeams() []HighlightsTopAgentsInner`

GetRiskiestTeams returns the RiskiestTeams field if non-nil, zero value otherwise.

### GetRiskiestTeamsOk

`func (o *Highlights) GetRiskiestTeamsOk() (*[]HighlightsTopAgentsInner, bool)`

GetRiskiestTeamsOk returns a tuple with the RiskiestTeams field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRiskiestTeams

`func (o *Highlights) SetRiskiestTeams(v []HighlightsTopAgentsInner)`

SetRiskiestTeams sets RiskiestTeams field to given value.


### GetFailedItems

`func (o *Highlights) GetFailedItems() []HighlightsFailedItemsInner`

GetFailedItems returns the FailedItems field if non-nil, zero value otherwise.

### GetFailedItemsOk

`func (o *Highlights) GetFailedItemsOk() (*[]HighlightsFailedItemsInner, bool)`

GetFailedItemsOk returns a tuple with the FailedItems field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailedItems

`func (o *Highlights) SetFailedItems(v []HighlightsFailedItemsInner)`

SetFailedItems sets FailedItems field to given value.


### GetLanguageMix

`func (o *Highlights) GetLanguageMix() []HighlightsLanguageMixInner`

GetLanguageMix returns the LanguageMix field if non-nil, zero value otherwise.

### GetLanguageMixOk

`func (o *Highlights) GetLanguageMixOk() (*[]HighlightsLanguageMixInner, bool)`

GetLanguageMixOk returns a tuple with the LanguageMix field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLanguageMix

`func (o *Highlights) SetLanguageMix(v []HighlightsLanguageMixInner)`

SetLanguageMix sets LanguageMix field to given value.


### GetProductMix

`func (o *Highlights) GetProductMix() []HighlightsLanguageMixInner`

GetProductMix returns the ProductMix field if non-nil, zero value otherwise.

### GetProductMixOk

`func (o *Highlights) GetProductMixOk() (*[]HighlightsLanguageMixInner, bool)`

GetProductMixOk returns a tuple with the ProductMix field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProductMix

`func (o *Highlights) SetProductMix(v []HighlightsLanguageMixInner)`

SetProductMix sets ProductMix field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



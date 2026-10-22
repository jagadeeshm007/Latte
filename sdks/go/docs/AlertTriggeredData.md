# AlertTriggeredData

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**RuleId** | **string** |  | 
**RuleName** | **string** |  | 
**Metric** | **string** |  | 
**Scope** | **string** |  | 
**ItemKey** | **NullableString** | the rubric item, for an item fail-rate rule | 
**GroupId** | **string** |  | 
**GroupName** | **string** |  | 
**Value** | **float32** | the metric over the recent window | 
**Baseline** | **float32** | the metric over the baseline window | 
**Calls** | **int32** |  | 

## Methods

### NewAlertTriggeredData

`func NewAlertTriggeredData(ruleId string, ruleName string, metric string, scope string, itemKey NullableString, groupId string, groupName string, value float32, baseline float32, calls int32, ) *AlertTriggeredData`

NewAlertTriggeredData instantiates a new AlertTriggeredData object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAlertTriggeredDataWithDefaults

`func NewAlertTriggeredDataWithDefaults() *AlertTriggeredData`

NewAlertTriggeredDataWithDefaults instantiates a new AlertTriggeredData object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetRuleId

`func (o *AlertTriggeredData) GetRuleId() string`

GetRuleId returns the RuleId field if non-nil, zero value otherwise.

### GetRuleIdOk

`func (o *AlertTriggeredData) GetRuleIdOk() (*string, bool)`

GetRuleIdOk returns a tuple with the RuleId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRuleId

`func (o *AlertTriggeredData) SetRuleId(v string)`

SetRuleId sets RuleId field to given value.


### GetRuleName

`func (o *AlertTriggeredData) GetRuleName() string`

GetRuleName returns the RuleName field if non-nil, zero value otherwise.

### GetRuleNameOk

`func (o *AlertTriggeredData) GetRuleNameOk() (*string, bool)`

GetRuleNameOk returns a tuple with the RuleName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRuleName

`func (o *AlertTriggeredData) SetRuleName(v string)`

SetRuleName sets RuleName field to given value.


### GetMetric

`func (o *AlertTriggeredData) GetMetric() string`

GetMetric returns the Metric field if non-nil, zero value otherwise.

### GetMetricOk

`func (o *AlertTriggeredData) GetMetricOk() (*string, bool)`

GetMetricOk returns a tuple with the Metric field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetric

`func (o *AlertTriggeredData) SetMetric(v string)`

SetMetric sets Metric field to given value.


### GetScope

`func (o *AlertTriggeredData) GetScope() string`

GetScope returns the Scope field if non-nil, zero value otherwise.

### GetScopeOk

`func (o *AlertTriggeredData) GetScopeOk() (*string, bool)`

GetScopeOk returns a tuple with the Scope field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScope

`func (o *AlertTriggeredData) SetScope(v string)`

SetScope sets Scope field to given value.


### GetItemKey

`func (o *AlertTriggeredData) GetItemKey() string`

GetItemKey returns the ItemKey field if non-nil, zero value otherwise.

### GetItemKeyOk

`func (o *AlertTriggeredData) GetItemKeyOk() (*string, bool)`

GetItemKeyOk returns a tuple with the ItemKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItemKey

`func (o *AlertTriggeredData) SetItemKey(v string)`

SetItemKey sets ItemKey field to given value.


### SetItemKeyNil

`func (o *AlertTriggeredData) SetItemKeyNil(b bool)`

 SetItemKeyNil sets the value for ItemKey to be an explicit nil

### UnsetItemKey
`func (o *AlertTriggeredData) UnsetItemKey()`

UnsetItemKey ensures that no value is present for ItemKey, not even an explicit nil
### GetGroupId

`func (o *AlertTriggeredData) GetGroupId() string`

GetGroupId returns the GroupId field if non-nil, zero value otherwise.

### GetGroupIdOk

`func (o *AlertTriggeredData) GetGroupIdOk() (*string, bool)`

GetGroupIdOk returns a tuple with the GroupId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroupId

`func (o *AlertTriggeredData) SetGroupId(v string)`

SetGroupId sets GroupId field to given value.


### GetGroupName

`func (o *AlertTriggeredData) GetGroupName() string`

GetGroupName returns the GroupName field if non-nil, zero value otherwise.

### GetGroupNameOk

`func (o *AlertTriggeredData) GetGroupNameOk() (*string, bool)`

GetGroupNameOk returns a tuple with the GroupName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroupName

`func (o *AlertTriggeredData) SetGroupName(v string)`

SetGroupName sets GroupName field to given value.


### GetValue

`func (o *AlertTriggeredData) GetValue() float32`

GetValue returns the Value field if non-nil, zero value otherwise.

### GetValueOk

`func (o *AlertTriggeredData) GetValueOk() (*float32, bool)`

GetValueOk returns a tuple with the Value field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetValue

`func (o *AlertTriggeredData) SetValue(v float32)`

SetValue sets Value field to given value.


### GetBaseline

`func (o *AlertTriggeredData) GetBaseline() float32`

GetBaseline returns the Baseline field if non-nil, zero value otherwise.

### GetBaselineOk

`func (o *AlertTriggeredData) GetBaselineOk() (*float32, bool)`

GetBaselineOk returns a tuple with the Baseline field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBaseline

`func (o *AlertTriggeredData) SetBaseline(v float32)`

SetBaseline sets Baseline field to given value.


### GetCalls

`func (o *AlertTriggeredData) GetCalls() int32`

GetCalls returns the Calls field if non-nil, zero value otherwise.

### GetCallsOk

`func (o *AlertTriggeredData) GetCallsOk() (*int32, bool)`

GetCallsOk returns a tuple with the Calls field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCalls

`func (o *AlertTriggeredData) SetCalls(v int32)`

SetCalls sets Calls field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



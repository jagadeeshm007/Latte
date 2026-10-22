

# AlertTriggeredData

An alert rule fired for a team, product or agent.

## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**ruleId** | **String** |  |  |
|**ruleName** | **String** |  |  |
|**metric** | [**MetricEnum**](#MetricEnum) |  |  |
|**scope** | [**ScopeEnum**](#ScopeEnum) |  |  |
|**itemKey** | **String** | the rubric item, for an item fail-rate rule |  |
|**groupId** | **String** |  |  |
|**groupName** | **String** |  |  |
|**value** | **BigDecimal** | the metric over the recent window |  |
|**baseline** | **BigDecimal** | the metric over the baseline window |  |
|**calls** | **Integer** |  |  |



## Enum: MetricEnum

| Name | Value |
|---- | -----|
| FLAG_RATE | &quot;flag_rate&quot; |
| AVG_SCORE | &quot;avg_score&quot; |
| ITEM_FAIL_RATE | &quot;item_fail_rate&quot; |



## Enum: ScopeEnum

| Name | Value |
|---- | -----|
| TEAM | &quot;team&quot; |
| PRODUCT | &quot;product&quot; |
| AGENT | &quot;agent&quot; |






# WebhookEndpoint


## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**id** | **String** |  |  |
|**url** | **String** |  |  |
|**description** | **String** |  |  |
|**events** | [**List&lt;EventsEnum&gt;**](#List&lt;EventsEnum&gt;) |  |  |
|**createdBy** | **String** |  |  |
|**createdAt** | **String** |  |  |
|**disabledAt** | **String** |  |  |
|**disabledReason** | **String** |  |  |
|**consecutiveFailures** | **BigDecimal** |  |  |
|**deliveries24h** | **BigDecimal** |  |  |
|**failures24h** | **BigDecimal** |  |  |



## Enum: List&lt;EventsEnum&gt;

| Name | Value |
|---- | -----|
| CALL_SCORED | &quot;call.scored&quot; |
| CALL_FAILED | &quot;call.failed&quot; |
| BATCH_COMPLETED | &quot;batch.completed&quot; |
| ALERT_TRIGGERED | &quot;alert.triggered&quot; |
| DIGEST_READY | &quot;digest.ready&quot; |




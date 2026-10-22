

# UpdateWebhookRequest


## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**url** | **String** |  |  [optional] |
|**description** | **String** |  |  [optional] |
|**events** | [**List&lt;EventsEnum&gt;**](#List&lt;EventsEnum&gt;) |  |  [optional] |
|**enabled** | **Boolean** |  |  [optional] |



## Enum: List&lt;EventsEnum&gt;

| Name | Value |
|---- | -----|
| CALL_SCORED | &quot;call.scored&quot; |
| CALL_FAILED | &quot;call.failed&quot; |
| BATCH_COMPLETED | &quot;batch.completed&quot; |
| ALERT_TRIGGERED | &quot;alert.triggered&quot; |
| DIGEST_READY | &quot;digest.ready&quot; |




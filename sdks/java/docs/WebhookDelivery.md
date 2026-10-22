

# WebhookDelivery


## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**id** | **String** |  |  |
|**eventId** | **String** |  |  |
|**eventType** | **String** |  |  |
|**status** | [**StatusEnum**](#StatusEnum) |  |  |
|**attempts** | **BigDecimal** |  |  |
|**lastStatus** | **BigDecimal** |  |  |
|**lastError** | **String** |  |  |
|**nextAttemptAt** | **String** |  |  |
|**deliveredAt** | **String** |  |  |
|**createdAt** | **String** |  |  |
|**payload** | **Object** |  |  |



## Enum: StatusEnum

| Name | Value |
|---- | -----|
| PENDING | &quot;pending&quot; |
| SUCCEEDED | &quot;succeeded&quot; |
| FAILED | &quot;failed&quot; |




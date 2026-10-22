

# BatchCompletedEvent


## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**id** | **String** | the event id; the same on every redelivery |  |
|**type** | [**TypeEnum**](#TypeEnum) |  |  |
|**createdAt** | **String** | ISO 8601 |  |
|**data** | [**BatchCompletedData**](BatchCompletedData.md) |  |  |



## Enum: TypeEnum

| Name | Value |
|---- | -----|
| BATCH_COMPLETED | &quot;batch.completed&quot; |




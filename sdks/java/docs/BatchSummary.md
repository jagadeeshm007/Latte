

# BatchSummary


## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**id** | **String** |  |  |
|**name** | **String** |  |  |
|**source** | [**SourceEnum**](#SourceEnum) |  |  |
|**createdBy** | **String** |  |  |
|**createdByName** | **String** |  |  |
|**createdAt** | **String** |  |  |
|**archivedAt** | **String** |  |  |
|**total** | **BigDecimal** |  |  |
|**queued** | **BigDecimal** |  |  |
|**processing** | **BigDecimal** |  |  |
|**scored** | **BigDecimal** |  |  |
|**failed** | **BigDecimal** |  |  |
|**flagged** | **BigDecimal** |  |  |
|**avgScore** | **BigDecimal** |  |  |
|**state** | [**StateEnum**](#StateEnum) |  |  |



## Enum: SourceEnum

| Name | Value |
|---- | -----|
| WEB | &quot;web&quot; |
| API | &quot;api&quot; |



## Enum: StateEnum

| Name | Value |
|---- | -----|
| PROCESSING | &quot;processing&quot; |
| COMPLETED | &quot;completed&quot; |
| HAS_FAILURES | &quot;has_failures&quot; |




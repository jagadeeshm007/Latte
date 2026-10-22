

# Finding


## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**id** | **String** |  |  |
|**itemKey** | **String** |  |  |
|**itemType** | [**ItemTypeEnum**](#ItemTypeEnum) |  |  |
|**status** | [**StatusEnum**](#StatusEnum) |  |  |
|**source** | [**SourceEnum**](#SourceEnum) |  |  |
|**quote** | **String** |  |  |
|**segmentSeq** | **BigDecimal** |  |  |
|**startMs** | **BigDecimal** |  |  |
|**endMs** | **BigDecimal** |  |  |
|**channel** | [**ChannelEnum**](#ChannelEnum) |  |  |
|**rationale** | **String** |  |  |
|**grounded** | **Boolean** |  |  |
|**review** | [**FindingReview**](FindingReview.md) |  |  |



## Enum: ItemTypeEnum

| Name | Value |
|---- | -----|
| MANDATORY | &quot;mandatory&quot; |
| PROHIBITED | &quot;prohibited&quot; |
| QUALITY | &quot;quality&quot; |



## Enum: StatusEnum

| Name | Value |
|---- | -----|
| MET | &quot;met&quot; |
| MISSED | &quot;missed&quot; |
| PARTIAL | &quot;partial&quot; |
| BREACH | &quot;breach&quot; |
| CLEAR | &quot;clear&quot; |
| NOT_APPLICABLE | &quot;not_applicable&quot; |



## Enum: SourceEnum

| Name | Value |
|---- | -----|
| LLM | &quot;llm&quot; |
| RULE | &quot;rule&quot; |
| REVIEWER | &quot;reviewer&quot; |



## Enum: ChannelEnum

| Name | Value |
|---- | -----|
| AGENT | &quot;agent&quot; |
| CUSTOMER | &quot;customer&quot; |




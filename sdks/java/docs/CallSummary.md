

# CallSummary


## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**id** | **String** |  |  |
|**agentId** | **String** |  |  |
|**agentName** | **String** |  |  |
|**teamName** | **String** |  |  |
|**productName** | **String** |  |  |
|**callDate** | **String** |  |  |
|**originalFilename** | **String** |  |  |
|**language** | [**LanguageEnum**](#LanguageEnum) |  |  |
|**status** | [**StatusEnum**](#StatusEnum) |  |  |
|**error** | **String** |  |  |
|**durationMs** | **BigDecimal** |  |  |
|**createdAt** | **String** |  |  |
|**overallScore** | **BigDecimal** |  |  |
|**judgeStatus** | **String** |  |  |
|**needsReview** | **Boolean** |  |  |
|**reviewStatus** | [**ReviewStatusEnum**](#ReviewStatusEnum) |  |  |
|**breaches** | **BigDecimal** |  |  |
|**missed** | **BigDecimal** |  |  |
|**flag** | [**FlagEnum**](#FlagEnum) |  |  |
|**archivedAt** | **String** |  |  |
|**batchId** | **String** |  |  |
|**batchName** | **String** |  |  |
|**input** | [**InputEnum**](#InputEnum) |  |  |
|**timed** | **Boolean** |  |  |



## Enum: LanguageEnum

| Name | Value |
|---- | -----|
| EN_IN | &quot;en-IN&quot; |
| HI_IN | &quot;hi-IN&quot; |
| BN_IN | &quot;bn-IN&quot; |
| TA_IN | &quot;ta-IN&quot; |
| TE_IN | &quot;te-IN&quot; |
| KN_IN | &quot;kn-IN&quot; |
| ML_IN | &quot;ml-IN&quot; |
| MR_IN | &quot;mr-IN&quot; |
| GU_IN | &quot;gu-IN&quot; |
| OD_IN | &quot;od-IN&quot; |
| PA_IN | &quot;pa-IN&quot; |
| AUTO | &quot;auto&quot; |



## Enum: StatusEnum

| Name | Value |
|---- | -----|
| UPLOADED | &quot;uploaded&quot; |
| TRANSCRIBING | &quot;transcribing&quot; |
| TRANSCRIBED | &quot;transcribed&quot; |
| SCORING | &quot;scoring&quot; |
| SCORED | &quot;scored&quot; |
| FAILED | &quot;failed&quot; |



## Enum: ReviewStatusEnum

| Name | Value |
|---- | -----|
| NOT_REQUIRED | &quot;not_required&quot; |
| PENDING | &quot;pending&quot; |
| DONE | &quot;done&quot; |



## Enum: FlagEnum

| Name | Value |
|---- | -----|
| FLAGGED | &quot;flagged&quot; |
| PASSED | &quot;passed&quot; |
| PENDING | &quot;pending&quot; |



## Enum: InputEnum

| Name | Value |
|---- | -----|
| AUDIO | &quot;audio&quot; |
| TRANSCRIPT | &quot;transcript&quot; |




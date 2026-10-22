

# CallScoredData

A call has its score and findings.

## Properties

| Name | Type | Description | Notes |
|------------ | ------------- | ------------- | -------------|
|**callId** | **String** |  |  |
|**batchId** | **String** |  |  |
|**agentId** | **String** |  |  |
|**teamId** | **String** |  |  |
|**productId** | **String** |  |  |
|**overallScore** | **BigDecimal** | 0 to 100; null when the judge could not score |  |
|**needsReview** | **Boolean** | true when QA should look at the call |  |
|**judgeStatus** | **String** | ok, or why the judge failed |  |
|**breaches** | **Integer** | prohibited statements found |  |




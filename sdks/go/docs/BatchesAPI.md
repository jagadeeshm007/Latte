# \BatchesAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetBatch**](BatchesAPI.md#GetBatch) | **Get** /api/batches/{id} | One batch with its progress and results
[**ListBatches**](BatchesAPI.md#ListBatches) | **Get** /api/batches | List batches
[**RetryFailedCalls**](BatchesAPI.md#RetryFailedCalls) | **Post** /api/batches/{id}/retry-failed | Queue every failed call in the batch again
[**UpdateBatch**](BatchesAPI.md#UpdateBatch) | **Patch** /api/batches/{id} | Rename or archive a batch



## GetBatch

> BatchDetail GetBatch(ctx, id).Execute()

One batch with its progress and results



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	id := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.BatchesAPI.GetBatch(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BatchesAPI.GetBatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetBatch`: BatchDetail
	fmt.Fprintf(os.Stdout, "Response from `BatchesAPI.GetBatch`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetBatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**BatchDetail**](BatchDetail.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ListBatches

> BatchList ListBatches(ctx).Q(q).State(state).Archived(archived).Page(page).Limit(limit).Execute()

List batches



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	q := "q_example" // string |  (optional)
	state := "state_example" // string |  (optional)
	archived := "archived_example" // string |  (optional)
	page := int32(56) // int32 |  (optional) (default to 1)
	limit := int32(56) // int32 |  (optional) (default to 20)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.BatchesAPI.ListBatches(context.Background()).Q(q).State(state).Archived(archived).Page(page).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BatchesAPI.ListBatches``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ListBatches`: BatchList
	fmt.Fprintf(os.Stdout, "Response from `BatchesAPI.ListBatches`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListBatchesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **q** | **string** |  | 
 **state** | **string** |  | 
 **archived** | **string** |  | 
 **page** | **int32** |  | [default to 1]
 **limit** | **int32** |  | [default to 20]

### Return type

[**BatchList**](BatchList.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## RetryFailedCalls

> BatchRetryResponse RetryFailedCalls(ctx, id).Execute()

Queue every failed call in the batch again



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	id := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.BatchesAPI.RetryFailedCalls(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BatchesAPI.RetryFailedCalls``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `RetryFailedCalls`: BatchRetryResponse
	fmt.Fprintf(os.Stdout, "Response from `BatchesAPI.RetryFailedCalls`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiRetryFailedCallsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**BatchRetryResponse**](BatchRetryResponse.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## UpdateBatch

> BatchDetail UpdateBatch(ctx, id).BatchUpdateRequest(batchUpdateRequest).Execute()

Rename or archive a batch



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	id := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	batchUpdateRequest := *openapiclient.NewBatchUpdateRequest() // BatchUpdateRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.BatchesAPI.UpdateBatch(context.Background(), id).BatchUpdateRequest(batchUpdateRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BatchesAPI.UpdateBatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `UpdateBatch`: BatchDetail
	fmt.Fprintf(os.Stdout, "Response from `BatchesAPI.UpdateBatch`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiUpdateBatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **batchUpdateRequest** | [**BatchUpdateRequest**](BatchUpdateRequest.md) |  | 

### Return type

[**BatchDetail**](BatchDetail.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


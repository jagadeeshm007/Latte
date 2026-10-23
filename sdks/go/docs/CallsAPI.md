# \CallsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**ArchiveCall**](CallsAPI.md#ArchiveCall) | **Post** /api/calls/{id}/archive | Hide a call from lists
[**GetAudioUrl**](CallsAPI.md#GetAudioUrl) | **Post** /api/calls/{id}/audio-url | A short-lived link to the recording
[**GetCall**](CallsAPI.md#GetCall) | **Get** /api/calls/{id} | One call with its transcript and findings
[**ListCalls**](CallsAPI.md#ListCalls) | **Get** /api/calls | List calls
[**RetryCall**](CallsAPI.md#RetryCall) | **Post** /api/calls/{id}/retry | Queue a failed or stuck call again
[**UnarchiveCall**](CallsAPI.md#UnarchiveCall) | **Post** /api/calls/{id}/unarchive | Bring an archived call back



## ArchiveCall

> ArchiveCall(ctx, id).Execute()

Hide a call from lists



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
	r, err := apiClient.CallsAPI.ArchiveCall(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CallsAPI.ArchiveCall``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiArchiveCallRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

 (empty response body)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetAudioUrl

> AudioUrl GetAudioUrl(ctx, id).AudioUrlRequest(audioUrlRequest).Execute()

A short-lived link to the recording



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
	audioUrlRequest := *openapiclient.NewAudioUrlRequest() // AudioUrlRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CallsAPI.GetAudioUrl(context.Background(), id).AudioUrlRequest(audioUrlRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CallsAPI.GetAudioUrl``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetAudioUrl`: AudioUrl
	fmt.Fprintf(os.Stdout, "Response from `CallsAPI.GetAudioUrl`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetAudioUrlRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **audioUrlRequest** | [**AudioUrlRequest**](AudioUrlRequest.md) |  | 

### Return type

[**AudioUrl**](AudioUrl.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetCall

> CallDetail GetCall(ctx, id).Execute()

One call with its transcript and findings



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
	resp, r, err := apiClient.CallsAPI.GetCall(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CallsAPI.GetCall``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetCall`: CallDetail
	fmt.Fprintf(os.Stdout, "Response from `CallsAPI.GetCall`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetCallRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**CallDetail**](CallDetail.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ListCalls

> CallList ListCalls(ctx).Status(status).NeedsReview(needsReview).AgentId(agentId).TeamId(teamId).ProductId(productId).Language(language).Flag(flag).Q(q).BatchId(batchId).Archived(archived).GroupBy(groupBy).Limit(limit).Page(page).Cursor(cursor).Execute()

List calls



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
	status := "status_example" // string |  (optional)
	needsReview := "needsReview_example" // string |  (optional)
	agentId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string |  (optional)
	teamId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string |  (optional)
	productId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string |  (optional)
	language := "language_example" // string |  (optional)
	flag := "flag_example" // string |  (optional)
	q := "q_example" // string |  (optional)
	batchId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string |  (optional)
	archived := "archived_example" // string |  (optional)
	groupBy := "groupBy_example" // string |  (optional)
	limit := int32(56) // int32 |  (optional) (default to 50)
	page := int32(56) // int32 |  (optional)
	cursor := "cursor_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CallsAPI.ListCalls(context.Background()).Status(status).NeedsReview(needsReview).AgentId(agentId).TeamId(teamId).ProductId(productId).Language(language).Flag(flag).Q(q).BatchId(batchId).Archived(archived).GroupBy(groupBy).Limit(limit).Page(page).Cursor(cursor).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CallsAPI.ListCalls``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ListCalls`: CallList
	fmt.Fprintf(os.Stdout, "Response from `CallsAPI.ListCalls`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListCallsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **status** | **string** |  | 
 **needsReview** | **string** |  | 
 **agentId** | **string** |  | 
 **teamId** | **string** |  | 
 **productId** | **string** |  | 
 **language** | **string** |  | 
 **flag** | **string** |  | 
 **q** | **string** |  | 
 **batchId** | **string** |  | 
 **archived** | **string** |  | 
 **groupBy** | **string** |  | 
 **limit** | **int32** |  | [default to 50]
 **page** | **int32** |  | 
 **cursor** | **string** |  | 

### Return type

[**CallList**](CallList.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## RetryCall

> CallRetryResponse RetryCall(ctx, id).Execute()

Queue a failed or stuck call again



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
	resp, r, err := apiClient.CallsAPI.RetryCall(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CallsAPI.RetryCall``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `RetryCall`: CallRetryResponse
	fmt.Fprintf(os.Stdout, "Response from `CallsAPI.RetryCall`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiRetryCallRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**CallRetryResponse**](CallRetryResponse.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## UnarchiveCall

> UnarchiveCall(ctx, id).Execute()

Bring an archived call back



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
	r, err := apiClient.CallsAPI.UnarchiveCall(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CallsAPI.UnarchiveCall``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiUnarchiveCallRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

 (empty response body)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


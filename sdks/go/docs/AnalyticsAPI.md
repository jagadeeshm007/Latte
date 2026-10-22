# \AnalyticsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetDashboard**](AnalyticsAPI.md#GetDashboard) | **Get** /api/dashboard | Results grouped by team, product, agent or language
[**GetHighlights**](AnalyticsAPI.md#GetHighlights) | **Get** /api/dashboard/highlights | The period&#39;s headline numbers and highlights
[**GetLeaderboard**](AnalyticsAPI.md#GetLeaderboard) | **Get** /api/dashboard/leaderboard | A sorted, paged ranking of any grouping



## GetDashboard

> Dashboard GetDashboard(ctx).GroupBy(groupBy).From(from).To(to).Execute()

Results grouped by team, product, agent or language



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
	groupBy := "groupBy_example" // string |  (optional) (default to "team")
	from := "from_example" // string |  (optional)
	to := "to_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.GetDashboard(context.Background()).GroupBy(groupBy).From(from).To(to).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.GetDashboard``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetDashboard`: Dashboard
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.GetDashboard`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetDashboardRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groupBy** | **string** |  | [default to &quot;team&quot;]
 **from** | **string** |  | 
 **to** | **string** |  | 

### Return type

[**Dashboard**](Dashboard.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetHighlights

> Highlights GetHighlights(ctx).From(from).To(to).Execute()

The period's headline numbers and highlights



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
	from := "from_example" // string |  (optional)
	to := "to_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.GetHighlights(context.Background()).From(from).To(to).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.GetHighlights``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetHighlights`: Highlights
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.GetHighlights`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetHighlightsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **from** | **string** |  | 
 **to** | **string** |  | 

### Return type

[**Highlights**](Highlights.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetLeaderboard

> Leaderboard GetLeaderboard(ctx).GroupBy(groupBy).Q(q).Sort(sort).Dir(dir).Page(page).Limit(limit).MinCalls(minCalls).From(from).To(to).Execute()

A sorted, paged ranking of any grouping



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
	groupBy := "groupBy_example" // string |  (optional) (default to "agent")
	q := "q_example" // string |  (optional)
	sort := "sort_example" // string |  (optional) (default to "avgScore")
	dir := "dir_example" // string |  (optional) (default to "desc")
	page := int32(56) // int32 |  (optional) (default to 1)
	limit := int32(56) // int32 |  (optional) (default to 25)
	minCalls := int32(56) // int32 |  (optional) (default to 1)
	from := "from_example" // string |  (optional)
	to := "to_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.GetLeaderboard(context.Background()).GroupBy(groupBy).Q(q).Sort(sort).Dir(dir).Page(page).Limit(limit).MinCalls(minCalls).From(from).To(to).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.GetLeaderboard``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetLeaderboard`: Leaderboard
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.GetLeaderboard`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetLeaderboardRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groupBy** | **string** |  | [default to &quot;agent&quot;]
 **q** | **string** |  | 
 **sort** | **string** |  | [default to &quot;avgScore&quot;]
 **dir** | **string** |  | [default to &quot;desc&quot;]
 **page** | **int32** |  | [default to 1]
 **limit** | **int32** |  | [default to 25]
 **minCalls** | **int32** |  | [default to 1]
 **from** | **string** |  | 
 **to** | **string** |  | 

### Return type

[**Leaderboard**](Leaderboard.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


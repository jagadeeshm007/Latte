# AnalyticsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getDashboard**](AnalyticsApi.md#getDashboard) | **GET** /api/dashboard | Results grouped by team, product, agent or language |
| [**getDashboardWithHttpInfo**](AnalyticsApi.md#getDashboardWithHttpInfo) | **GET** /api/dashboard | Results grouped by team, product, agent or language |
| [**getHighlights**](AnalyticsApi.md#getHighlights) | **GET** /api/dashboard/highlights | The period&#39;s headline numbers and highlights |
| [**getHighlightsWithHttpInfo**](AnalyticsApi.md#getHighlightsWithHttpInfo) | **GET** /api/dashboard/highlights | The period&#39;s headline numbers and highlights |
| [**getLeaderboard**](AnalyticsApi.md#getLeaderboard) | **GET** /api/dashboard/leaderboard | A sorted, paged ranking of any grouping |
| [**getLeaderboardWithHttpInfo**](AnalyticsApi.md#getLeaderboardWithHttpInfo) | **GET** /api/dashboard/leaderboard | A sorted, paged ranking of any grouping |



## getDashboard

> Dashboard getDashboard(getDashboardRequest)

Results grouped by team, product, agent or language

Needs the &#x60;analytics:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.AnalyticsApi;
import io.github.jagadeeshm007.latte.api.AnalyticsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        AnalyticsApi apiInstance = new AnalyticsApi(defaultClient);
        String groupBy = "team"; // String | 
        String from = "from_example"; // String | 
        String to = "to_example"; // String | 
        try {
            APIgetDashboardRequest request = APIgetDashboardRequest.newBuilder()
                .groupBy(groupBy)
                .from(from)
                .to(to)
                .build();
            Dashboard result = apiInstance.getDashboard(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling AnalyticsApi#getDashboard");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Reason: " + e.getResponseBody());
            System.err.println("Response headers: " + e.getResponseHeaders());
            e.printStackTrace();
        }
    }
}
```

### Parameters

|    Name      |    Type       | Description   |     Notes    |
|------------- | ------------- | ------------- | -------------|
| getDashboardRequest | [**APIgetDashboardRequest**](AnalyticsApi.md#APIgetDashboardRequest)|-|-|

### Return type

[**Dashboard**](Dashboard.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## getDashboardWithHttpInfo

> ApiResponse<Dashboard> getDashboardWithHttpInfo(getDashboardRequest)

Results grouped by team, product, agent or language

Needs the &#x60;analytics:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.AnalyticsApi;
import io.github.jagadeeshm007.latte.api.AnalyticsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        AnalyticsApi apiInstance = new AnalyticsApi(defaultClient);
        String groupBy = "team"; // String | 
        String from = "from_example"; // String | 
        String to = "to_example"; // String | 
        try {
            APIgetDashboardRequest request = APIgetDashboardRequest.newBuilder()
                .groupBy(groupBy)
                .from(from)
                .to(to)
                .build();
            ApiResponse<Dashboard> response = apiInstance.getDashboardWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling AnalyticsApi#getDashboard");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters

|    Name      |    Type       | Description   |     Notes    |
|------------- | ------------- | ------------- | -------------|
| getDashboardRequest | [**APIgetDashboardRequest**](AnalyticsApi.md#APIgetDashboardRequest)|-|-|

### Return type

ApiResponse<[**Dashboard**](Dashboard.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIgetDashboardRequest"></a>
## APIgetDashboardRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **groupBy** | **String** |  | [optional] [default to team] [enum: team, product, agent, language] |
| **from** | **String** |  | [optional] |
| **to** | **String** |  | [optional] |



## getHighlights

> Highlights getHighlights(getHighlightsRequest)

The period&#39;s headline numbers and highlights

Needs the &#x60;analytics:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.AnalyticsApi;
import io.github.jagadeeshm007.latte.api.AnalyticsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        AnalyticsApi apiInstance = new AnalyticsApi(defaultClient);
        String from = "from_example"; // String | 
        String to = "to_example"; // String | 
        try {
            APIgetHighlightsRequest request = APIgetHighlightsRequest.newBuilder()
                .from(from)
                .to(to)
                .build();
            Highlights result = apiInstance.getHighlights(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling AnalyticsApi#getHighlights");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Reason: " + e.getResponseBody());
            System.err.println("Response headers: " + e.getResponseHeaders());
            e.printStackTrace();
        }
    }
}
```

### Parameters

|    Name      |    Type       | Description   |     Notes    |
|------------- | ------------- | ------------- | -------------|
| getHighlightsRequest | [**APIgetHighlightsRequest**](AnalyticsApi.md#APIgetHighlightsRequest)|-|-|

### Return type

[**Highlights**](Highlights.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## getHighlightsWithHttpInfo

> ApiResponse<Highlights> getHighlightsWithHttpInfo(getHighlightsRequest)

The period&#39;s headline numbers and highlights

Needs the &#x60;analytics:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.AnalyticsApi;
import io.github.jagadeeshm007.latte.api.AnalyticsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        AnalyticsApi apiInstance = new AnalyticsApi(defaultClient);
        String from = "from_example"; // String | 
        String to = "to_example"; // String | 
        try {
            APIgetHighlightsRequest request = APIgetHighlightsRequest.newBuilder()
                .from(from)
                .to(to)
                .build();
            ApiResponse<Highlights> response = apiInstance.getHighlightsWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling AnalyticsApi#getHighlights");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters

|    Name      |    Type       | Description   |     Notes    |
|------------- | ------------- | ------------- | -------------|
| getHighlightsRequest | [**APIgetHighlightsRequest**](AnalyticsApi.md#APIgetHighlightsRequest)|-|-|

### Return type

ApiResponse<[**Highlights**](Highlights.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIgetHighlightsRequest"></a>
## APIgetHighlightsRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **from** | **String** |  | [optional] |
| **to** | **String** |  | [optional] |



## getLeaderboard

> Leaderboard getLeaderboard(getLeaderboardRequest)

A sorted, paged ranking of any grouping

Needs the &#x60;analytics:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.AnalyticsApi;
import io.github.jagadeeshm007.latte.api.AnalyticsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        AnalyticsApi apiInstance = new AnalyticsApi(defaultClient);
        String groupBy = "team"; // String | 
        String q = "q_example"; // String | 
        String sort = "name"; // String | 
        String dir = "asc"; // String | 
        Integer page = 1; // Integer | 
        Integer limit = 25; // Integer | 
        Integer minCalls = 1; // Integer | 
        String from = "from_example"; // String | 
        String to = "to_example"; // String | 
        try {
            APIgetLeaderboardRequest request = APIgetLeaderboardRequest.newBuilder()
                .groupBy(groupBy)
                .q(q)
                .sort(sort)
                .dir(dir)
                .page(page)
                .limit(limit)
                .minCalls(minCalls)
                .from(from)
                .to(to)
                .build();
            Leaderboard result = apiInstance.getLeaderboard(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling AnalyticsApi#getLeaderboard");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Reason: " + e.getResponseBody());
            System.err.println("Response headers: " + e.getResponseHeaders());
            e.printStackTrace();
        }
    }
}
```

### Parameters

|    Name      |    Type       | Description   |     Notes    |
|------------- | ------------- | ------------- | -------------|
| getLeaderboardRequest | [**APIgetLeaderboardRequest**](AnalyticsApi.md#APIgetLeaderboardRequest)|-|-|

### Return type

[**Leaderboard**](Leaderboard.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## getLeaderboardWithHttpInfo

> ApiResponse<Leaderboard> getLeaderboardWithHttpInfo(getLeaderboardRequest)

A sorted, paged ranking of any grouping

Needs the &#x60;analytics:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.AnalyticsApi;
import io.github.jagadeeshm007.latte.api.AnalyticsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        AnalyticsApi apiInstance = new AnalyticsApi(defaultClient);
        String groupBy = "team"; // String | 
        String q = "q_example"; // String | 
        String sort = "name"; // String | 
        String dir = "asc"; // String | 
        Integer page = 1; // Integer | 
        Integer limit = 25; // Integer | 
        Integer minCalls = 1; // Integer | 
        String from = "from_example"; // String | 
        String to = "to_example"; // String | 
        try {
            APIgetLeaderboardRequest request = APIgetLeaderboardRequest.newBuilder()
                .groupBy(groupBy)
                .q(q)
                .sort(sort)
                .dir(dir)
                .page(page)
                .limit(limit)
                .minCalls(minCalls)
                .from(from)
                .to(to)
                .build();
            ApiResponse<Leaderboard> response = apiInstance.getLeaderboardWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling AnalyticsApi#getLeaderboard");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters

|    Name      |    Type       | Description   |     Notes    |
|------------- | ------------- | ------------- | -------------|
| getLeaderboardRequest | [**APIgetLeaderboardRequest**](AnalyticsApi.md#APIgetLeaderboardRequest)|-|-|

### Return type

ApiResponse<[**Leaderboard**](Leaderboard.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIgetLeaderboardRequest"></a>
## APIgetLeaderboardRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **groupBy** | **String** |  | [optional] [default to agent] [enum: team, product, agent, language] |
| **q** | **String** |  | [optional] |
| **sort** | **String** |  | [optional] [default to avgScore] [enum: name, calls, avgScore, flagRate, breaches] |
| **dir** | **String** |  | [optional] [default to desc] [enum: asc, desc] |
| **page** | **Integer** |  | [optional] [default to 1] |
| **limit** | **Integer** |  | [optional] [default to 25] |
| **minCalls** | **Integer** |  | [optional] [default to 1] |
| **from** | **String** |  | [optional] |
| **to** | **String** |  | [optional] |



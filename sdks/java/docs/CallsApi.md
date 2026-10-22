# CallsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**archiveCall**](CallsApi.md#archiveCall) | **POST** /api/calls/{id}/archive | Hide a call from lists |
| [**archiveCallWithHttpInfo**](CallsApi.md#archiveCallWithHttpInfo) | **POST** /api/calls/{id}/archive | Hide a call from lists |
| [**getAudioUrl**](CallsApi.md#getAudioUrl) | **POST** /api/calls/{id}/audio-url | A short-lived link to the recording |
| [**getAudioUrlWithHttpInfo**](CallsApi.md#getAudioUrlWithHttpInfo) | **POST** /api/calls/{id}/audio-url | A short-lived link to the recording |
| [**getCall**](CallsApi.md#getCall) | **GET** /api/calls/{id} | One call with its transcript and findings |
| [**getCallWithHttpInfo**](CallsApi.md#getCallWithHttpInfo) | **GET** /api/calls/{id} | One call with its transcript and findings |
| [**listCalls**](CallsApi.md#listCalls) | **GET** /api/calls | List calls |
| [**listCallsWithHttpInfo**](CallsApi.md#listCallsWithHttpInfo) | **GET** /api/calls | List calls |
| [**retryCall**](CallsApi.md#retryCall) | **POST** /api/calls/{id}/retry | Queue a failed or stuck call again |
| [**retryCallWithHttpInfo**](CallsApi.md#retryCallWithHttpInfo) | **POST** /api/calls/{id}/retry | Queue a failed or stuck call again |
| [**unarchiveCall**](CallsApi.md#unarchiveCall) | **POST** /api/calls/{id}/unarchive | Bring an archived call back |
| [**unarchiveCallWithHttpInfo**](CallsApi.md#unarchiveCallWithHttpInfo) | **POST** /api/calls/{id}/unarchive | Bring an archived call back |



## archiveCall

> void archiveCall(archiveCallRequest)

Hide a call from lists

Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIarchiveCallRequest request = APIarchiveCallRequest.newBuilder()
                .id(id)
                .build();
            apiInstance.archiveCall(request);
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#archiveCall");
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
| archiveCallRequest | [**APIarchiveCallRequest**](CallsApi.md#APIarchiveCallRequest)|-|-|

### Return type


null (empty response body)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Done; no body |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## archiveCallWithHttpInfo

> ApiResponse<Void> archiveCallWithHttpInfo(archiveCallRequest)

Hide a call from lists

Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIarchiveCallRequest request = APIarchiveCallRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<Void> response = apiInstance.archiveCallWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#archiveCall");
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
| archiveCallRequest | [**APIarchiveCallRequest**](CallsApi.md#APIarchiveCallRequest)|-|-|

### Return type


ApiResponse<Void>

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Done; no body |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIarchiveCallRequest"></a>
## APIarchiveCallRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



## getAudioUrl

> AudioUrl getAudioUrl(getAudioUrlRequest)

A short-lived link to the recording

Needs the &#x60;calls:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        AudioUrlRequest audioUrlRequest = new AudioUrlRequest(); // AudioUrlRequest | 
        try {
            APIgetAudioUrlRequest request = APIgetAudioUrlRequest.newBuilder()
                .id(id)
                .audioUrlRequest(audioUrlRequest)
                .build();
            AudioUrl result = apiInstance.getAudioUrl(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#getAudioUrl");
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
| getAudioUrlRequest | [**APIgetAudioUrlRequest**](CallsApi.md#APIgetAudioUrlRequest)|-|-|

### Return type

[**AudioUrl**](AudioUrl.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## getAudioUrlWithHttpInfo

> ApiResponse<AudioUrl> getAudioUrlWithHttpInfo(getAudioUrlRequest)

A short-lived link to the recording

Needs the &#x60;calls:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        AudioUrlRequest audioUrlRequest = new AudioUrlRequest(); // AudioUrlRequest | 
        try {
            APIgetAudioUrlRequest request = APIgetAudioUrlRequest.newBuilder()
                .id(id)
                .audioUrlRequest(audioUrlRequest)
                .build();
            ApiResponse<AudioUrl> response = apiInstance.getAudioUrlWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#getAudioUrl");
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
| getAudioUrlRequest | [**APIgetAudioUrlRequest**](CallsApi.md#APIgetAudioUrlRequest)|-|-|

### Return type

ApiResponse<[**AudioUrl**](AudioUrl.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIgetAudioUrlRequest"></a>
## APIgetAudioUrlRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |
| **audioUrlRequest** | [**AudioUrlRequest**](AudioUrlRequest.md) |  | |



## getCall

> CallDetail getCall(getCallRequest)

One call with its transcript and findings

Personal data in the transcript and quotes is masked for API keys. Needs the &#x60;calls:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIgetCallRequest request = APIgetCallRequest.newBuilder()
                .id(id)
                .build();
            CallDetail result = apiInstance.getCall(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#getCall");
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
| getCallRequest | [**APIgetCallRequest**](CallsApi.md#APIgetCallRequest)|-|-|

### Return type

[**CallDetail**](CallDetail.md)


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

## getCallWithHttpInfo

> ApiResponse<CallDetail> getCallWithHttpInfo(getCallRequest)

One call with its transcript and findings

Personal data in the transcript and quotes is masked for API keys. Needs the &#x60;calls:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIgetCallRequest request = APIgetCallRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<CallDetail> response = apiInstance.getCallWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#getCall");
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
| getCallRequest | [**APIgetCallRequest**](CallsApi.md#APIgetCallRequest)|-|-|

### Return type

ApiResponse<[**CallDetail**](CallDetail.md)>


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


<a id="APIgetCallRequest"></a>
## APIgetCallRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



## listCalls

> CallList listCalls(listCallsRequest)

List calls

Filter by status, flag, agent, team, product, language, batch or text. Paged with &#x60;limit&#x60; and &#x60;page&#x60;, or &#x60;cursor&#x60;. Needs the &#x60;calls:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        String status = "uploaded"; // String | 
        String needsReview = "true"; // String | 
        UUID agentId = UUID.randomUUID(); // UUID | 
        UUID teamId = UUID.randomUUID(); // UUID | 
        UUID productId = UUID.randomUUID(); // UUID | 
        String language = "en-IN"; // String | 
        String flag = "flagged"; // String | 
        String q = "q_example"; // String | 
        UUID batchId = UUID.randomUUID(); // UUID | 
        String archived = "true"; // String | 
        String groupBy = "agent"; // String | 
        Integer limit = 50; // Integer | 
        Integer page = 56; // Integer | 
        String cursor = "cursor_example"; // String | 
        try {
            APIlistCallsRequest request = APIlistCallsRequest.newBuilder()
                .status(status)
                .needsReview(needsReview)
                .agentId(agentId)
                .teamId(teamId)
                .productId(productId)
                .language(language)
                .flag(flag)
                .q(q)
                .batchId(batchId)
                .archived(archived)
                .groupBy(groupBy)
                .limit(limit)
                .page(page)
                .cursor(cursor)
                .build();
            CallList result = apiInstance.listCalls(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#listCalls");
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
| listCallsRequest | [**APIlistCallsRequest**](CallsApi.md#APIlistCallsRequest)|-|-|

### Return type

[**CallList**](CallList.md)


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

## listCallsWithHttpInfo

> ApiResponse<CallList> listCallsWithHttpInfo(listCallsRequest)

List calls

Filter by status, flag, agent, team, product, language, batch or text. Paged with &#x60;limit&#x60; and &#x60;page&#x60;, or &#x60;cursor&#x60;. Needs the &#x60;calls:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        String status = "uploaded"; // String | 
        String needsReview = "true"; // String | 
        UUID agentId = UUID.randomUUID(); // UUID | 
        UUID teamId = UUID.randomUUID(); // UUID | 
        UUID productId = UUID.randomUUID(); // UUID | 
        String language = "en-IN"; // String | 
        String flag = "flagged"; // String | 
        String q = "q_example"; // String | 
        UUID batchId = UUID.randomUUID(); // UUID | 
        String archived = "true"; // String | 
        String groupBy = "agent"; // String | 
        Integer limit = 50; // Integer | 
        Integer page = 56; // Integer | 
        String cursor = "cursor_example"; // String | 
        try {
            APIlistCallsRequest request = APIlistCallsRequest.newBuilder()
                .status(status)
                .needsReview(needsReview)
                .agentId(agentId)
                .teamId(teamId)
                .productId(productId)
                .language(language)
                .flag(flag)
                .q(q)
                .batchId(batchId)
                .archived(archived)
                .groupBy(groupBy)
                .limit(limit)
                .page(page)
                .cursor(cursor)
                .build();
            ApiResponse<CallList> response = apiInstance.listCallsWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#listCalls");
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
| listCallsRequest | [**APIlistCallsRequest**](CallsApi.md#APIlistCallsRequest)|-|-|

### Return type

ApiResponse<[**CallList**](CallList.md)>


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


<a id="APIlistCallsRequest"></a>
## APIlistCallsRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **status** | **String** |  | [optional] [enum: uploaded, transcribing, transcribed, scoring, scored, failed] |
| **needsReview** | **String** |  | [optional] [enum: true, false] |
| **agentId** | **UUID** |  | [optional] |
| **teamId** | **UUID** |  | [optional] |
| **productId** | **UUID** |  | [optional] |
| **language** | **String** |  | [optional] [enum: en-IN, hi-IN, bn-IN, ta-IN, te-IN, kn-IN, ml-IN, mr-IN, gu-IN, od-IN, pa-IN, auto] |
| **flag** | **String** |  | [optional] [enum: flagged, passed, pending] |
| **q** | **String** |  | [optional] |
| **batchId** | **UUID** |  | [optional] |
| **archived** | **String** |  | [optional] [enum: true, false] |
| **groupBy** | **String** |  | [optional] [enum: agent, team, product, language, status, flag] |
| **limit** | **Integer** |  | [optional] [default to 50] |
| **page** | **Integer** |  | [optional] |
| **cursor** | **String** |  | [optional] |



## retryCall

> CallRetryResponse retryCall(retryCallRequest)

Queue a failed or stuck call again

Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIretryCallRequest request = APIretryCallRequest.newBuilder()
                .id(id)
                .build();
            CallRetryResponse result = apiInstance.retryCall(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#retryCall");
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
| retryCallRequest | [**APIretryCallRequest**](CallsApi.md#APIretryCallRequest)|-|-|

### Return type

[**CallRetryResponse**](CallRetryResponse.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **202** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## retryCallWithHttpInfo

> ApiResponse<CallRetryResponse> retryCallWithHttpInfo(retryCallRequest)

Queue a failed or stuck call again

Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIretryCallRequest request = APIretryCallRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<CallRetryResponse> response = apiInstance.retryCallWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#retryCall");
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
| retryCallRequest | [**APIretryCallRequest**](CallsApi.md#APIretryCallRequest)|-|-|

### Return type

ApiResponse<[**CallRetryResponse**](CallRetryResponse.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **202** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIretryCallRequest"></a>
## APIretryCallRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



## unarchiveCall

> void unarchiveCall(unarchiveCallRequest)

Bring an archived call back

Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIunarchiveCallRequest request = APIunarchiveCallRequest.newBuilder()
                .id(id)
                .build();
            apiInstance.unarchiveCall(request);
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#unarchiveCall");
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
| unarchiveCallRequest | [**APIunarchiveCallRequest**](CallsApi.md#APIunarchiveCallRequest)|-|-|

### Return type


null (empty response body)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Done; no body |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## unarchiveCallWithHttpInfo

> ApiResponse<Void> unarchiveCallWithHttpInfo(unarchiveCallRequest)

Bring an archived call back

Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.CallsApi;
import io.github.jagadeeshm007.latte.api.CallsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        CallsApi apiInstance = new CallsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIunarchiveCallRequest request = APIunarchiveCallRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<Void> response = apiInstance.unarchiveCallWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
        } catch (ApiException e) {
            System.err.println("Exception when calling CallsApi#unarchiveCall");
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
| unarchiveCallRequest | [**APIunarchiveCallRequest**](CallsApi.md#APIunarchiveCallRequest)|-|-|

### Return type


ApiResponse<Void>

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Done; no body |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIunarchiveCallRequest"></a>
## APIunarchiveCallRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



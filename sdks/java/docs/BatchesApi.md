# BatchesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getBatch**](BatchesApi.md#getBatch) | **GET** /api/batches/{id} | One batch with its progress and results |
| [**getBatchWithHttpInfo**](BatchesApi.md#getBatchWithHttpInfo) | **GET** /api/batches/{id} | One batch with its progress and results |
| [**listBatches**](BatchesApi.md#listBatches) | **GET** /api/batches | List batches |
| [**listBatchesWithHttpInfo**](BatchesApi.md#listBatchesWithHttpInfo) | **GET** /api/batches | List batches |
| [**retryFailedCalls**](BatchesApi.md#retryFailedCalls) | **POST** /api/batches/{id}/retry-failed | Queue every failed call in the batch again |
| [**retryFailedCallsWithHttpInfo**](BatchesApi.md#retryFailedCallsWithHttpInfo) | **POST** /api/batches/{id}/retry-failed | Queue every failed call in the batch again |
| [**updateBatch**](BatchesApi.md#updateBatch) | **PATCH** /api/batches/{id} | Rename or archive a batch |
| [**updateBatchWithHttpInfo**](BatchesApi.md#updateBatchWithHttpInfo) | **PATCH** /api/batches/{id} | Rename or archive a batch |



## getBatch

> BatchDetail getBatch(getBatchRequest)

One batch with its progress and results

Needs the &#x60;batches:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.BatchesApi;
import io.github.jagadeeshm007.latte.api.BatchesApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        BatchesApi apiInstance = new BatchesApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIgetBatchRequest request = APIgetBatchRequest.newBuilder()
                .id(id)
                .build();
            BatchDetail result = apiInstance.getBatch(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling BatchesApi#getBatch");
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
| getBatchRequest | [**APIgetBatchRequest**](BatchesApi.md#APIgetBatchRequest)|-|-|

### Return type

[**BatchDetail**](BatchDetail.md)


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

## getBatchWithHttpInfo

> ApiResponse<BatchDetail> getBatchWithHttpInfo(getBatchRequest)

One batch with its progress and results

Needs the &#x60;batches:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.BatchesApi;
import io.github.jagadeeshm007.latte.api.BatchesApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        BatchesApi apiInstance = new BatchesApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIgetBatchRequest request = APIgetBatchRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<BatchDetail> response = apiInstance.getBatchWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling BatchesApi#getBatch");
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
| getBatchRequest | [**APIgetBatchRequest**](BatchesApi.md#APIgetBatchRequest)|-|-|

### Return type

ApiResponse<[**BatchDetail**](BatchDetail.md)>


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


<a id="APIgetBatchRequest"></a>
## APIgetBatchRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



## listBatches

> BatchList listBatches(listBatchesRequest)

List batches

Needs the &#x60;batches:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.BatchesApi;
import io.github.jagadeeshm007.latte.api.BatchesApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        BatchesApi apiInstance = new BatchesApi(defaultClient);
        String q = "q_example"; // String | 
        String state = "processing"; // String | 
        String archived = "true"; // String | 
        Integer page = 1; // Integer | 
        Integer limit = 20; // Integer | 
        try {
            APIlistBatchesRequest request = APIlistBatchesRequest.newBuilder()
                .q(q)
                .state(state)
                .archived(archived)
                .page(page)
                .limit(limit)
                .build();
            BatchList result = apiInstance.listBatches(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling BatchesApi#listBatches");
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
| listBatchesRequest | [**APIlistBatchesRequest**](BatchesApi.md#APIlistBatchesRequest)|-|-|

### Return type

[**BatchList**](BatchList.md)


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

## listBatchesWithHttpInfo

> ApiResponse<BatchList> listBatchesWithHttpInfo(listBatchesRequest)

List batches

Needs the &#x60;batches:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.BatchesApi;
import io.github.jagadeeshm007.latte.api.BatchesApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        BatchesApi apiInstance = new BatchesApi(defaultClient);
        String q = "q_example"; // String | 
        String state = "processing"; // String | 
        String archived = "true"; // String | 
        Integer page = 1; // Integer | 
        Integer limit = 20; // Integer | 
        try {
            APIlistBatchesRequest request = APIlistBatchesRequest.newBuilder()
                .q(q)
                .state(state)
                .archived(archived)
                .page(page)
                .limit(limit)
                .build();
            ApiResponse<BatchList> response = apiInstance.listBatchesWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling BatchesApi#listBatches");
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
| listBatchesRequest | [**APIlistBatchesRequest**](BatchesApi.md#APIlistBatchesRequest)|-|-|

### Return type

ApiResponse<[**BatchList**](BatchList.md)>


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


<a id="APIlistBatchesRequest"></a>
## APIlistBatchesRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **q** | **String** |  | [optional] |
| **state** | **String** |  | [optional] [enum: processing, completed, has_failures] |
| **archived** | **String** |  | [optional] [enum: true, false] |
| **page** | **Integer** |  | [optional] [default to 1] |
| **limit** | **Integer** |  | [optional] [default to 20] |



## retryFailedCalls

> BatchRetryResponse retryFailedCalls(retryFailedCallsRequest)

Queue every failed call in the batch again

Accepts an &#x60;Idempotency-Key&#x60; header. Needs the &#x60;batches:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.BatchesApi;
import io.github.jagadeeshm007.latte.api.BatchesApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        BatchesApi apiInstance = new BatchesApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIretryFailedCallsRequest request = APIretryFailedCallsRequest.newBuilder()
                .id(id)
                .build();
            BatchRetryResponse result = apiInstance.retryFailedCalls(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling BatchesApi#retryFailedCalls");
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
| retryFailedCallsRequest | [**APIretryFailedCallsRequest**](BatchesApi.md#APIretryFailedCallsRequest)|-|-|

### Return type

[**BatchRetryResponse**](BatchRetryResponse.md)


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

## retryFailedCallsWithHttpInfo

> ApiResponse<BatchRetryResponse> retryFailedCallsWithHttpInfo(retryFailedCallsRequest)

Queue every failed call in the batch again

Accepts an &#x60;Idempotency-Key&#x60; header. Needs the &#x60;batches:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.BatchesApi;
import io.github.jagadeeshm007.latte.api.BatchesApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        BatchesApi apiInstance = new BatchesApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIretryFailedCallsRequest request = APIretryFailedCallsRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<BatchRetryResponse> response = apiInstance.retryFailedCallsWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling BatchesApi#retryFailedCalls");
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
| retryFailedCallsRequest | [**APIretryFailedCallsRequest**](BatchesApi.md#APIretryFailedCallsRequest)|-|-|

### Return type

ApiResponse<[**BatchRetryResponse**](BatchRetryResponse.md)>


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


<a id="APIretryFailedCallsRequest"></a>
## APIretryFailedCallsRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



## updateBatch

> BatchDetail updateBatch(updateBatchRequest)

Rename or archive a batch

Needs the &#x60;batches:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.BatchesApi;
import io.github.jagadeeshm007.latte.api.BatchesApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        BatchesApi apiInstance = new BatchesApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        BatchUpdateRequest batchUpdateRequest = new BatchUpdateRequest(); // BatchUpdateRequest | 
        try {
            APIupdateBatchRequest request = APIupdateBatchRequest.newBuilder()
                .id(id)
                .batchUpdateRequest(batchUpdateRequest)
                .build();
            BatchDetail result = apiInstance.updateBatch(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling BatchesApi#updateBatch");
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
| updateBatchRequest | [**APIupdateBatchRequest**](BatchesApi.md#APIupdateBatchRequest)|-|-|

### Return type

[**BatchDetail**](BatchDetail.md)


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

## updateBatchWithHttpInfo

> ApiResponse<BatchDetail> updateBatchWithHttpInfo(updateBatchRequest)

Rename or archive a batch

Needs the &#x60;batches:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.BatchesApi;
import io.github.jagadeeshm007.latte.api.BatchesApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        BatchesApi apiInstance = new BatchesApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        BatchUpdateRequest batchUpdateRequest = new BatchUpdateRequest(); // BatchUpdateRequest | 
        try {
            APIupdateBatchRequest request = APIupdateBatchRequest.newBuilder()
                .id(id)
                .batchUpdateRequest(batchUpdateRequest)
                .build();
            ApiResponse<BatchDetail> response = apiInstance.updateBatchWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling BatchesApi#updateBatch");
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
| updateBatchRequest | [**APIupdateBatchRequest**](BatchesApi.md#APIupdateBatchRequest)|-|-|

### Return type

ApiResponse<[**BatchDetail**](BatchDetail.md)>


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


<a id="APIupdateBatchRequest"></a>
## APIupdateBatchRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |
| **batchUpdateRequest** | [**BatchUpdateRequest**](BatchUpdateRequest.md) |  | |



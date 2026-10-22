# ExportsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**exportBatchZip**](ExportsApi.md#exportBatchZip) | **GET** /api/batches/{id}/export.zip | Results, transcripts and recordings as a ZIP (up to 200 calls) |
| [**exportBatchZipWithHttpInfo**](ExportsApi.md#exportBatchZipWithHttpInfo) | **GET** /api/batches/{id}/export.zip | Results, transcripts and recordings as a ZIP (up to 200 calls) |
| [**getBatchResultsCsv**](ExportsApi.md#getBatchResultsCsv) | **GET** /api/batches/{id}/results.csv | Results, one row per call and one column per rubric item |
| [**getBatchResultsCsvWithHttpInfo**](ExportsApi.md#getBatchResultsCsvWithHttpInfo) | **GET** /api/batches/{id}/results.csv | Results, one row per call and one column per rubric item |



## exportBatchZip

> File exportBatchZip(exportBatchZipRequest)

Results, transcripts and recordings as a ZIP (up to 200 calls)

Needs the &#x60;exports:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.ExportsApi;
import io.github.jagadeeshm007.latte.api.ExportsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        ExportsApi apiInstance = new ExportsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        String include = "include_example"; // String | 
        try {
            APIexportBatchZipRequest request = APIexportBatchZipRequest.newBuilder()
                .id(id)
                .include(include)
                .build();
            File result = apiInstance.exportBatchZip(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling ExportsApi#exportBatchZip");
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
| exportBatchZipRequest | [**APIexportBatchZipRequest**](ExportsApi.md#APIexportBatchZipRequest)|-|-|

### Return type

[**File**](File.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/zip, application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The file |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## exportBatchZipWithHttpInfo

> ApiResponse<File> exportBatchZipWithHttpInfo(exportBatchZipRequest)

Results, transcripts and recordings as a ZIP (up to 200 calls)

Needs the &#x60;exports:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.ExportsApi;
import io.github.jagadeeshm007.latte.api.ExportsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        ExportsApi apiInstance = new ExportsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        String include = "include_example"; // String | 
        try {
            APIexportBatchZipRequest request = APIexportBatchZipRequest.newBuilder()
                .id(id)
                .include(include)
                .build();
            ApiResponse<File> response = apiInstance.exportBatchZipWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling ExportsApi#exportBatchZip");
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
| exportBatchZipRequest | [**APIexportBatchZipRequest**](ExportsApi.md#APIexportBatchZipRequest)|-|-|

### Return type

ApiResponse<[**File**](File.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/zip, application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The file |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIexportBatchZipRequest"></a>
## APIexportBatchZipRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |
| **include** | **String** |  | [optional] |



## getBatchResultsCsv

> File getBatchResultsCsv(getBatchResultsCsvRequest)

Results, one row per call and one column per rubric item

Needs the &#x60;exports:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.ExportsApi;
import io.github.jagadeeshm007.latte.api.ExportsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        ExportsApi apiInstance = new ExportsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIgetBatchResultsCsvRequest request = APIgetBatchResultsCsvRequest.newBuilder()
                .id(id)
                .build();
            File result = apiInstance.getBatchResultsCsv(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling ExportsApi#getBatchResultsCsv");
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
| getBatchResultsCsvRequest | [**APIgetBatchResultsCsvRequest**](ExportsApi.md#APIgetBatchResultsCsvRequest)|-|-|

### Return type

[**File**](File.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/csv, application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The file |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## getBatchResultsCsvWithHttpInfo

> ApiResponse<File> getBatchResultsCsvWithHttpInfo(getBatchResultsCsvRequest)

Results, one row per call and one column per rubric item

Needs the &#x60;exports:read&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.ExportsApi;
import io.github.jagadeeshm007.latte.api.ExportsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        ExportsApi apiInstance = new ExportsApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIgetBatchResultsCsvRequest request = APIgetBatchResultsCsvRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<File> response = apiInstance.getBatchResultsCsvWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling ExportsApi#getBatchResultsCsv");
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
| getBatchResultsCsvRequest | [**APIgetBatchResultsCsvRequest**](ExportsApi.md#APIgetBatchResultsCsvRequest)|-|-|

### Return type

ApiResponse<[**File**](File.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/csv, application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The file |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIgetBatchResultsCsvRequest"></a>
## APIgetBatchResultsCsvRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



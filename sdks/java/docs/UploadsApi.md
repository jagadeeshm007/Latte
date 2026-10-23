# UploadsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**confirmUploads**](UploadsApi.md#confirmUploads) | **POST** /api/uploads/confirm | Create calls from uploaded recordings, into a new or existing batch |
| [**confirmUploadsWithHttpInfo**](UploadsApi.md#confirmUploadsWithHttpInfo) | **POST** /api/uploads/confirm | Create calls from uploaded recordings, into a new or existing batch |
| [**signUploads**](UploadsApi.md#signUploads) | **POST** /api/uploads/sign | Signed upload URLs for up to 50 recordings |
| [**signUploadsWithHttpInfo**](UploadsApi.md#signUploadsWithHttpInfo) | **POST** /api/uploads/sign | Signed upload URLs for up to 50 recordings |
| [**uploadTranscripts**](UploadsApi.md#uploadTranscripts) | **POST** /api/uploads/transcripts | Create calls from transcripts, with no audio, into a new or existing batch |
| [**uploadTranscriptsWithHttpInfo**](UploadsApi.md#uploadTranscriptsWithHttpInfo) | **POST** /api/uploads/transcripts | Create calls from transcripts, with no audio, into a new or existing batch |



## confirmUploads

> UploadResult confirmUploads(confirmUploadsRequest)

Create calls from uploaded recordings, into a new or existing batch

Accepts an &#x60;Idempotency-Key&#x60; header. Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.UploadsApi;
import io.github.jagadeeshm007.latte.api.UploadsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        UploadsApi apiInstance = new UploadsApi(defaultClient);
        UploadConfirmRequest uploadConfirmRequest = new UploadConfirmRequest(); // UploadConfirmRequest | 
        try {
            APIconfirmUploadsRequest request = APIconfirmUploadsRequest.newBuilder()
                .uploadConfirmRequest(uploadConfirmRequest)
                .build();
            UploadResult result = apiInstance.confirmUploads(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling UploadsApi#confirmUploads");
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
| confirmUploadsRequest | [**APIconfirmUploadsRequest**](UploadsApi.md#APIconfirmUploadsRequest)|-|-|

### Return type

[**UploadResult**](UploadResult.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## confirmUploadsWithHttpInfo

> ApiResponse<UploadResult> confirmUploadsWithHttpInfo(confirmUploadsRequest)

Create calls from uploaded recordings, into a new or existing batch

Accepts an &#x60;Idempotency-Key&#x60; header. Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.UploadsApi;
import io.github.jagadeeshm007.latte.api.UploadsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        UploadsApi apiInstance = new UploadsApi(defaultClient);
        UploadConfirmRequest uploadConfirmRequest = new UploadConfirmRequest(); // UploadConfirmRequest | 
        try {
            APIconfirmUploadsRequest request = APIconfirmUploadsRequest.newBuilder()
                .uploadConfirmRequest(uploadConfirmRequest)
                .build();
            ApiResponse<UploadResult> response = apiInstance.confirmUploadsWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling UploadsApi#confirmUploads");
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
| confirmUploadsRequest | [**APIconfirmUploadsRequest**](UploadsApi.md#APIconfirmUploadsRequest)|-|-|

### Return type

ApiResponse<[**UploadResult**](UploadResult.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIconfirmUploadsRequest"></a>
## APIconfirmUploadsRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **uploadConfirmRequest** | [**UploadConfirmRequest**](UploadConfirmRequest.md) |  | |



## signUploads

> UploadSignResponse signUploads(signUploadsRequest)

Signed upload URLs for up to 50 recordings

PUT each file to its &#x60;signedUrl&#x60;, then call confirmUploads with the returned paths. Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.UploadsApi;
import io.github.jagadeeshm007.latte.api.UploadsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        UploadsApi apiInstance = new UploadsApi(defaultClient);
        UploadSignRequest uploadSignRequest = new UploadSignRequest(); // UploadSignRequest | 
        try {
            APIsignUploadsRequest request = APIsignUploadsRequest.newBuilder()
                .uploadSignRequest(uploadSignRequest)
                .build();
            UploadSignResponse result = apiInstance.signUploads(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling UploadsApi#signUploads");
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
| signUploadsRequest | [**APIsignUploadsRequest**](UploadsApi.md#APIsignUploadsRequest)|-|-|

### Return type

[**UploadSignResponse**](UploadSignResponse.md)


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

## signUploadsWithHttpInfo

> ApiResponse<UploadSignResponse> signUploadsWithHttpInfo(signUploadsRequest)

Signed upload URLs for up to 50 recordings

PUT each file to its &#x60;signedUrl&#x60;, then call confirmUploads with the returned paths. Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.UploadsApi;
import io.github.jagadeeshm007.latte.api.UploadsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        UploadsApi apiInstance = new UploadsApi(defaultClient);
        UploadSignRequest uploadSignRequest = new UploadSignRequest(); // UploadSignRequest | 
        try {
            APIsignUploadsRequest request = APIsignUploadsRequest.newBuilder()
                .uploadSignRequest(uploadSignRequest)
                .build();
            ApiResponse<UploadSignResponse> response = apiInstance.signUploadsWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling UploadsApi#signUploads");
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
| signUploadsRequest | [**APIsignUploadsRequest**](UploadsApi.md#APIsignUploadsRequest)|-|-|

### Return type

ApiResponse<[**UploadSignResponse**](UploadSignResponse.md)>


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


<a id="APIsignUploadsRequest"></a>
## APIsignUploadsRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **uploadSignRequest** | [**UploadSignRequest**](UploadSignRequest.md) |  | |



## uploadTranscripts

> UploadResult uploadTranscripts(uploadTranscriptsRequest)

Create calls from transcripts, with no audio, into a new or existing batch

Give times on every line or on none; without times, findings point to line numbers. Accepts an &#x60;Idempotency-Key&#x60; header. Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.UploadsApi;
import io.github.jagadeeshm007.latte.api.UploadsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        UploadsApi apiInstance = new UploadsApi(defaultClient);
        TranscriptUploadRequest transcriptUploadRequest = new TranscriptUploadRequest(); // TranscriptUploadRequest | 
        try {
            APIuploadTranscriptsRequest request = APIuploadTranscriptsRequest.newBuilder()
                .transcriptUploadRequest(transcriptUploadRequest)
                .build();
            UploadResult result = apiInstance.uploadTranscripts(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling UploadsApi#uploadTranscripts");
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
| uploadTranscriptsRequest | [**APIuploadTranscriptsRequest**](UploadsApi.md#APIuploadTranscriptsRequest)|-|-|

### Return type

[**UploadResult**](UploadResult.md)


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

## uploadTranscriptsWithHttpInfo

> ApiResponse<UploadResult> uploadTranscriptsWithHttpInfo(uploadTranscriptsRequest)

Create calls from transcripts, with no audio, into a new or existing batch

Give times on every line or on none; without times, findings point to line numbers. Accepts an &#x60;Idempotency-Key&#x60; header. Needs the &#x60;calls:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.UploadsApi;
import io.github.jagadeeshm007.latte.api.UploadsApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        UploadsApi apiInstance = new UploadsApi(defaultClient);
        TranscriptUploadRequest transcriptUploadRequest = new TranscriptUploadRequest(); // TranscriptUploadRequest | 
        try {
            APIuploadTranscriptsRequest request = APIuploadTranscriptsRequest.newBuilder()
                .transcriptUploadRequest(transcriptUploadRequest)
                .build();
            ApiResponse<UploadResult> response = apiInstance.uploadTranscriptsWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling UploadsApi#uploadTranscripts");
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
| uploadTranscriptsRequest | [**APIuploadTranscriptsRequest**](UploadsApi.md#APIuploadTranscriptsRequest)|-|-|

### Return type

ApiResponse<[**UploadResult**](UploadResult.md)>


### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | OK |  -  |
| **0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |


<a id="APIuploadTranscriptsRequest"></a>
## APIuploadTranscriptsRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **transcriptUploadRequest** | [**TranscriptUploadRequest**](TranscriptUploadRequest.md) |  | |



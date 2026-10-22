# WebhooksApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createWebhook**](WebhooksApi.md#createWebhook) | **POST** /api/webhooks | Register an https endpoint; the signing secret is returned once |
| [**createWebhookWithHttpInfo**](WebhooksApi.md#createWebhookWithHttpInfo) | **POST** /api/webhooks | Register an https endpoint; the signing secret is returned once |
| [**deleteWebhook**](WebhooksApi.md#deleteWebhook) | **DELETE** /api/webhooks/{id} | Delete an endpoint and its deliveries |
| [**deleteWebhookWithHttpInfo**](WebhooksApi.md#deleteWebhookWithHttpInfo) | **DELETE** /api/webhooks/{id} | Delete an endpoint and its deliveries |
| [**getWebhook**](WebhooksApi.md#getWebhook) | **GET** /api/webhooks/{id} | One webhook endpoint |
| [**getWebhookWithHttpInfo**](WebhooksApi.md#getWebhookWithHttpInfo) | **GET** /api/webhooks/{id} | One webhook endpoint |
| [**listWebhookDeliveries**](WebhooksApi.md#listWebhookDeliveries) | **GET** /api/webhooks/{id}/deliveries | Deliveries to this endpoint, newest first |
| [**listWebhookDeliveriesWithHttpInfo**](WebhooksApi.md#listWebhookDeliveriesWithHttpInfo) | **GET** /api/webhooks/{id}/deliveries | Deliveries to this endpoint, newest first |
| [**listWebhooks**](WebhooksApi.md#listWebhooks) | **GET** /api/webhooks | List webhook endpoints |
| [**listWebhooksWithHttpInfo**](WebhooksApi.md#listWebhooksWithHttpInfo) | **GET** /api/webhooks | List webhook endpoints |
| [**redeliverWebhookDelivery**](WebhooksApi.md#redeliverWebhookDelivery) | **POST** /api/webhooks/{id}/deliveries/{deliveryId}/redeliver | Send a delivery again now |
| [**redeliverWebhookDeliveryWithHttpInfo**](WebhooksApi.md#redeliverWebhookDeliveryWithHttpInfo) | **POST** /api/webhooks/{id}/deliveries/{deliveryId}/redeliver | Send a delivery again now |
| [**testWebhook**](WebhooksApi.md#testWebhook) | **POST** /api/webhooks/{id}/test | Send a ping event to this endpoint |
| [**testWebhookWithHttpInfo**](WebhooksApi.md#testWebhookWithHttpInfo) | **POST** /api/webhooks/{id}/test | Send a ping event to this endpoint |
| [**updateWebhook**](WebhooksApi.md#updateWebhook) | **PATCH** /api/webhooks/{id} | Change the URL, events or description, or turn it off and on |
| [**updateWebhookWithHttpInfo**](WebhooksApi.md#updateWebhookWithHttpInfo) | **PATCH** /api/webhooks/{id} | Change the URL, events or description, or turn it off and on |



## createWebhook

> CreatedWebhook createWebhook(createWebhookRequest)

Register an https endpoint; the signing secret is returned once

Accepts an &#x60;Idempotency-Key&#x60; header. Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        CreateWebhookRequest createWebhookRequest = new CreateWebhookRequest(); // CreateWebhookRequest | 
        try {
            APIcreateWebhookRequest request = APIcreateWebhookRequest.newBuilder()
                .createWebhookRequest(createWebhookRequest)
                .build();
            CreatedWebhook result = apiInstance.createWebhook(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#createWebhook");
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
| createWebhookRequest | [**APIcreateWebhookRequest**](WebhooksApi.md#APIcreateWebhookRequest)|-|-|

### Return type

[**CreatedWebhook**](CreatedWebhook.md)


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

## createWebhookWithHttpInfo

> ApiResponse<CreatedWebhook> createWebhookWithHttpInfo(createWebhookRequest)

Register an https endpoint; the signing secret is returned once

Accepts an &#x60;Idempotency-Key&#x60; header. Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        CreateWebhookRequest createWebhookRequest = new CreateWebhookRequest(); // CreateWebhookRequest | 
        try {
            APIcreateWebhookRequest request = APIcreateWebhookRequest.newBuilder()
                .createWebhookRequest(createWebhookRequest)
                .build();
            ApiResponse<CreatedWebhook> response = apiInstance.createWebhookWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#createWebhook");
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
| createWebhookRequest | [**APIcreateWebhookRequest**](WebhooksApi.md#APIcreateWebhookRequest)|-|-|

### Return type

ApiResponse<[**CreatedWebhook**](CreatedWebhook.md)>


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


<a id="APIcreateWebhookRequest"></a>
## APIcreateWebhookRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **createWebhookRequest** | [**CreateWebhookRequest**](CreateWebhookRequest.md) |  | |



## deleteWebhook

> void deleteWebhook(deleteWebhookRequest)

Delete an endpoint and its deliveries

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIdeleteWebhookRequest request = APIdeleteWebhookRequest.newBuilder()
                .id(id)
                .build();
            apiInstance.deleteWebhook(request);
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#deleteWebhook");
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
| deleteWebhookRequest | [**APIdeleteWebhookRequest**](WebhooksApi.md#APIdeleteWebhookRequest)|-|-|

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

## deleteWebhookWithHttpInfo

> ApiResponse<Void> deleteWebhookWithHttpInfo(deleteWebhookRequest)

Delete an endpoint and its deliveries

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIdeleteWebhookRequest request = APIdeleteWebhookRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<Void> response = apiInstance.deleteWebhookWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#deleteWebhook");
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
| deleteWebhookRequest | [**APIdeleteWebhookRequest**](WebhooksApi.md#APIdeleteWebhookRequest)|-|-|

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


<a id="APIdeleteWebhookRequest"></a>
## APIdeleteWebhookRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



## getWebhook

> WebhookEndpoint getWebhook(getWebhookRequest)

One webhook endpoint

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIgetWebhookRequest request = APIgetWebhookRequest.newBuilder()
                .id(id)
                .build();
            WebhookEndpoint result = apiInstance.getWebhook(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#getWebhook");
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
| getWebhookRequest | [**APIgetWebhookRequest**](WebhooksApi.md#APIgetWebhookRequest)|-|-|

### Return type

[**WebhookEndpoint**](WebhookEndpoint.md)


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

## getWebhookWithHttpInfo

> ApiResponse<WebhookEndpoint> getWebhookWithHttpInfo(getWebhookRequest)

One webhook endpoint

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APIgetWebhookRequest request = APIgetWebhookRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<WebhookEndpoint> response = apiInstance.getWebhookWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#getWebhook");
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
| getWebhookRequest | [**APIgetWebhookRequest**](WebhooksApi.md#APIgetWebhookRequest)|-|-|

### Return type

ApiResponse<[**WebhookEndpoint**](WebhookEndpoint.md)>


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


<a id="APIgetWebhookRequest"></a>
## APIgetWebhookRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



## listWebhookDeliveries

> WebhookDeliveryList listWebhookDeliveries(listWebhookDeliveriesRequest)

Deliveries to this endpoint, newest first

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        String status = "pending"; // String | 
        Integer page = 1; // Integer | 
        Integer limit = 25; // Integer | 
        try {
            APIlistWebhookDeliveriesRequest request = APIlistWebhookDeliveriesRequest.newBuilder()
                .id(id)
                .status(status)
                .page(page)
                .limit(limit)
                .build();
            WebhookDeliveryList result = apiInstance.listWebhookDeliveries(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#listWebhookDeliveries");
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
| listWebhookDeliveriesRequest | [**APIlistWebhookDeliveriesRequest**](WebhooksApi.md#APIlistWebhookDeliveriesRequest)|-|-|

### Return type

[**WebhookDeliveryList**](WebhookDeliveryList.md)


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

## listWebhookDeliveriesWithHttpInfo

> ApiResponse<WebhookDeliveryList> listWebhookDeliveriesWithHttpInfo(listWebhookDeliveriesRequest)

Deliveries to this endpoint, newest first

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        String status = "pending"; // String | 
        Integer page = 1; // Integer | 
        Integer limit = 25; // Integer | 
        try {
            APIlistWebhookDeliveriesRequest request = APIlistWebhookDeliveriesRequest.newBuilder()
                .id(id)
                .status(status)
                .page(page)
                .limit(limit)
                .build();
            ApiResponse<WebhookDeliveryList> response = apiInstance.listWebhookDeliveriesWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#listWebhookDeliveries");
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
| listWebhookDeliveriesRequest | [**APIlistWebhookDeliveriesRequest**](WebhooksApi.md#APIlistWebhookDeliveriesRequest)|-|-|

### Return type

ApiResponse<[**WebhookDeliveryList**](WebhookDeliveryList.md)>


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


<a id="APIlistWebhookDeliveriesRequest"></a>
## APIlistWebhookDeliveriesRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |
| **status** | **String** |  | [optional] [enum: pending, succeeded, failed] |
| **page** | **Integer** |  | [optional] [default to 1] |
| **limit** | **Integer** |  | [optional] [default to 25] |



## listWebhooks

> WebhookEndpointList listWebhooks()

List webhook endpoints

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        try {
            WebhookEndpointList result = apiInstance.listWebhooks();
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#listWebhooks");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Reason: " + e.getResponseBody());
            System.err.println("Response headers: " + e.getResponseHeaders());
            e.printStackTrace();
        }
    }
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**WebhookEndpointList**](WebhookEndpointList.md)


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

## listWebhooksWithHttpInfo

> ApiResponse<WebhookEndpointList> listWebhooksWithHttpInfo()

List webhook endpoints

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        try {
            ApiResponse<WebhookEndpointList> response = apiInstance.listWebhooksWithHttpInfo();
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#listWebhooks");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

ApiResponse<[**WebhookEndpointList**](WebhookEndpointList.md)>


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


## redeliverWebhookDelivery

> Queued redeliverWebhookDelivery(redeliverWebhookDeliveryRequest)

Send a delivery again now

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        UUID deliveryId = UUID.randomUUID(); // UUID | 
        try {
            APIredeliverWebhookDeliveryRequest request = APIredeliverWebhookDeliveryRequest.newBuilder()
                .id(id)
                .deliveryId(deliveryId)
                .build();
            Queued result = apiInstance.redeliverWebhookDelivery(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#redeliverWebhookDelivery");
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
| redeliverWebhookDeliveryRequest | [**APIredeliverWebhookDeliveryRequest**](WebhooksApi.md#APIredeliverWebhookDeliveryRequest)|-|-|

### Return type

[**Queued**](Queued.md)


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

## redeliverWebhookDeliveryWithHttpInfo

> ApiResponse<Queued> redeliverWebhookDeliveryWithHttpInfo(redeliverWebhookDeliveryRequest)

Send a delivery again now

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        UUID deliveryId = UUID.randomUUID(); // UUID | 
        try {
            APIredeliverWebhookDeliveryRequest request = APIredeliverWebhookDeliveryRequest.newBuilder()
                .id(id)
                .deliveryId(deliveryId)
                .build();
            ApiResponse<Queued> response = apiInstance.redeliverWebhookDeliveryWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#redeliverWebhookDelivery");
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
| redeliverWebhookDeliveryRequest | [**APIredeliverWebhookDeliveryRequest**](WebhooksApi.md#APIredeliverWebhookDeliveryRequest)|-|-|

### Return type

ApiResponse<[**Queued**](Queued.md)>


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


<a id="APIredeliverWebhookDeliveryRequest"></a>
## APIredeliverWebhookDeliveryRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |
| **deliveryId** | **UUID** |  | |



## testWebhook

> Queued testWebhook(testWebhookRequest)

Send a ping event to this endpoint

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APItestWebhookRequest request = APItestWebhookRequest.newBuilder()
                .id(id)
                .build();
            Queued result = apiInstance.testWebhook(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#testWebhook");
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
| testWebhookRequest | [**APItestWebhookRequest**](WebhooksApi.md#APItestWebhookRequest)|-|-|

### Return type

[**Queued**](Queued.md)


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

## testWebhookWithHttpInfo

> ApiResponse<Queued> testWebhookWithHttpInfo(testWebhookRequest)

Send a ping event to this endpoint

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        try {
            APItestWebhookRequest request = APItestWebhookRequest.newBuilder()
                .id(id)
                .build();
            ApiResponse<Queued> response = apiInstance.testWebhookWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#testWebhook");
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
| testWebhookRequest | [**APItestWebhookRequest**](WebhooksApi.md#APItestWebhookRequest)|-|-|

### Return type

ApiResponse<[**Queued**](Queued.md)>


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


<a id="APItestWebhookRequest"></a>
## APItestWebhookRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |



## updateWebhook

> WebhookEndpoint updateWebhook(updateWebhookRequest)

Change the URL, events or description, or turn it off and on

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        UpdateWebhookRequest updateWebhookRequest = new UpdateWebhookRequest(); // UpdateWebhookRequest | 
        try {
            APIupdateWebhookRequest request = APIupdateWebhookRequest.newBuilder()
                .id(id)
                .updateWebhookRequest(updateWebhookRequest)
                .build();
            WebhookEndpoint result = apiInstance.updateWebhook(request);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#updateWebhook");
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
| updateWebhookRequest | [**APIupdateWebhookRequest**](WebhooksApi.md#APIupdateWebhookRequest)|-|-|

### Return type

[**WebhookEndpoint**](WebhookEndpoint.md)


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

## updateWebhookWithHttpInfo

> ApiResponse<WebhookEndpoint> updateWebhookWithHttpInfo(updateWebhookRequest)

Change the URL, events or description, or turn it off and on

Needs the &#x60;webhooks:write&#x60; scope.

### Example

```java
// Import classes:
import io.github.jagadeeshm007.latte.ApiClient;
import io.github.jagadeeshm007.latte.ApiException;
import io.github.jagadeeshm007.latte.ApiResponse;
import io.github.jagadeeshm007.latte.Configuration;
import io.github.jagadeeshm007.latte.auth.*;
import io.github.jagadeeshm007.latte.models.*;
import io.github.jagadeeshm007.latte.api.WebhooksApi;
import io.github.jagadeeshm007.latte.api.WebhooksApi.*;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("http://localhost");
        
        // Configure HTTP bearer authorization: apiKey
        HttpBearerAuth apiKey = (HttpBearerAuth) defaultClient.getAuthentication("apiKey");
        apiKey.setBearerToken("BEARER TOKEN");

        WebhooksApi apiInstance = new WebhooksApi(defaultClient);
        UUID id = UUID.randomUUID(); // UUID | 
        UpdateWebhookRequest updateWebhookRequest = new UpdateWebhookRequest(); // UpdateWebhookRequest | 
        try {
            APIupdateWebhookRequest request = APIupdateWebhookRequest.newBuilder()
                .id(id)
                .updateWebhookRequest(updateWebhookRequest)
                .build();
            ApiResponse<WebhookEndpoint> response = apiInstance.updateWebhookWithHttpInfo(request);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling WebhooksApi#updateWebhook");
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
| updateWebhookRequest | [**APIupdateWebhookRequest**](WebhooksApi.md#APIupdateWebhookRequest)|-|-|

### Return type

ApiResponse<[**WebhookEndpoint**](WebhookEndpoint.md)>


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


<a id="APIupdateWebhookRequest"></a>
## APIupdateWebhookRequest
### Properties

|     Name      |    Type       | Description   |     Notes    |
| ------------- | ------------- | ------------- | -------------|
| **id** | **UUID** |  | |
| **updateWebhookRequest** | [**UpdateWebhookRequest**](UpdateWebhookRequest.md) |  | |



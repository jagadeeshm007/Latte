# latte_sdk.BatchesApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_batch**](BatchesApi.md#get_batch) | **GET** /api/batches/{id} | One batch with its progress and results
[**list_batches**](BatchesApi.md#list_batches) | **GET** /api/batches | List batches
[**retry_failed_calls**](BatchesApi.md#retry_failed_calls) | **POST** /api/batches/{id}/retry-failed | Queue every failed call in the batch again
[**update_batch**](BatchesApi.md#update_batch) | **PATCH** /api/batches/{id} | Rename or archive a batch


# **get_batch**
> BatchDetail get_batch(id)

One batch with its progress and results

Needs the `batches:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.batch_detail import BatchDetail
from latte_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = latte_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (latte_<prefix>_<secret>): apiKey
configuration = latte_sdk.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with latte_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = latte_sdk.BatchesApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # One batch with its progress and results
        api_response = api_instance.get_batch(id)
        print("The response of BatchesApi->get_batch:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling BatchesApi->get_batch: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_batches**
> BatchList list_batches(q=q, state=state, archived=archived, page=page, limit=limit)

List batches

Needs the `batches:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.batch_list import BatchList
from latte_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = latte_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (latte_<prefix>_<secret>): apiKey
configuration = latte_sdk.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with latte_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = latte_sdk.BatchesApi(api_client)
    q = 'q_example' # str |  (optional)
    state = 'state_example' # str |  (optional)
    archived = 'archived_example' # str |  (optional)
    page = 1 # int |  (optional) (default to 1)
    limit = 20 # int |  (optional) (default to 20)

    try:
        # List batches
        api_response = api_instance.list_batches(q=q, state=state, archived=archived, page=page, limit=limit)
        print("The response of BatchesApi->list_batches:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling BatchesApi->list_batches: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **q** | **str**|  | [optional] 
 **state** | **str**|  | [optional] 
 **archived** | **str**|  | [optional] 
 **page** | **int**|  | [optional] [default to 1]
 **limit** | **int**|  | [optional] [default to 20]

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **retry_failed_calls**
> BatchRetryResponse retry_failed_calls(id)

Queue every failed call in the batch again

Accepts an `Idempotency-Key` header. Needs the `batches:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.batch_retry_response import BatchRetryResponse
from latte_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = latte_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (latte_<prefix>_<secret>): apiKey
configuration = latte_sdk.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with latte_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = latte_sdk.BatchesApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # Queue every failed call in the batch again
        api_response = api_instance.retry_failed_calls(id)
        print("The response of BatchesApi->retry_failed_calls:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling BatchesApi->retry_failed_calls: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

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
**202** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_batch**
> BatchDetail update_batch(id, batch_update_request)

Rename or archive a batch

Needs the `batches:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.batch_detail import BatchDetail
from latte_sdk.models.batch_update_request import BatchUpdateRequest
from latte_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = latte_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (latte_<prefix>_<secret>): apiKey
configuration = latte_sdk.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with latte_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = latte_sdk.BatchesApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 
    batch_update_request = latte_sdk.BatchUpdateRequest() # BatchUpdateRequest | 

    try:
        # Rename or archive a batch
        api_response = api_instance.update_batch(id, batch_update_request)
        print("The response of BatchesApi->update_batch:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling BatchesApi->update_batch: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 
 **batch_update_request** | [**BatchUpdateRequest**](BatchUpdateRequest.md)|  | 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


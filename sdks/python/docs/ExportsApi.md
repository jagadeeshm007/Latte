# latte_sdk.ExportsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**export_batch_zip**](ExportsApi.md#export_batch_zip) | **GET** /api/batches/{id}/export.zip | Results, transcripts and recordings as a ZIP (up to 200 calls)
[**get_batch_results_csv**](ExportsApi.md#get_batch_results_csv) | **GET** /api/batches/{id}/results.csv | Results, one row per call and one column per rubric item


# **export_batch_zip**
> bytes export_batch_zip(id, include=include)

Results, transcripts and recordings as a ZIP (up to 200 calls)

Needs the `exports:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
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
    api_instance = latte_sdk.ExportsApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 
    include = 'include_example' # str |  (optional)

    try:
        # Results, transcripts and recordings as a ZIP (up to 200 calls)
        api_response = api_instance.export_batch_zip(id, include=include)
        print("The response of ExportsApi->export_batch_zip:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ExportsApi->export_batch_zip: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 
 **include** | **str**|  | [optional] 

### Return type

**bytes**

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/zip, application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | The file |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_batch_results_csv**
> bytes get_batch_results_csv(id)

Results, one row per call and one column per rubric item

Needs the `exports:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
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
    api_instance = latte_sdk.ExportsApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # Results, one row per call and one column per rubric item
        api_response = api_instance.get_batch_results_csv(id)
        print("The response of ExportsApi->get_batch_results_csv:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ExportsApi->get_batch_results_csv: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

### Return type

**bytes**

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/csv, application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | The file |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


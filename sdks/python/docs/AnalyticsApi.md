# latte_sdk.AnalyticsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_dashboard**](AnalyticsApi.md#get_dashboard) | **GET** /api/dashboard | Results grouped by team, product, agent or language
[**get_highlights**](AnalyticsApi.md#get_highlights) | **GET** /api/dashboard/highlights | The period&#39;s headline numbers and highlights
[**get_leaderboard**](AnalyticsApi.md#get_leaderboard) | **GET** /api/dashboard/leaderboard | A sorted, paged ranking of any grouping


# **get_dashboard**
> Dashboard get_dashboard(group_by=group_by, var_from=var_from, to=to)

Results grouped by team, product, agent or language

Needs the `analytics:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.dashboard import Dashboard
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
    api_instance = latte_sdk.AnalyticsApi(api_client)
    group_by = 'team' # str |  (optional) (default to 'team')
    var_from = 'var_from_example' # str |  (optional)
    to = 'to_example' # str |  (optional)

    try:
        # Results grouped by team, product, agent or language
        api_response = api_instance.get_dashboard(group_by=group_by, var_from=var_from, to=to)
        print("The response of AnalyticsApi->get_dashboard:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AnalyticsApi->get_dashboard: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **group_by** | **str**|  | [optional] [default to &#39;team&#39;]
 **var_from** | **str**|  | [optional] 
 **to** | **str**|  | [optional] 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_highlights**
> Highlights get_highlights(var_from=var_from, to=to)

The period's headline numbers and highlights

Needs the `analytics:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.highlights import Highlights
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
    api_instance = latte_sdk.AnalyticsApi(api_client)
    var_from = 'var_from_example' # str |  (optional)
    to = 'to_example' # str |  (optional)

    try:
        # The period's headline numbers and highlights
        api_response = api_instance.get_highlights(var_from=var_from, to=to)
        print("The response of AnalyticsApi->get_highlights:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AnalyticsApi->get_highlights: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **var_from** | **str**|  | [optional] 
 **to** | **str**|  | [optional] 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_leaderboard**
> Leaderboard get_leaderboard(group_by=group_by, q=q, sort=sort, dir=dir, page=page, limit=limit, min_calls=min_calls, var_from=var_from, to=to)

A sorted, paged ranking of any grouping

Needs the `analytics:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.leaderboard import Leaderboard
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
    api_instance = latte_sdk.AnalyticsApi(api_client)
    group_by = 'agent' # str |  (optional) (default to 'agent')
    q = 'q_example' # str |  (optional)
    sort = 'avgScore' # str |  (optional) (default to 'avgScore')
    dir = 'desc' # str |  (optional) (default to 'desc')
    page = 1 # int |  (optional) (default to 1)
    limit = 25 # int |  (optional) (default to 25)
    min_calls = 1 # int |  (optional) (default to 1)
    var_from = 'var_from_example' # str |  (optional)
    to = 'to_example' # str |  (optional)

    try:
        # A sorted, paged ranking of any grouping
        api_response = api_instance.get_leaderboard(group_by=group_by, q=q, sort=sort, dir=dir, page=page, limit=limit, min_calls=min_calls, var_from=var_from, to=to)
        print("The response of AnalyticsApi->get_leaderboard:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AnalyticsApi->get_leaderboard: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **group_by** | **str**|  | [optional] [default to &#39;agent&#39;]
 **q** | **str**|  | [optional] 
 **sort** | **str**|  | [optional] [default to &#39;avgScore&#39;]
 **dir** | **str**|  | [optional] [default to &#39;desc&#39;]
 **page** | **int**|  | [optional] [default to 1]
 **limit** | **int**|  | [optional] [default to 25]
 **min_calls** | **int**|  | [optional] [default to 1]
 **var_from** | **str**|  | [optional] 
 **to** | **str**|  | [optional] 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


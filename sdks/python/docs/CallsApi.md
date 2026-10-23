# latte_sdk.CallsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**archive_call**](CallsApi.md#archive_call) | **POST** /api/calls/{id}/archive | Hide a call from lists
[**get_audio_url**](CallsApi.md#get_audio_url) | **POST** /api/calls/{id}/audio-url | A short-lived link to the recording
[**get_call**](CallsApi.md#get_call) | **GET** /api/calls/{id} | One call with its transcript and findings
[**list_calls**](CallsApi.md#list_calls) | **GET** /api/calls | List calls
[**retry_call**](CallsApi.md#retry_call) | **POST** /api/calls/{id}/retry | Queue a failed or stuck call again
[**unarchive_call**](CallsApi.md#unarchive_call) | **POST** /api/calls/{id}/unarchive | Bring an archived call back


# **archive_call**
> archive_call(id)

Hide a call from lists

Needs the `calls:write` scope.

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
    api_instance = latte_sdk.CallsApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # Hide a call from lists
        api_instance.archive_call(id)
    except Exception as e:
        print("Exception when calling CallsApi->archive_call: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

### Return type

void (empty response body)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | Done; no body |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_audio_url**
> AudioUrl get_audio_url(id, audio_url_request)

A short-lived link to the recording

Needs the `calls:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.audio_url import AudioUrl
from latte_sdk.models.audio_url_request import AudioUrlRequest
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
    api_instance = latte_sdk.CallsApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 
    audio_url_request = latte_sdk.AudioUrlRequest() # AudioUrlRequest | 

    try:
        # A short-lived link to the recording
        api_response = api_instance.get_audio_url(id, audio_url_request)
        print("The response of CallsApi->get_audio_url:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CallsApi->get_audio_url: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 
 **audio_url_request** | [**AudioUrlRequest**](AudioUrlRequest.md)|  | 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_call**
> CallDetail get_call(id)

One call with its transcript and findings

Personal data in the transcript and quotes is masked for API keys. Needs the `calls:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.call_detail import CallDetail
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
    api_instance = latte_sdk.CallsApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # One call with its transcript and findings
        api_response = api_instance.get_call(id)
        print("The response of CallsApi->get_call:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CallsApi->get_call: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_calls**
> CallList list_calls(status=status, needs_review=needs_review, agent_id=agent_id, team_id=team_id, product_id=product_id, language=language, flag=flag, q=q, batch_id=batch_id, archived=archived, group_by=group_by, limit=limit, page=page, cursor=cursor)

List calls

Filter by status, flag, agent, team, product, language, batch or text. Paged with `limit` and `page`, or `cursor`. Needs the `calls:read` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.call_list import CallList
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
    api_instance = latte_sdk.CallsApi(api_client)
    status = 'status_example' # str |  (optional)
    needs_review = 'needs_review_example' # str |  (optional)
    agent_id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID |  (optional)
    team_id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID |  (optional)
    product_id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID |  (optional)
    language = 'language_example' # str |  (optional)
    flag = 'flag_example' # str |  (optional)
    q = 'q_example' # str |  (optional)
    batch_id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID |  (optional)
    archived = 'archived_example' # str |  (optional)
    group_by = 'group_by_example' # str |  (optional)
    limit = 50 # int |  (optional) (default to 50)
    page = 56 # int |  (optional)
    cursor = 'cursor_example' # str |  (optional)

    try:
        # List calls
        api_response = api_instance.list_calls(status=status, needs_review=needs_review, agent_id=agent_id, team_id=team_id, product_id=product_id, language=language, flag=flag, q=q, batch_id=batch_id, archived=archived, group_by=group_by, limit=limit, page=page, cursor=cursor)
        print("The response of CallsApi->list_calls:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CallsApi->list_calls: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **status** | **str**|  | [optional] 
 **needs_review** | **str**|  | [optional] 
 **agent_id** | **UUID**|  | [optional] 
 **team_id** | **UUID**|  | [optional] 
 **product_id** | **UUID**|  | [optional] 
 **language** | **str**|  | [optional] 
 **flag** | **str**|  | [optional] 
 **q** | **str**|  | [optional] 
 **batch_id** | **UUID**|  | [optional] 
 **archived** | **str**|  | [optional] 
 **group_by** | **str**|  | [optional] 
 **limit** | **int**|  | [optional] [default to 50]
 **page** | **int**|  | [optional] 
 **cursor** | **str**|  | [optional] 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **retry_call**
> CallRetryResponse retry_call(id)

Queue a failed or stuck call again

Needs the `calls:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.call_retry_response import CallRetryResponse
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
    api_instance = latte_sdk.CallsApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # Queue a failed or stuck call again
        api_response = api_instance.retry_call(id)
        print("The response of CallsApi->retry_call:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CallsApi->retry_call: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

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
**202** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **unarchive_call**
> unarchive_call(id)

Bring an archived call back

Needs the `calls:write` scope.

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
    api_instance = latte_sdk.CallsApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # Bring an archived call back
        api_instance.unarchive_call(id)
    except Exception as e:
        print("Exception when calling CallsApi->unarchive_call: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

### Return type

void (empty response body)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | Done; no body |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


# latte_sdk.WebhooksApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_webhook**](WebhooksApi.md#create_webhook) | **POST** /api/webhooks | Register an https endpoint; the signing secret is returned once
[**delete_webhook**](WebhooksApi.md#delete_webhook) | **DELETE** /api/webhooks/{id} | Delete an endpoint and its deliveries
[**get_webhook**](WebhooksApi.md#get_webhook) | **GET** /api/webhooks/{id} | One webhook endpoint
[**list_webhook_deliveries**](WebhooksApi.md#list_webhook_deliveries) | **GET** /api/webhooks/{id}/deliveries | Deliveries to this endpoint, newest first
[**list_webhooks**](WebhooksApi.md#list_webhooks) | **GET** /api/webhooks | List webhook endpoints
[**redeliver_webhook_delivery**](WebhooksApi.md#redeliver_webhook_delivery) | **POST** /api/webhooks/{id}/deliveries/{deliveryId}/redeliver | Send a delivery again now
[**test_webhook**](WebhooksApi.md#test_webhook) | **POST** /api/webhooks/{id}/test | Send a ping event to this endpoint
[**update_webhook**](WebhooksApi.md#update_webhook) | **PATCH** /api/webhooks/{id} | Change the URL, events or description, or turn it off and on


# **create_webhook**
> CreatedWebhook create_webhook(create_webhook_request)

Register an https endpoint; the signing secret is returned once

Accepts an `Idempotency-Key` header. Needs the `webhooks:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.create_webhook_request import CreateWebhookRequest
from latte_sdk.models.created_webhook import CreatedWebhook
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
    api_instance = latte_sdk.WebhooksApi(api_client)
    create_webhook_request = latte_sdk.CreateWebhookRequest() # CreateWebhookRequest | 

    try:
        # Register an https endpoint; the signing secret is returned once
        api_response = api_instance.create_webhook(create_webhook_request)
        print("The response of WebhooksApi->create_webhook:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksApi->create_webhook: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **create_webhook_request** | [**CreateWebhookRequest**](CreateWebhookRequest.md)|  | 

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
**201** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **delete_webhook**
> delete_webhook(id)

Delete an endpoint and its deliveries

Needs the `webhooks:write` scope.

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
    api_instance = latte_sdk.WebhooksApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # Delete an endpoint and its deliveries
        api_instance.delete_webhook(id)
    except Exception as e:
        print("Exception when calling WebhooksApi->delete_webhook: %s\n" % e)
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

# **get_webhook**
> WebhookEndpoint get_webhook(id)

One webhook endpoint

Needs the `webhooks:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.webhook_endpoint import WebhookEndpoint
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
    api_instance = latte_sdk.WebhooksApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # One webhook endpoint
        api_response = api_instance.get_webhook(id)
        print("The response of WebhooksApi->get_webhook:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksApi->get_webhook: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_webhook_deliveries**
> WebhookDeliveryList list_webhook_deliveries(id, status=status, page=page, limit=limit)

Deliveries to this endpoint, newest first

Needs the `webhooks:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.webhook_delivery_list import WebhookDeliveryList
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
    api_instance = latte_sdk.WebhooksApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 
    status = 'status_example' # str |  (optional)
    page = 1 # int |  (optional) (default to 1)
    limit = 25 # int |  (optional) (default to 25)

    try:
        # Deliveries to this endpoint, newest first
        api_response = api_instance.list_webhook_deliveries(id, status=status, page=page, limit=limit)
        print("The response of WebhooksApi->list_webhook_deliveries:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksApi->list_webhook_deliveries: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 
 **status** | **str**|  | [optional] 
 **page** | **int**|  | [optional] [default to 1]
 **limit** | **int**|  | [optional] [default to 25]

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_webhooks**
> WebhookEndpointList list_webhooks()

List webhook endpoints

Needs the `webhooks:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.webhook_endpoint_list import WebhookEndpointList
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
    api_instance = latte_sdk.WebhooksApi(api_client)

    try:
        # List webhook endpoints
        api_response = api_instance.list_webhooks()
        print("The response of WebhooksApi->list_webhooks:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksApi->list_webhooks: %s\n" % e)
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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **redeliver_webhook_delivery**
> Queued redeliver_webhook_delivery(id, delivery_id)

Send a delivery again now

Needs the `webhooks:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.queued import Queued
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
    api_instance = latte_sdk.WebhooksApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 
    delivery_id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # Send a delivery again now
        api_response = api_instance.redeliver_webhook_delivery(id, delivery_id)
        print("The response of WebhooksApi->redeliver_webhook_delivery:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksApi->redeliver_webhook_delivery: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 
 **delivery_id** | **UUID**|  | 

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
**202** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **test_webhook**
> Queued test_webhook(id)

Send a ping event to this endpoint

Needs the `webhooks:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.queued import Queued
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
    api_instance = latte_sdk.WebhooksApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 

    try:
        # Send a ping event to this endpoint
        api_response = api_instance.test_webhook(id)
        print("The response of WebhooksApi->test_webhook:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksApi->test_webhook: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 

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
**202** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_webhook**
> WebhookEndpoint update_webhook(id, update_webhook_request)

Change the URL, events or description, or turn it off and on

Needs the `webhooks:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.update_webhook_request import UpdateWebhookRequest
from latte_sdk.models.webhook_endpoint import WebhookEndpoint
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
    api_instance = latte_sdk.WebhooksApi(api_client)
    id = UUID('38400000-8cf0-11bd-b23e-10b96e4ef00d') # UUID | 
    update_webhook_request = latte_sdk.UpdateWebhookRequest() # UpdateWebhookRequest | 

    try:
        # Change the URL, events or description, or turn it off and on
        api_response = api_instance.update_webhook(id, update_webhook_request)
        print("The response of WebhooksApi->update_webhook:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksApi->update_webhook: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **UUID**|  | 
 **update_webhook_request** | [**UpdateWebhookRequest**](UpdateWebhookRequest.md)|  | 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


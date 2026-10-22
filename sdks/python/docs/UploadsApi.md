# latte_sdk.UploadsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**confirm_uploads**](UploadsApi.md#confirm_uploads) | **POST** /api/uploads/confirm | Create calls from uploaded recordings, into a new or existing batch
[**sign_uploads**](UploadsApi.md#sign_uploads) | **POST** /api/uploads/sign | Signed upload URLs for up to 50 recordings
[**upload_transcripts**](UploadsApi.md#upload_transcripts) | **POST** /api/uploads/transcripts | Create calls from transcripts, with no audio, into a new or existing batch


# **confirm_uploads**
> UploadResult confirm_uploads(upload_confirm_request)

Create calls from uploaded recordings, into a new or existing batch

Accepts an `Idempotency-Key` header. Needs the `calls:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.upload_confirm_request import UploadConfirmRequest
from latte_sdk.models.upload_result import UploadResult
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
    api_instance = latte_sdk.UploadsApi(api_client)
    upload_confirm_request = latte_sdk.UploadConfirmRequest() # UploadConfirmRequest | 

    try:
        # Create calls from uploaded recordings, into a new or existing batch
        api_response = api_instance.confirm_uploads(upload_confirm_request)
        print("The response of UploadsApi->confirm_uploads:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UploadsApi->confirm_uploads: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **upload_confirm_request** | [**UploadConfirmRequest**](UploadConfirmRequest.md)|  | 

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
**201** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sign_uploads**
> UploadSignResponse sign_uploads(upload_sign_request)

Signed upload URLs for up to 50 recordings

PUT each file to its `signedUrl`, then call confirmUploads with the returned paths. Needs the `calls:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.upload_sign_request import UploadSignRequest
from latte_sdk.models.upload_sign_response import UploadSignResponse
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
    api_instance = latte_sdk.UploadsApi(api_client)
    upload_sign_request = latte_sdk.UploadSignRequest() # UploadSignRequest | 

    try:
        # Signed upload URLs for up to 50 recordings
        api_response = api_instance.sign_uploads(upload_sign_request)
        print("The response of UploadsApi->sign_uploads:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UploadsApi->sign_uploads: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **upload_sign_request** | [**UploadSignRequest**](UploadSignRequest.md)|  | 

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
**200** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **upload_transcripts**
> UploadResult upload_transcripts(transcript_upload_request)

Create calls from transcripts, with no audio, into a new or existing batch

Give times on every line or on none; without times, findings point to line numbers. Accepts an `Idempotency-Key` header. Needs the `calls:write` scope.

### Example

* Bearer (latte_<prefix>_<secret>) Authentication (apiKey):

```python
import latte_sdk
from latte_sdk.models.transcript_upload_request import TranscriptUploadRequest
from latte_sdk.models.upload_result import UploadResult
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
    api_instance = latte_sdk.UploadsApi(api_client)
    transcript_upload_request = latte_sdk.TranscriptUploadRequest() # TranscriptUploadRequest | 

    try:
        # Create calls from transcripts, with no audio, into a new or existing batch
        api_response = api_instance.upload_transcripts(transcript_upload_request)
        print("The response of UploadsApi->upload_transcripts:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UploadsApi->upload_transcripts: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **transcript_upload_request** | [**TranscriptUploadRequest**](TranscriptUploadRequest.md)|  | 

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
**201** | OK |  -  |
**0** | Error: 400, 401, 403, 404, 409, 413, 422 or 429 (with Retry-After) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


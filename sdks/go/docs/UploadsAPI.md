# \UploadsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**ConfirmUploads**](UploadsAPI.md#ConfirmUploads) | **Post** /api/uploads/confirm | Create calls from uploaded recordings, into a new or existing batch
[**SignUploads**](UploadsAPI.md#SignUploads) | **Post** /api/uploads/sign | Signed upload URLs for up to 50 recordings
[**UploadTranscripts**](UploadsAPI.md#UploadTranscripts) | **Post** /api/uploads/transcripts | Create calls from transcripts, with no audio, into a new or existing batch



## ConfirmUploads

> UploadResult ConfirmUploads(ctx).UploadConfirmRequest(uploadConfirmRequest).Execute()

Create calls from uploaded recordings, into a new or existing batch



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	uploadConfirmRequest := *openapiclient.NewUploadConfirmRequest([]openapiclient.UploadConfirmRequestFilesInner{*openapiclient.NewUploadConfirmRequestFilesInner("Path_example", "OriginalFilename_example", "MimeType_example", int32(123), "AgentId_example", "TeamId_example", "ProductId_example", "CallDate_example")}) // UploadConfirmRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.UploadsAPI.ConfirmUploads(context.Background()).UploadConfirmRequest(uploadConfirmRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UploadsAPI.ConfirmUploads``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConfirmUploads`: UploadResult
	fmt.Fprintf(os.Stdout, "Response from `UploadsAPI.ConfirmUploads`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiConfirmUploadsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **uploadConfirmRequest** | [**UploadConfirmRequest**](UploadConfirmRequest.md) |  | 

### Return type

[**UploadResult**](UploadResult.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## SignUploads

> UploadSignResponse SignUploads(ctx).UploadSignRequest(uploadSignRequest).Execute()

Signed upload URLs for up to 50 recordings



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	uploadSignRequest := *openapiclient.NewUploadSignRequest([]openapiclient.UploadSignRequestFilesInner{*openapiclient.NewUploadSignRequestFilesInner("Name_example", "Type_example", int32(123))}) // UploadSignRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.UploadsAPI.SignUploads(context.Background()).UploadSignRequest(uploadSignRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UploadsAPI.SignUploads``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `SignUploads`: UploadSignResponse
	fmt.Fprintf(os.Stdout, "Response from `UploadsAPI.SignUploads`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiSignUploadsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **uploadSignRequest** | [**UploadSignRequest**](UploadSignRequest.md) |  | 

### Return type

[**UploadSignResponse**](UploadSignResponse.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## UploadTranscripts

> UploadResult UploadTranscripts(ctx).TranscriptUploadRequest(transcriptUploadRequest).Execute()

Create calls from transcripts, with no audio, into a new or existing batch



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/jagadeeshm007/Latte/sdks/go"
)

func main() {
	transcriptUploadRequest := *openapiclient.NewTranscriptUploadRequest([]openapiclient.TranscriptUploadRequestTranscriptsInner{*openapiclient.NewTranscriptUploadRequestTranscriptsInner("OriginalFilename_example", "AgentId_example", "TeamId_example", "ProductId_example", "CallDate_example", []openapiclient.TranscriptLine{*openapiclient.NewTranscriptLine("Speaker_example", "Text_example")})}) // TranscriptUploadRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.UploadsAPI.UploadTranscripts(context.Background()).TranscriptUploadRequest(transcriptUploadRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UploadsAPI.UploadTranscripts``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `UploadTranscripts`: UploadResult
	fmt.Fprintf(os.Stdout, "Response from `UploadsAPI.UploadTranscripts`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiUploadTranscriptsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **transcriptUploadRequest** | [**TranscriptUploadRequest**](TranscriptUploadRequest.md) |  | 

### Return type

[**UploadResult**](UploadResult.md)

### Authorization

[apiKey](../README.md#apiKey)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


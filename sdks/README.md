# SDKs

| Language   | Where                           | Install the newest                                                                             | Notes                           |
| ---------- | ------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| TypeScript | [packages/sdk](../packages/sdk) | `npm install https://github.com/jagadeeshm007/Latte/releases/latest/download/latte-sdk.tgz`    | hand-written, zero dependencies |
| Python     | [sdks/python](python)           | `pip install "git+https://github.com/jagadeeshm007/Latte@sdk-latest#subdirectory=sdks/python"` | generated                       |
| Go         | [sdks/go](go)                   | `go get github.com/jagadeeshm007/Latte/sdks/go@latest`                                         | generated                       |
| Java       | [sdks/java](java)               | `https://github.com/jagadeeshm007/Latte/releases/latest/download/latte-sdk.jar`                | generated                       |

Each language's README shows a pinned install for production and a first request.

## How the Python, Go and Java SDKs are made (ADR-0031)

They are generated from the API's OpenAPI document by OpenAPI Generator, in a pinned Docker image, and committed. Only two things in each are written by hand: the webhook signature check with its test, and the README. `.openapi-generator-ignore` keeps the generator off them.

- `make sdks` regenerates all three (`node scripts/gen-sdks.js python` for one). Run it after any change to the API's routes or schemas, and commit the result. CI fails when the committed SDKs differ from a fresh generation.
- `make sdks-test` builds and tests each one in its official image and leaves `sdks/python/dist/*.whl` and `sdks/java/target/*.jar`.
- Generator settings are in [config/](config); the image version is `IMAGE` in `scripts/gen-sdks.js`.
- Every webhook check is tested against [webhook-test-vector.json](webhook-test-vector.json); an API test checks that vector against the server's own signing.

## Releasing

All SDKs share the version in `packages/sdk/package.json`. Bump it (and `SDK_VERSION`), update the versions in the READMEs, run `make sdks`, and after the change is on `main` push the tag `sdk-v<version>`. The `sdk-release` workflow attaches the TypeScript tarball, the Python wheel, and the Java jar and pom, tags the Go module `sdks/go/v<version>`, and moves `sdk-latest` to the release.

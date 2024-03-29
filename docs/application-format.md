# Application format

This document describes the format for applications Nexus Edge is capable of deploying
and acts as a guide for developing a properly compliant client that may deploy an application on Nexus Edge.
The language follows RFC 2119.

## Packaging
- All files MUST be packaged into a single tar file (uncompressed), referred to as the "application package".
- At the top level MUST be a JSON-compliant metadata file `_metadata.json`.

The remaining structure is determined by the application type.
See [Application formats](Application formats) for format-specific information.

### Application metadata (`_metadata.json`)

The `_metadata.json` file contains a JSON object, the "Metadata" object.
All required and optional metadata is contained within Metadata.

The following fields are REQUIRED to be present within Metadata.
- The `app-type` **string** member that uniquely identifies the application format.
  - Node.js applications MUST use `nodejs`.
  - Python applications MUST use `python`.
- The `requires` **array** member that lists the capabilities the application *requires* of the gateway the application.
  Each capability is a **string**.
- The `prefers` **array** member that lists the capabilities the application can make use of on the host gateway but *can essentially function without*.
  Each capability is a **string**.
  Note that this member is REQUIRED, even if it must be empty.

#### Examples

A minimalistic application metadata file:
```json
{
  "app-type": "python",
  "requires": [],
  "prefers": []
}
```

A fuller metadata file:
```json
{
  "app-type": "nodejs",
  "requires": [
    "secure-enclave"
  ],
  "prefers": [
    "gpu"
  ]
}
```

### Application formats

Supported applications MUST follow the application-specific format in order to run on Nexus Edge.

#### Node.

At the top level of the application package must be an `app.js` file that is the entry point to the application.

#### Python

At the top level of the application package must be a
[built distribution](https://packaging.python.org/en/latest/glossary/#term-Built-Distribution)
in the [Wheel](https://packaging.python.org/en/latest/glossary/#term-Wheel) format.
Follow the [official packaging documentation](https://packaging.python.org/en/latest/tutorials/packaging-projects/)
to generate the `.whl` file.

## Deploying

To deploy an application, Nexus Edge additionally requires information about the application in a JSON-compliant metadata file,
referred to as the "deployment metadata".
This section details the contents of the **deployment metadata** file, a JSON-compliant file.

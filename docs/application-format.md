# Application format

This document describes the format for applications Nexus Edge is capable of deploying.
The language follows RFC 2119.

## Packaging
- All files MUST be packaged into a single tar file (uncompressed), referred to as the "application package".
- At the top level MUST be a JSON-compliant metadata file `_metadata.json`.

The remaining structure is determined by the application type.
See [Application formats](Application formats) for format-specific information.

## Application metadata (`_metadata.json`)

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
- The `devices` **array** member that lists the IDs of the devices the application will use.

### Examples

A minimalistic metadata file:
```json
{
  "app-type": "python",
  "requires": [],
  "prefers": [],
  "devices": []
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
  ],
  "devices": [
    "als-001",
    "airq-05"
  ]
}
```

## Application formats

Supported applications MUST follow the application-specific format in order to run on Nexus Edge.

### Node.js

TODO

### Python

At the top level of the application package must be a
[built distribution](https://packaging.python.org/en/latest/glossary/#term-Built-Distribution)
in the [Wheel](https://packaging.python.org/en/latest/glossary/#term-Wheel) format.
Follow the [official packaging documentation](https://packaging.python.org/en/latest/tutorials/packaging-projects/)
to generate the `.whl` file.

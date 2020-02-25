# Network Interaction Manager
This module enables applications to disseminate information or ask queries to the gateway network.

## Internals
* Sends disseminate or query requests using the Platform API endpoints.
* Uses MQTT to listen to the "platform-data" topic for any data from other gateways.
* Applications get callbacks when a new disseminate request is obtained.

Every new request is created with an origin-address and tag metadata. The tag field is used to differentiate data 
between applications. 
# Gateway Scanner Lite
This module is a trimmed down version of the gateway-scanner in the gateway repository. It allows auxiliary devices to 
scan for gateways that are nearby using the group key of the network. The group key is specified in group-key.json.

* There are a few differences from the module in the gateway repo:
    1. Uses the noble module for scanning BLE advertisements. Doesn't use bleno for advertising itself.
    2. The module is written as an EventEmitter which emits a new event when a peripheral is discovered.
    3. Uses noble-mac since noble does not work for recent OSX versions.
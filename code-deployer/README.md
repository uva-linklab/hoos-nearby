This script takes a script and a set of sensor ids which are needed to run the script.   
Responsibilities:
1. Figure out which gateways have the given set of sensor ids (a given sensor can be connected to more than one gw)
2. Pick the gateway which is closest to the sensors
3. Send a notification to the sensor to run the script with the given dependencies
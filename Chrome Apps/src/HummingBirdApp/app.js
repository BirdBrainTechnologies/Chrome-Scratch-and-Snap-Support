(function () {
    var ui = {
        connected: null,
        disconnected: null
    };

    var connection = -1;
    var deviceMap = {};
    var pendingDeviceMap = {};
    //raw sensor info from hummingbird
    var sensor_nums = new Array(4);
    var platform;
    //creates the initial window for the app, adds listeners for when a connection
    //is made, and looks for the hummingbird
    var initializeWindow = function () {
        for (var k in ui) {
            var id = k.replace(/([A-Z])/, '-$1').toLowerCase();
            var element = document.getElementById(id);
            if (!element) {
                throw "Missing UI element: " + k;
            }
            ui[k] = element;
        }

        enableIOControls(false);

        chrome.runtime.onMessageExternal.addListener(onMsgRecv);
        chrome.runtime.onConnectExternal.addListener(onConnect);
        enumerateDevices();
    };

    var hummingbirdPort;
    //when a connection is made to this app
    var onConnect = function (port) {
        hummingbirdPort = port;
        //if it disconnects
        port.onDisconnect.addListener(function () {
            hummingbirdPort = undefined;
        });
        // a listener for messages send via this connection
        //(when the client doesn't open a long
        //term port for communication)
        port.onMessage.addListener(function (request) {
            //the message is asking for the status of the hummingbird (connected or disconnected)
            if (request.message === "STATUS") {
                if (connection === -1) //not connected
                    sendResponse({status: false}); //send status to Scratch
                else {
                    sendResponse({status: true});
                }
            }
            //the message is asking for sensor information
            else if (request.message === "POLL") {
                sendResponse({
                    port1: sensor_nums[0],
                    port2: sensor_nums[1],
                    port3: sensor_nums[2],
                    port4: sensor_nums[3]
                });
            }
            //the message is asking for tts
            else if (request.message === "SPEAK") {
                chrome.tts.speak(request.val); //speak phrase using text to speech
            }
            else { // setting things on Hummingbird, no return report
                var bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
                var counter = 0;
                for (var prop in request) { //read through request, adding each property to byte array
                    if (request.hasOwnProperty(prop)) {
                        bytes[counter] = request[prop];
                        counter++;
                    }
                }
                for (var i = counter; i < bytes.length; ++i) {
                    bytes[i] = 0;
                }
                var id = 0;
                chrome.hid.send(connection, id, bytes.buffer, function () {
                });
            }
        });

    };
    //this is what is called when a message is sent directly to this app
    var onMsgRecv = function (request, sender, sendResponse) {
        //the message is asking for the status of the hummingbird (connected or disconnected)
        if (request.message === "STATUS") {
            if (connection === -1) //not connected
                sendResponse({status: false}); //send tatus to Scratch
            else {
                sendResponse({status: true});
            }
        }
        //the message is asking for sensor information
        else if (request.message === "POLL") {
            sendResponse({
                port1: sensor_nums[0],
                port2: sensor_nums[1],
                port3: sensor_nums[2],
                port4: sensor_nums[3]
            });
        }
        //the message is asking for tts
        else if (request.message === "SPEAK") {
            chrome.tts.speak(request.val); //speak phrase using text to speech
        }
        else { // setting things on Hummingbird, no return report
            var bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
            var counter = 0;
            for (var prop in request) { //read through request, adding each property to byte array
                if (request.hasOwnProperty(prop)) {
                    bytes[counter] = request[prop];
                    counter++;
                }
            }
            for (var i = counter; i < bytes.length; ++i) {
                bytes[i] = 0;
            }
            var id = 0;
            chrome.hid.send(connection, id, bytes.buffer, function () {
            });
        }
    };
    //this function sends requests to the hummingbird for all of its sensor data
    //this call is made 20 times a second and if it fails, it marks the
    //hummingbird as no longer connected
    var pollSensors = function () {
        var bytes = new Uint8Array(8);
        //all sensors
        bytes[0] = "G".charCodeAt(0);
        bytes[1] = "3".charCodeAt(0);
        for (var i = 2; i < bytes.length; ++i) {
            bytes[i] = 0;
        }
        var id = 0;
        chrome.hid.send(connection, id, bytes.buffer, function () {
            setTimeout(function(){
                recvSensors();
                var lastError = chrome.runtime.lastError;
                if (lastError) {
                    connection = -1;
                    enableIOControls(false);
                    return;
                }
                setTimeout(pollSensors, 50);
            },10);
        });
    };
    //this function reads reports send from the hummingbird 20 times a second
    //NOTE: The sensor data is still raw information and not converted to any
    //standard form. This is because the hummingbird can have many different
    //sensors and it is up to the user of this extension to convert the info
    //In the scratch and snap plugins created to be used with this extension,
    //the information is converted there
    var recvSensors = function () {
        chrome.hid.receive(connection, function (num, data) {
            var lastError = chrome.runtime.lastError;
            if (lastError) {
                connection = -1;
                enableIOControls(false);
                return;
            }

            var data_array = new Uint8Array(data);

            for (var i = 0; i < 4; i++) { //retrieves and stores all sensor values
                sensor_nums[i] = data_array[i];
            }
            //calls the post message function in the javascript using this plugin
            //if a port has been opened. this allows for the user of this app
            //to keep track of the updated information
            if (hummingbirdPort !== undefined) {
                hummingbirdPort.postMessage(sensor_nums);
            }
        });
    };
    //controls the display of the app (showing if the hummingbird is connected or
    //disonnected)
    var enableIOControls = function (ioEnabled) {
        ui.disconnected.style.display = ioEnabled ? 'none' : 'inline';
        ui.connected.style.display = ioEnabled ? 'inline' : 'none';
    };

    var pendingDeviceEnumerations;
    //looks for devices
    var enumerateDevices = function () {
        var deviceIds = [];
        var permissions = chrome.runtime.getManifest().permissions;
        for (var i = 0; i < permissions.length; ++i) {
            var p = permissions[i];
            if (p.hasOwnProperty('usbDevices')) {
                //the id of the hummingbird is obtained from the manifest file
                deviceIds = deviceIds.concat(p.usbDevices);
            }
        }
        pendingDeviceEnumerations = 0;
        pendingDeviceMap = {};
        for (var j = 0; j < deviceIds.length; ++j) {
            ++pendingDeviceEnumerations;
            //looks for hid device with vendor&product id specified in manifest
            chrome.hid.getDevices(deviceIds[j], onDevicesEnumerated);
        }
    };
    //after devices have been found, the devices variable is an array of
    //HidDeviceInfo, after waiting a second it checks for devices again
    var onDevicesEnumerated = function (devices) {
        for (var i = 0; i < devices.length; ++i) {
            pendingDeviceMap[devices[i].deviceId] = devices[i];
        }
        --pendingDeviceEnumerations;
        if (pendingDeviceEnumerations === 0) {
            //maps opaque device id to HidDeviceInfo
            deviceMap = pendingDeviceMap;
            if (connection === -1) {
                connect();
            }
            setTimeout(enumerateDevices, 1000);
        }
    };
    //records the connection, displays on app that the connection was made,
    //begins polling for information
    var connectFunction = function (connectInfo) {
        if (chrome.runtime.lastError || !connectInfo) {
            return;
        }
        connection = connectInfo.connectionId;
        enableIOControls(true);
        pollSensors();
        recvSensors();
    };
    //connects to non-null devices in device map
    var connect = function () {
        for (var k in deviceMap) {
            var deviceInfo = deviceMap[k];
            if (!deviceInfo)
                return;
            //does the actual connecting
            chrome.hid.connect(deviceInfo.deviceId, connectFunction);
        }
    };

    chrome.runtime.getPlatformInfo(function (platformInfo) {
        platform = platformInfo.os;
    });
    window.addEventListener('load', initializeWindow);
}());

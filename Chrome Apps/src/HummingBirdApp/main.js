"use strict";


var innerBounds = { width: 230, height: 320, minWidth: 230 };

var connection = -1;
var deviceMap = {};

//raw sensor info from hummingbird
var sensor_nums = new Array(4);
var platform;

var isDisconnectedInArduinoMode = false;

var isDuo = true;

//bluetoothStuff
var isBluetoothConnection = false;
var pairedBLEDevice = null;
var rxID, txID;
var BLEServiceUUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase();
var BLEServiceUUIDTX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase();//sending
var BLEServiceUUIDRX = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase();//receiving


function handleRequest(request) {
    var port = devicePort;
    //the message is asking for tts
    if (request.message === "SPEAK") {
        chrome.tts.speak(request.val); //speak phrase using text to speech
    }
    else if (request.message === "MOTOR") {
        var bytes = Uint8Array.of(
            'M'.charCodeAt(0),
            request.port.toString().charCodeAt(0),
            (request.velocity < 0 ? 1 : 0).toString().charCodeAt(),
            Math.abs(request.velocity),
            0, 0, 0, 0
        );

        sendBytes(bytes);
        port.postMessage({
            motor: {
                velocity: request.velocity,
                port: request.port
            }
        });
    }
    else if (request.message === "TRILED") {
        var bytes = Uint8Array.of(
            'O'.charCodeAt(0),
            request.port.toString().charCodeAt(0),
            request.intensities[0],
            request.intensities[1],
            request.intensities[2],
            0, 0, 0
        );

        sendBytes(bytes);
        port.postMessage({
            triLED: {
                intensities: request.intensities,
                port: request.port
            }
        });
    }
    else if (request.message === "LED") {
        var bytes = Uint8Array.of(
            'L'.charCodeAt(0),
            request.port.toString().charCodeAt(0),
            request.intensity,
            0, 0, 0, 0, 0
        );

        sendBytes(bytes);
        port.postMessage({
            LED: {
                intensity: request.intensity,
                port: request.port
            }
        });
    }
    else if (request.message === "SERVO") {
        var bytes = Uint8Array.of(
            'S'.charCodeAt(0),
            request.port.toString().charCodeAt(0),
            request.angle,
            0, 0, 0, 0, 0
        );

        sendBytes(bytes);
        port.postMessage({
            servo: {
                angle: request.angle,
                port: request.port
            }
        });
    }
    else if (request.message === "VIBRATION") {
        var bytes = Uint8Array.of(
            'V'.charCodeAt(0),
            request.port.toString().charCodeAt(0),
            request.intensity,
            0, 0, 0, 0, 0
        );

        sendBytes(bytes);
        port.postMessage({
            vibration: {
                intensity: request.intensity,
                port: request.port
            }
        });
    }
}

//controls the display of the app (showing if the finch is connected or
//disonnected)
var enableIOControls = function (ioEnabled) {
    chrome.runtime.sendMessage({
        ioEnabled: ioEnabled,
        isDuo: isDuo,
        isBluetoothConnection: isBluetoothConnection,
    });
};

var foundArduinoMode = (function () {
    var popupOpen = false;
    return function (devices) {
        if (devices.length > 0) {
            isDisconnectedInArduinoMode = true;
            if (popupOpen === false) {
                popupOpen = true;
                chrome.app.window.create("popup.html",
                    { innerBounds: { width: 300, height: 150, minWidth: 100 } },
                    function (window) {
                    });
            }
        } else {
            isDisconnectedInArduinoMode = false;
        }

    };
})();

function getHummingbirdType(callback) {
    if (connection == -1) {
        return;
    }
    if (isBluetoothConnection) {
        isDuo = true;
        callback();
        return;
    }
    var bytes = new Uint8Array(8);
    bytes[0] = 'G'.charCodeAt(0);
    bytes[1] = '4'.charCodeAt(0);
    for (var i = 2; i < (bytes.length - 1); i++) {
        bytes[i] = 0;
    }
    bytes[7] = 'G'.charCodeAt(0);
    var id = 0;
    chrome.hid.send(connection, id, bytes.buffer, function () {
        if (chrome.runtime.lastError) {
            connection = -1;
            enableIOControls(false);
            callback();
            return;
        }
        setTimeout(function () {
            console.log("sent request for type");

            chrome.hid.receive(connection, function (num, data) {
                if (chrome.runtime.lastError) {
                    connection = -1;
                    enableIOControls(false);
                    callback();
                    return;
                }
                var data_array = new Uint8Array(data);
                if (data_array[7] !== 'G'.charCodeAt(0)) {
                    chrome.hid.receive(connection, function (num, data) {
                        if (chrome.runtime.lastError) {
                            connection = -1;
                            enableIOControls(false);
                            callback();
                            return;
                        }
                        var data_array = new Uint8Array(data);
                        if (data_array[0] === 0x03 && data_array[1] === 0x00) {
                            isDuo = true;
                        } else {
                            console.log("Uno, got response: ");
                            for (var k = 0; k < data_array.length; k++) {
                                console.log(data_array[k]);
                            }
                            isDuo = false;
                        }
                        callback();
                    });
                }
                if (data_array[0] === 0x03 && data_array[1] === 0x00) {
                    isDuo = true;
                } else {
                    console.log("Uno, got response: ");
                    for (var k = 0; k < data_array.length; k++) {
                        console.log(data_array[k]);
                    }
                    isDuo = false;
                }
                callback();
            });

        }, 100);
    });
}

//this function reads reports send from the hummingbird 20 times a second
//NOTE: The sensor data is still raw information and not converted to any
//standard form. This is because the hummingbird can have many different
//sensors and it is up to the user of this extension to convert the info
//In the scratch and snap plugins created to be used with this extension,
//the information is converted there
var recvSensors = function (connection) {
    chrome.hid.receive(connection, function (num, data) {
        if (chrome.runtime.lastError) {
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
        if (devicePort !== undefined) {
            devicePort.postMessage({ sensors: sensor_nums });
        }
        recvSensors(connection);
    });
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

    if (connection === -1)
        return;
    chrome.hid.send(connection, id, bytes.buffer, function () {
        if (chrome.runtime.lastError) {
            handleError();
            return;
        }
        setTimeout(pollSensors, 50);
    });
};

function sendBytes(bytes) {
    var id = 0;
    if (isBluetoothConnection) {
        sendMessageBLE(bytes.buffer);
    } else {
        chrome.hid.send(connection, id, bytes.buffer, function () {
            if (chrome.runtime.lastError) {
                connection = -1;
                enableIOControls(false);
            }
        });
    }
}

var recvSensorsBLE = function () {
    setTimeout(function () {
        console.log("got some sensor stuff");
        chrome.bluetoothLowEnergy.readCharacteristicValue(rxID.instanceId, function (characteristic) {
            //rxID = characteristic;
            var data_array = new Uint8Array(characteristic.value);

            for (var a = 0; a < data_array.length; a++) {
                console.log(data_array[a]);
            }

            for (var i = 0; i < 4; i++) { //retrieves and stores all sensor values
                sensor_nums[i] = data_array[i];
            }
            //calls the post message function in the javascript using this plugin
            //if a port has been opened. this allows for the user of this app
            //to keep track of the updated information
            if (devicePort !== undefined) {
                devicePort.postMessage(sensor_nums);
            }
        });
    }, 50);
    if (pairedBLEDevice !== null)
        setTimeout(recvSensorsBLE, 100);
};

var enumerateBLEDevices = function () {
    console.log("looking at BLE!\n");
    //first look at devices I know
    chrome.bluetooth.getAdapterState(function (adapterInfo) {
        if (adapterInfo.available && adapterInfo.powered) {
            chrome.bluetooth.getDevices(function (knownDevices) {
                for (var i = 0; i < knownDevices.length; i++) {
                    var knownDevice = knownDevices[i];
                    if (knownDevice.uuids !== undefined) {
                        if (knownDevice.uuids.indexOf(BLEServiceUUID) > -1) {
                            if (knownDevice.paired) {
                                pairedBLEDevice = knownDevice;
                            }
                        }
                    }
                }
                connectToBLE(function () { });
            });
        }
    });

};

//this is what is called when a message is sent directly to this app
var onMsgRecv = function (request, sender, sendResponse) {
    //the message is asking for the status of the hummingbird (connected or disconnected)
    if (request.message === "STATUS") {
        if (connection === -1) //not connected
            sendResponse({ status: false }); //send tatus to Scratch
        else {
            sendResponse({ status: true, duo: isDuo });
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
        if (isBluetoothConnection) {
            sendMessageBLE(bytes.buffer, function () { });

        } else {
            chrome.hid.send(connection, id, bytes.buffer, function () {
                if (chrome.runtime.lastError) {
                    connection = -1;
                    enableIOControls(false);
                }
            });
        }
        // There is no data to send, but the caller may have a callback
        // to know when the message was processed.
        sendResponse();
    }
};

//records the connection, displays on app that the connection was made,
//begins polling for information
var connectFunction = function (connectInfo) {
    if (chrome.runtime.lastError || !connectInfo) {
        return;
    }
    connection = connectInfo.connectionId;
    setTimeout(function () {
        getHummingbirdType(function () {
            //so we have enough time for getHummingbirdType to finish
            setTimeout(function () {
                enableIOControls(true);
                pollSensors();
                recvSensors(connection);
            }, 250);
        });
    }, 100);//timeout gives us time to actually connect before we ask for type
};

var connectToBLE = function (callback) {
    if (pairedBLEDevice === null) {
        setTimeout(enumerateBLEDevices, 1000);
        return;
    }
    chrome.bluetoothLowEnergy.connect(pairedBLEDevice.address, function () {
        if (chrome.runtime.lastError) {
            console.log("Failed to connect");
            return;
        }
        //connected
        console.log("connected");
        chrome.bluetoothLowEnergy.getServices(pairedBLEDevice.address, function (services) {
            if (chrome.runtime.lastError) {
                console.log("Failed to get Services: " + chrome.runtime.lastError.message);
                return;
            }
            var serviceUART;
            for (var i = 0; i < services.length; i++) {
                if (services[i].uuid === BLEServiceUUID) {
                    serviceUART = services[i];
                    break;
                }
            }
            if (serviceUART === null) {
                console.log("Couldn't find UART: " + chrome.runtime.lastError.message);
                return;
            } else
                console.log("UART");
            chrome.bluetoothLowEnergy.getCharacteristics(serviceUART.instanceId, function (characteristics) {
                if (chrome.runtime.lastError) {
                    console.log("Failed to get characteristics: " + chrome.runtime.lastError.message);
                    return;
                }
                txID = null;
                rxID = null;
                for (var i = 0; i < characteristics.length; i++) {
                    if (characteristics[i].uuid === BLEServiceUUIDRX) {
                        rxID = characteristics[i];
                    }
                    if (characteristics[i].uuid === BLEServiceUUIDTX) {
                        txID = characteristics[i];
                    }
                    if (txID !== null && rxID !== null) {
                        console.log("characteristics");
                        isBluetoothConnection = true;
                        connection = 1;
                        enableIOControls(true);
                        startPollBLE();
                        callback();
                    }
                }
            });
        });
    });
};

var sendMessageBLE = function (arrayBuf, callback) {
    chrome.bluetoothLowEnergy.writeCharacteristicValue(txID.instanceId, arrayBuf, callback);
};

var startPollBLE = function () {
    console.log("starting BLE polling");
    var bytes = new Uint8Array(8);
    bytes[0] = 'G'.charCodeAt(0);
    bytes[1] = '6'.charCodeAt(0);
    for (var i = 2; i < bytes.length; i++) {
        bytes[i] = 0;
    }
    sendMessageBLE(bytes.buffer, function () {
        recvSensorsBLE();
    });
};

chrome.bluetooth.onDeviceRemoved.addListener(function (deviceRemoved) {
    if (deviceRemoved === pairedBLEDevice) {
        enableIOControls(false);
        isBluetoothConnection = false;
        connection = -1;
        pairedBLEDevice = null;
        txID = null;
        rxID = null;
        enumerateBLEDevices();
    }
});

//looks for devices
var enumerateDevices = function () {
    console.log("looking at USB!\n");

    var deviceIds = [];
    var permissions = chrome.runtime.getManifest().permissions;
    for (var i = 0; i < permissions.length; ++i) {
        var p = permissions[i];
        if (p.hasOwnProperty('usbDevices')) {
            //the id of the hummingbird is obtained from the manifest file
            deviceIds = deviceIds.concat(p.usbDevices);
        }
    }
    if (connection === -1) {//to update between being disconnected or connected in arduino mode (which is still disconnected)
        enableIOControls(false);
    }
    chrome.usb.getDevices(deviceIds[1], foundArduinoMode);//arduino mode 

    //looks for hid device with vendor&product id specified in manifest
    chrome.hid.getDevices(deviceIds[0], onDevicesEnumerated);
};

initialize();

chrome.runtime.getPlatformInfo(function (platformInfo) {
    platform = platformInfo.os;
    console.log(platform);
    if (platform === 'cros') {
        enumerateBLEDevices();
    }
});

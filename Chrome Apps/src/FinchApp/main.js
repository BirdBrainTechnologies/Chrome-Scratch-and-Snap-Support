"use strict";

var innerBounds = { width: 230, height: 420, minWidth: 230 };

var pause_between_messages = 50;
var pause_between_read_poll = 10;
var pause_polling = 200;
var pause_between_repeated_send = 250;

var deviceMap = {};
// var pendingDeviceMap = {};
var platform;

function handleRequest(request) {
    //the message is asking for tts
    if (request.message === "SPEAK") {
        chrome.tts.speak(request.val); //speak phrase using text to speech
    }
    else if (request.message === "MOTOR") {
        var speeds = request.speeds;
        var bytes = Uint8Array.of(
            "M".charCodeAt(0),
            speeds[0] < 0 ? 1 : 0,  // left direction
            Math.abs(speeds[0]),    // left speed
            speeds[1] < 0 ? 1 : 0,  // right direction
            Math.abs(speeds[1]),    // right speed
            0, 0, 0                 // Must be a total of 8 values
        );
        sendByteArrayUntilSuccess(bytes);
        devicePort.postMessage({ moveSpeeds: speeds });
    }
    else if (request.message === "LED") {
        var values = request.values;
        var bytes = Uint8Array.of(
            "O".charCodeAt(0),
            values[0],          // red
            values[1],          // green
            values[2],          // blue
            0, 0, 0, 0
        );
        sendByteArrayUntilSuccess(bytes);
        devicePort.postMessage({ LEDs: values });
    }
    else if (request.message === "BUZZER") {
        var value = request.value;
        var bytes = Uint8Array.of(
            "B".charCodeAt(0),
            value.time >> 8,
            value.time & 0xFF,
            value.freq >> 8,
            value.freq & 0xFF,
            0, 0, 0
        );
        sendByteArrayUntilSuccess(bytes);
        devicePort.postMessage({ buzzer: value });
    }
    else { // setting things, no return report
        var bytes = new Uint8Array(8); //array of bytes to send to Finch
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
        sendByteArrayUntilSuccess(bytes);
    }
}

//this is what is called when a message is sent directly to this app
var onMsgRecv = function (request, sender, sendResponse) {
    //the message is asking for the status of the finch (connected or disconnected)
    if (request.message === "STATUS") {
        if (connection === -1) //not connected
            sendResponse({ status: false }); //send status to Scratch
        else {
            sendResponse({ status: true });
        }
    }
    //the message is asking for tts
    else if (request.message === "SPEAK") {
        chrome.tts.speak(request.val); //speak phrase using text to speech
    }
    //the message is asking for sensor information
    else if (request.message === "POLL") {
        sendResponse(sensor_nums);
    }
    else { // setting things, no return report
        var bytes = new Uint8Array(8); //array of bytes to send to Finch
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
        sendByteArrayUntilSuccess(bytes);

        // No data, but the caller might have a callback to be notified
        sendResponse();
    }
};

//this is called on a report recieved from the finch, it figures out
//what sensor the report is about and saves it
//NOTE: calculations are already made to convert the raw sensor data
//into usable information. Temperature is in Celcius.
var sortMessages = function (data) {
    var data_array = new Uint8Array(data);
    if (data_array[7] === "T".charCodeAt()) {
        sensor_nums.temperature = Math.round(((data_array[0] - 127) / 2.4 + 25) * 10) / 10;
    }
    else if (data_array[7] === "L".charCodeAt()) {
        sensor_nums.lights = [Math.round(data_array[0] / 2.55), Math.round(data_array[1] / 2.55)];
    }
    else if (data_array[7] === "I".charCodeAt()) {
        sensor_nums.obstacles = [data_array[0], data_array[1]];
    }
    else if (data_array[0] === 153) {
        var newdata = Array(3);
        for (var i = 1; i < 4; i++) {
            if (data_array[i] > 0x1F)
                newdata[i - 1] = (data_array[i] - 64) / 32 * 1.5;
            else
                newdata[i - 1] = data_array[i] / 32 * 1.5;
        }
        sensor_nums.acceleration = newdata.map(function (value) {
            return Math.round(value * 10) / 10;
        });
    }

    if (devicePort !== undefined) {
        devicePort.postMessage({ sensors: sensor_nums });
    }
};
//Takes a character and turns it into a proper request array buffer
function makeRequest(c) {
    var bytes = new Uint8Array(8);
    //temperature
    bytes[0] = c.charCodeAt();
    for (var i = 1; i < bytes.length - 1; ++i) {
        bytes[i] = 0;
    }
    bytes[7] = c.charCodeAt();
    return bytes.buffer;
}
//sends a request for each sensor to the finch then reads response
var pollSensors = function () {
    //temperature
    chrome.hid.send(connection, 0, makeRequest("T"), function () {
        if (chrome.runtime.lastError) {
            handleError();
            // return;
        }
        setTimeout(function () {
            //light sensors
            chrome.hid.send(connection, 0, makeRequest("L"), function () {
                if (chrome.runtime.lastError) {
                    handleError();
                    // return;
                }
                setTimeout(function () {
                    //obstacle sensors
                    chrome.hid.send(connection, 0, makeRequest("I"), function () {
                        if (chrome.runtime.lastError) {
                            handleError();
                            // return;
                        }
                        setTimeout(function () {
                            //accelerometer info
                            chrome.hid.send(connection, 0, makeRequest("A"), function () {
                                if (chrome.runtime.lastError) {
                                    handleError();
                                    // return;
                                }
                                setTimeout(function () {
                                    setTimeout(pollSensors, pause_polling);
                                }, pause_between_messages);
                            });
                        }, pause_between_messages);
                    });
                }, pause_between_messages);
            });
        }, pause_between_messages);
    });
};


//this function reads reports send from the finch and then
//parses them to see what information they contain
//messages are identified by the last byte.
var getSensors = function (connection) {
    chrome.hid.receive(connection, function (id, data) {
        if (chrome.runtime.lastError) {
            handleError();
            return;
        }
        sortMessages(data);
        getSensors(connection);
    });
};

//looks for devices
var enumerateDevices = function () {
    var deviceIds = [];
    var permissions = chrome.runtime.getManifest().permissions;
    for (var i = 0; i < permissions.length; ++i) {
        var p = permissions[i];
        if (p.hasOwnProperty('usbDevices')) {
            //the id of the finch is obtained from the manifest file
            deviceIds = deviceIds.concat(p.usbDevices);
        }
    }
    //looks for hid device with vendor&product id specified in manifest
    chrome.hid.getDevices(deviceIds[0], onDevicesEnumerated);
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
    getSensors(connection);
};

//controls the display of the app (showing if the finch is connected or
//disonnected)
var enableIOControls = function (ioEnabled) {
    chrome.runtime.sendMessage(ioEnabled);
};

chrome.runtime.getPlatformInfo(function (platformInfo) {
    platform = platformInfo.os;
});

//all the sensor info of the finch
var sensor_nums = {
    temperature: 0,
    obstacles: [0, 0],
    lights: [0, 0],
    acceleration: [0, 0, 0],
};
//if we fail at an operation to the finch
function handleError() {
    connection = -1;
    enableIOControls(false);
}
var sendByteArrayUntilSuccess = function (bytes) {
    chrome.hid.send(connection, 0, bytes.buffer, function () {
        if (chrome.runtime.lastError) {
            setTimeout(sendByteArrayUntilSuccess, pause_between_repeated_send);
            return;
        }
    });
};

initialize();
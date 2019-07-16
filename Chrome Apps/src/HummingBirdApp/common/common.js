"use strict";
var connection = -1;
var devicePort;


//when a connection is made to this app
function onConnect(port) {
    devicePort = port;

    //if it disconnects
    port.onDisconnect.addListener(function () {
        devicePort = undefined;
    });
    // a listener for messages send via this connection
    //(when the client doesn't open a long
    //term port for communication)
    port.onMessage.addListener(handleRequest);
};

//after devices have been found, the devices variable is an array of
//HidDeviceInfo
var onDevicesEnumerated = function (devices) {
    for (var i = 0; i < devices.length; ++i) {
        //maps opaque device id to HidDeviceInfo
        connectToDevice(devices[i]);
    }
    // setTimeout(enumerateDevices, 1000);
};

function initialize() {
    chrome.runtime.onConnectExternal.addListener(onConnect);
    chrome.runtime.onMessageExternal.addListener(onMsgRecv);
    setTimeout(enumerateDevices, 1000);
}

function connectToDevice(deviceInfo) {
    chrome.hid.connect(deviceInfo.deviceId, connectFunction);
}
chrome.hid.onDeviceAdded.addListener(connectToDevice);

chrome.hid.onDeviceRemoved.addListener(function (deviceRemoved) {
    handleError();
    enumerateDevices();
})

chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create(
        "window.html",
        {
            innerBounds: innerBounds
        },
        () => enableIOControls(connection != -1)
    );
});
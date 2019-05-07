"use strict";
(function () {

    function openSnap() {
        //startHTTP();
        chrome.browser.openTab({
            url: 'http://snap.berkeley.edu/snapsource/snap.html#cloud:Username=birdbraintech&ProjectName=Hummingbird-Chrome100'
        });
    }

    function openScratch() {
        chrome.browser.openTab({
            url: 'http://scratchx.org/?url=http://birdbraintechnologies.github.io/Chrome-Scratch-and-Snap-Support/Scratch%20Plugins/HummingbirdHID_Scratch(Chrome%20Plugin)/v1.0.js#scratch'
        });
    }

    function openHowToHBMode() {
        chrome.browser.openTab({
            url: 'http://hummingbirdkit.com/learning/switching-arduino-mode-hummingbird-mode'
        });
    }

    var ui = {
        connected: null,
        disconnected: null,
        arduino: null,
        uno: null,
        bluetooth: null
    };

    //creates the initial window for the app
    var initializeWindow = function () {
        for (var k in ui) {
            var id = k.replace(/([A-Z])/, '-$1').toLowerCase();
            var element = document.getElementById(id);
            if (!element) {
                throw "Missing UI element: " + k;
            }
            ui[k] = element;
        }
        document.getElementById("snapButton").addEventListener('click', openSnap);
        document.getElementById("scratchButton").addEventListener('click', openScratch);
    };

    //controls the display of the app (showing if the hummingbird is connected or
    //disonnected)
    var enableIOControls = function (state) {
        if (ui.disconnected === null) {
            setTimeout(enableIOControls, 200, state);
        }
        if (state.isDisconnectedInArduinoMode && state.ioEnabled === false) {//disconnected but arduino mode found
            ui.disconnected.style.display = 'none';
            ui.connected.style.display = 'none';
            ui.bluetooth.style.display = 'none';
            ui.arduino.style.display = 'inline';
        }
        else { //no arduino mode
            ui.arduino.style.display = 'none';
            ui.disconnected.style.display = state.ioEnabled ? 'none' : 'inline';

            if (state.isDuo && !state.isBluetoothConnection) { //device may be connected, if it is, its a duo
                ui.connected.style.display = state.ioEnabled ? 'inline' : 'none';
                ui.uno.style.display = 'none';
                ui.bluetooth.style.display = 'none';
            }
            else if (!state.isBluetoothConnection) { //device may be connected, if it is, its not a duo or a BLE
                ui.uno.style.display = state.ioEnabled ? 'inline' : 'none';
                ui.connected.style.display = 'none';
                ui.bluetooth.style.display = 'none';
            }
            else { //BLE
                ui.disconnected.style.display = 'none';
                ui.connected.style.display = 'none';
                ui.arduino.style.display = 'none';
                ui.bluetooth.style.display = state.ioEnabled ? 'inline' : 'none';
            }
        }
        /*
         if (!state.ioEnabled && httpRunning){
         leds = [-1,-1,-1,-1];
         trileds = [[-1,-1,-1],[-1,-1,-1]];
         vibrations = [-1,-1];
         motors = [-1,-1];
         servos = [-1,-1,-1,-1];
         }
         */
    };
    chrome.runtime.onMessage.addListener(enableIOControls);

    //-----------------------------------------------------------------------------------------------------------------
    //http server stuff------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------
    //This code is for accepting http requests to control the hummingbird
    //while the above code is for javascript communications with this app
    //to control the hummingbird
    //-----------------------------------------------------------------------------------------------------------------
    /*
     var httpRunning = false;
     var tcpServer = chrome.sockets.tcpServer;
     var tcpSocket = chrome.sockets.tcp;

     var serverSocketId = null;
     var clientSocketId = null;
     //this internal representation is ONLY valid for HTTP comunications
     var leds = [-1,-1,-1,-1];
     var trileds = [[-1,-1,-1],[-1,-1,-1]];
     var vibrations = [-1,-1];
     var motors = [-1,-1];
     var servos = [-1,-1,-1,-1];

     function t2ab(str) {
     var buffer = new ArrayBuffer(str.length);
     var view = new DataView(buffer);
     for(var i = 0, l = str.length; i < l; i++) {
     view.setInt8(i, str.charAt(i).charCodeAt());
     }
     return buffer;
     }

     function ab2t(buffer) {
     var str = '';
     var uArrayVal = new Uint8Array(buffer);
     for (var s = 0; s < uArrayVal.length; s++) {
     str += String.fromCharCode(uArrayVal[s]);
     }
     return str;
     }


     var RESPHEAD = [
     "HTTP/1.1 200 OK",
     "Server: HummingbirdFinchServer",
     "Content-Length: {%len%}",
     "Connection: Close",
     "Content-Type: text/html",
     "Access-Control-Allow-Origin: *"
     ];
     RESPHEAD = RESPHEAD.join("\r\n")+"\r\n\r\n";

     var response = function(str){
     var len = str.length;
     return t2ab(RESPHEAD.replace("{%len%}", len)+str);
     };

     var destroySocketById = function(socketId) {
     tcpSocket.disconnect(socketId, function() {
     tcpSocket.close(socketId);
     });
     };
     function startHTTP(){
     httpRunning = true;
     tcpServer.create({},function(createInfo){
     listenAndAccept(createInfo.socketId);
     });
     }
     function stopHTTP(){
     tcpServer.close(serverSocketId, function(){});
     }
     function listenAndAccept(socketId) {
     tcpServer.listen(socketId,
     "127.0.0.1", 22179, function(resultCode) {
     onListenCallback(socketId, resultCode);
     });
     }
     function onListenCallback(socketId, resultCode) {
     console.log("listening...");
     if (resultCode < 0) {
     console.log("Error listening:" +
     chrome.runtime.lastError.message);
     return;
     }
     serverSocketId = socketId;
     tcpServer.onAccept.addListener(onAccept);
     tcpSocket.onReceive.addListener(onReceive);
     tcpServer.getInfo(serverSocketId, function(socketInfo){
     console.log("address: " + socketInfo.localAddress+"   port: "+socketInfo.localPort);
     });
     }
     function onAccept(info) {
     console.log("accepted connection");
     if (info.socketId != serverSocketId)
     return;
     // A new TCP connection has been established.
     clientSocketId = info.clientSocketId;


     //tcpSocket.send(clientSocketId, response(RESP),
     //function(resultCode) {
     //    console.log("Data sent to new TCP client connection.");
     //});
     // Start receiving data.
     tcpSocket.setPaused(info.clientSocketId, false);
     }

     var onReceive = function(receiveInfo) {
     console.log("READ", receiveInfo);
     var socketId = receiveInfo.socketId;

     // Parse the request.
     var data = ab2t(receiveInfo.data);
     // we can only deal with GET requests
     if (data.indexOf("GET ") !== 0) {
     // close socket and exit handler
     //destroySocketById(socketId);
     return;
     }
     var uriEnd = data.indexOf(" ", 4);
     if (uriEnd < 0) { return; }
     var uri = data.substring(4, uriEnd);
     // strip query string
     var q = uri.indexOf("?");
     if (q != -1) {
     uri = uri.substring(0, q);
     }
     processRequest(uri);
     //destroySocketById(socketId);
     };

     function processRequest(uri){
     var bytes, id = 0, i;
     var parts = uri.split("/");
     parts = parts.filter(function(n){return n !=="";});
     console.log(parts);
     if (parts.length < 3)
     return;
     if (parts[0] !== "hummingbird")
     return;
     if (parts[1] === "out"){
     if(parts.length < 5)
     return;
     var portString = (parseInt(parts[3]) - 1).toString();
     switch(parts[2]){
     case "motor":
     console.log("got motor command");
     var rawVelocity = parseInt(parts[4]);
     if (rawVelocity == motors[parseInt(portString)]){
     tcpSocket.send(clientSocketId, response("motor is already at that value"),
     function(resultCode) {
     console.log("motor has not been set");

     });
     return;
     }
     var velocity = rawVelocity;
     var direction;
     if (velocity < 0) {
     direction = "1".charCodeAt(0);
     velocity = Math.floor(velocity * -2.55);
     }
     else {
     direction = "0".charCodeAt(0);
     velocity = Math.floor(velocity * 2.55);
     }
     bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
     bytes[0] = "M".charCodeAt(0);
     bytes[1] = portString.charCodeAt(0);
     bytes[2] = direction;
     bytes[3] = velocity;
     for (i = 4; i < bytes.length; ++i) {
     bytes[i] = 0;
     }
     id = 0;
     chrome.hid.send(connection, id, bytes.buffer, function () {});
     tcpSocket.send(clientSocketId, response("set motor"),
     function(resultCode) {
     motors[parseInt(portString)] = rawVelocity;
     console.log("motor has been set");
     });
     break;
     case "servo":
     var angle = parseInt(parts[4]);
     if (angle == servos[parseInt(portString)]){
     tcpSocket.send(clientSocketId, response("servo is already at that value"),
     function(resultCode) {
     console.log("servo has not been set");
     });
     return;
     }
     var realAngle = Math.floor(angle * 2.35);
     bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
     bytes[0] = "S".charCodeAt(0);
     bytes[1] = portString.charCodeAt(0);
     bytes[2] = realAngle;
     for (i = 3; i < bytes.length; ++i) {
     bytes[i] = 0;
     }
     id = 0;
     chrome.hid.send(connection, id, bytes.buffer, function () {});
     tcpSocket.send(clientSocketId, response("set servo"),
     function(resultCode) {
     servos[parseInt(portString)] = angle;
     console.log("servo has been set");
     });
     break;
     case "vibration":
     var vibSpeed = parseInt(parts[4]);
     if (vibSpeed == vibrations[parseInt(portString)]){
     tcpSocket.send(clientSocketId, response("vibration is already at that value"),
     function(resultCode) {
     console.log("vibration has not been set");
     });
     return;
     }
     var realIntensity = Math.floor(vibSpeed * 2.55);
     bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
     bytes[0] = "V".charCodeAt(0);
     bytes[1] = portString.charCodeAt(0);
     bytes[2] = realIntensity;
     for (i = 3; i < bytes.length; ++i) {
     bytes[i] = 0;
     }
     id = 0;
     chrome.hid.send(connection, id, bytes.buffer, function () {});
     tcpSocket.send(clientSocketId, response("set vibration"),
     function(resultCode) {
     console.log("vibration has been set");
     vibrations[parseInt(portString)] = vibSpeed;
     });
     break;
     case "led":
     var intensity = parseInt(parts[4]);
     if (intensity == leds[parseInt(portString)]){
     tcpSocket.send(clientSocketId, response("led is already at that value"),
     function(resultCode) {
     console.log("led has not been set");
     });
     return;
     }
     var realIntensityLED = Math.floor(intensity * 2.55);
     bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
     bytes[0] = "L".charCodeAt(0);
     bytes[1] = portString.charCodeAt(0);
     bytes[2] = realIntensityLED;
     for (i = 3; i < bytes.length; ++i) {
     bytes[i] = 0;
     }
     id = 0;
     chrome.hid.send(connection, id, bytes.buffer, function () {});
     tcpSocket.send(clientSocketId, response("set led"),
     function(resultCode) {
     console.log("led has been set");
     leds[parseInt(portString)] = intensity;
     });
     break;
     case "triled":
     if(parts.length < 7)
     return;
     var red = parseInt(parts[4]);
     var green = parseInt(parts[5]);
     var blue = parseInt(parts[6]);
     if ([red, green, blue] == trileds[parseInt(portString)]){
     tcpSocket.send(clientSocketId, response("triled is already at that value"),
     function(resultCode) {
     console.log("triled has not been set");
     });
     return;
     }
     var realRed = Math.floor(red * 2.55);
     var realGreen = Math.floor(green * 2.55);
     var realBlue = Math.floor(blue * 2.55);
     bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
     bytes[0] = "O".charCodeAt(0);
     bytes[1] = portString.charCodeAt(0);
     bytes[2] = realRed;
     bytes[3] = realGreen;
     bytes[4] = realBlue;
     for (i = 5; i < bytes.length; ++i) {
     bytes[i] = 0;
     }
     id = 0;
     chrome.hid.send(connection, id, bytes.buffer, function () {});
     tcpSocket.send(clientSocketId, response("set triled"),
     function(resultCode) {
     console.log("triled has been set");
     trileds[parseInt(portString)] = [red, green, blue];
     });
     break;
     }
     }
     else if (parts[1] === "in"){
     var responseString = "", port;
     switch(parts[2]){
     case "sensors":
     var port1 = Math.floor(sensor_nums[0] / 2.55);
     var port2 = Math.floor(sensor_nums[1] / 2.55);
     var port3 = Math.floor(sensor_nums[2] / 2.55);
     var port4 = Math.floor(sensor_nums[3] / 2.55);
     responseString =  port1.toString() + " " + port2.toString() + " "
     + port3.toString() + " " + port4.toString() + " ";
     id = 0;
     tcpSocket.send(clientSocketId, response(responseString),
     function(resultCode) {
     console.log("got sensors data");
     });
     break;
     case "sensor":
     if(parts.length < 4)
     return;
     port = parseInt(parts[3]) - 1;
     responseString =  Math.floor(sensor_nums[port] / 2.55).toString();
     id = 0;
     tcpSocket.send(clientSocketId, response(responseString),
     function(resultCode) {
     console.log("got sensor data");
     });
     break;
     case "distance":
     if(parts.length < 4)
     return;
     var finalAnswer;
     port = parseInt(parts[3]) - 1;
     var reading = sensor_nums[port] * 4;
     if (reading < 130) {
     finalAnswer = 100;
     }
     else { //formula based on mathematical regression
     reading = reading - 120;
     var distance;
     if (reading > 680)
     distance = 5.0;
     else {
     var sensor_val_square = reading * reading;
     distance = sensor_val_square * sensor_val_square * reading * -0.000000000004789
     + sensor_val_square * sensor_val_square * 0.000000010057143
     - sensor_val_square * reading * 0.000008279033021
     + sensor_val_square * 0.003416264518201
     - reading * 0.756893112198934
     + 90.707167605683000;
     }
     finalAnswer = parseInt(distance);
     }
     responseString =  finalAnswer.toString();
     id = 0;
     tcpSocket.send(clientSocketId, response(responseString),
     function(resultCode) {
     console.log("got distance data");
     });
     break;
     case "sound":
     if(parts.length < 4)
     return;
     port = parseInt(parts[3]) - 1;
     var soundLevel = sensor_nums[port];
     responseString =  soundLevel.toString();
     id = 0;
     tcpSocket.send(clientSocketId, response(responseString),
     function(resultCode) {
     console.log("got sound data");
     });
     break;
     case "temperature":
     if(parts.length < 4)
     return;
     port = parseInt(parts[3]) - 1;
     var temp = Math.floor(((sensor_nums[port] - 127) / 2.4 + 25) * 100 / 100);
     responseString =  temp.toString();
     id = 0;
     tcpSocket.send(clientSocketId, response(responseString),
     function(resultCode) {
     console.log("got temperature data");
     });
     break;
     }
     }
     }
     */
    window.addEventListener('load', initializeWindow);
}());

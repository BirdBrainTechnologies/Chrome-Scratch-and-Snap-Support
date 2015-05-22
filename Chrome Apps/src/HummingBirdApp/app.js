(function() {
  var ui = {
    connected: null,
    disconnected: null
  };

  var connection = -1;
  var deviceMap = {};
  var pendingDeviceMap = {};
  var sensor_nums = new Array(4);
  var platform;
  
  var initializeWindow = function() {
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
  var onConnect = function(port){
    hummingbirdPort = port;
    port.onDisconnect.addListener(function(){
            hummingbirdPort = undefined;
        });
    port.onMessage.addListener(function(request){
      if(request.message === "STATUS"){
          if(connection === -1) //not connected
            sendResponse({status:false}); //send status to Scratch
          else {
            sendResponse({status:true});
          }
        }
        else if(request.message ==="POLL"){
            sendResponse({port1:sensor_nums[0],
                          port2:sensor_nums[1],
                          port3:sensor_nums[2],
                          port4:sensor_nums[3]
            });
    }
        else if(request.message ==="SPEAK"){
            chrome.tts.speak(request.val); //speak phrase using text to speech
        }
        else { // setting things on Hummingbird, no return report
            var bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
            var counter = 0;
            for(var prop in request) { //read through request, adding each property to byte array
                if(request.hasOwnProperty(prop)){
                    bytes[counter] = request[prop];
                    counter++;
                }
            }
            for(var i = counter; i<bytes.length;++i) {
                bytes[i] = 0;
            }
            var id = 0;
            chrome.hid.send(connection,id,bytes.buffer,function(){});
        }
    });
  
  };
  
  var onMsgRecv = function(request, sender, sendResponse) {
    if(request.message === "STATUS"){
        if(connection === -1) //not connected
            sendResponse({status:false}); //send tatus to Scratch
        else {
            sendResponse({status:true});
        }
    }
    else if(request.message ==="POLL"){
            sendResponse({port1:sensor_nums[0],
                          port2:sensor_nums[1],
                          port3:sensor_nums[2],
                          port4:sensor_nums[3]
            });
    }
    else if(request.message ==="SPEAK"){
        chrome.tts.speak(request.val); //speak phrase using text to speech
    }
    else { // setting things on Hummingbird, no return report
        var bytes = new Uint8Array(8); //array of bytes to send to Hummingbird
        var counter = 0;
        for(var prop in request) { //read through request, adding each property to byte array
            if(request.hasOwnProperty(prop)){
                bytes[counter] = request[prop];
                counter++;
            }
        }
        for(var i = counter; i<bytes.length;++i) {
            bytes[i] = 0;
        }
        var id = 0;
        chrome.hid.send(connection,id,bytes.buffer,function(){});
    }
  };
  
  
  var recvSensors = function(){
    chrome.hid.receive(connection, function(num,data){
        var lastError = chrome.runtime.lastError;
        if(lastError){
            connection = -1;
            enableIOControls(false);
            return;
        }
        
        var data_array = new Uint8Array(data);

	for(var i = 0;i<4;i++){ //retrieves and stores all sensor values
	    sensor_nums[i] = data_array[i];
	}

        if(hummingbirdPort!==undefined){
            hummingbirdPort.postMessage(sensor_nums);
	}

        if(connection!==-1){
            setTimeout(recvSensors,50);
        }
    });
  };
  
  var pollSensors = function(){
    var bytes = new Uint8Array(8);
    bytes[0] = "G".charCodeAt(0);
    bytes[1] = "3".charCodeAt(0);
    for (var i = 2; i < bytes.length; ++i) {
         bytes[i] = 0;
    }
    var id = 0;
    chrome.hid.send(connection, id, bytes.buffer, function() {
        var lastError = chrome.runtime.lastError;
        if(lastError){
            connection = -1;
            enableIOControls(false);
            return;
        }
        setTimeout(pollSensors,50);
    });
  };

  var enableIOControls = function(ioEnabled) {
    ui.disconnected.style.display = ioEnabled ? 'none' : 'inline';
    ui.connected.style.display = ioEnabled ? 'inline' : 'none';
  };

  var pendingDeviceEnumerations;
  var enumerateDevices = function() {
    var deviceIds = [];
    var permissions = chrome.runtime.getManifest().permissions;
    for (var i = 0; i < permissions.length; ++i) {
      var p = permissions[i];
      if (p.hasOwnProperty('usbDevices')) {
        deviceIds = deviceIds.concat(p.usbDevices);
      }
    }
    pendingDeviceEnumerations = 0;
    pendingDeviceMap = {};
    for (var j = 0; j < deviceIds.length; ++j) {
      ++pendingDeviceEnumerations;
      chrome.hid.getDevices(deviceIds[j], onDevicesEnumerated);
    }
  };

  var onDevicesEnumerated = function(devices) {
    for (var i = 0; i < devices.length; ++i) {
      pendingDeviceMap[devices[i].deviceId] = devices[i];
    }
    --pendingDeviceEnumerations;
    if (pendingDeviceEnumerations === 0) {
      deviceMap = pendingDeviceMap;
      if(connection === -1){
        connect();
      }
      setTimeout(enumerateDevices, 1000);
    }
  };
  
  var connectFunction = function(connectInfo){
    if (chrome.runtime.lastError || !connectInfo) {
      return;
    }
    connection = connectInfo.connectionId; 
    enableIOControls(true);
    pollSensors();
    recvSensors();
  };
  
  var connect = function() {
    for(var k in deviceMap){
        var deviceInfo = deviceMap[k];
        if (!deviceInfo)
          return;
        chrome.hid.connect(deviceInfo.deviceId, connectFunction);
    }
  };
  
  chrome.runtime.getPlatformInfo(function(platformInfo){
    platform = platformInfo.os;
  });
  window.addEventListener('load', initializeWindow);
}());

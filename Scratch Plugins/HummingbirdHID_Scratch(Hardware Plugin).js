/*
    This script allows for the creation of scratch code for the hummingbird duo. You must have installed the scratch
    hardware plugin in order for this script to work.
 */
(function(ext){
    var device = null;
    var poller = null;
    var sensorData = new Uint8Array(8);
    ext._deviceConnected = function(dev) {
        if(device)
            return;
        device = dev;
        device.open();
        poller = setInterval(function() {
            pollSensors();
        }, 20);
    };

    var pollSensors = function () {
        var bytes = new Uint8Array(9);
        bytes[0] = 0;
        bytes[1] = 'G'.charCodeAt(0);
        bytes[2] = '3'.charCodeAt(0);
        for (var i = 3; i < bytes.length; ++i) {
            bytes[i] = 0;
        }
        device.write(bytes.buffer);
        sensorData = new Uint8Array(device.read(8));
    };
    function fitTo255(num) {
        return Math.max(Math.min(num,255.0),0.0);
    }
    ext._deviceRemoved = function(dev) {
        if(device != dev)
            return;
        device = null;
        if(poller)
            poller = clearInterval(poller);
    };

    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {
        var bytes = new Uint8Array(9);
        bytes[0] = 0;
        bytes[1] = "R".charCodeAt(0);
        for(var i = 2; i<bytes.length;++i) {
            bytes[i] = 0;
        }
        device.write(bytes);
        if(device)
            device.close();
        device = null;
        if(poller)
            poller = clearInterval(poller);
    };

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        if(!device)
            return {status: 1, msg: 'HummingBird disconnected'};
        else
            return {status: 2, msg: 'HummingBird connected'};
    };

    ext.setHummingbirdMotor = function(portnum, velocity){
        var realPort = portnum-1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var direction;
        if(velocity < 0){
            direction = "1".charCodeAt(0);
            velocity =  fitTo255(Math.floor(velocity * -2.55));
        }
        else{
            direction = "0".charCodeAt(0);
            velocity =  fitTo255(Math.floor(velocity*2.55));
        }
        var bytes = new Uint8Array(9);
        bytes[0] = 0;
        bytes[1] = 'M'.charCodeAt(0);
        bytes[2] = portString.charCodeAt(0);
        bytes[3] = direction;
        bytes[4] = velocity;
        for(var i = 5; i<bytes.length;++i) {
            bytes[i] = 0;
        }
        device.write(bytes.buffer);
    };
    ext.setTriLed = function(portnum, rednum, greennum, bluenum){
        var realPort = portnum-1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var realRed = fitTo255(Math.floor(rednum*2.55));
        var realGreen = fitTo255(Math.floor(greennum*2.55));
        var realBlue = fitTo255(Math.floor(bluenum*2.55));

        var bytes = new Uint8Array(9);
        bytes[0] = 0;
        bytes[1] = 'O'.charCodeAt(0);
        bytes[2] = portString.charCodeAt(0);
        bytes[3] = realRed;
        bytes[4] = realGreen;
        bytes[5] = realBlue;
        for(var i = 6; i<bytes.length;++i) {
            bytes[i] = 0;
        }
        device.write(bytes.buffer);
    };

    ext.setLed = function(portNum, intensity){
        var realPort = portNum - 1;
        var portString = realPort.toString();
        var realIntensity = fitTo255(Math.floor(intensity*2.55));
        var bytes = new Uint8Array(9);
        bytes[0] = 0;
        bytes[1] = 'L'.charCodeAt(0);
        bytes[2] = portString.charCodeAt(0);
        bytes[3] = realIntensity;
        for(var i = 4; i<bytes.length;++i) {
            bytes[i] = 0;
        }
        device.write(bytes.buffer);
    };

    ext.setServo = function(portnum, ang){
        var realPort = portnum-1; //convert to zero-indexed number
        var portString = realPort.toString(); //convert to string
        var realAngle = Math.max(Math.min((ang * 1.25), 225.0), 0.0);

        var bytes = new Uint8Array(9);
        bytes[0] = 0;
        bytes[1] = 'S'.charCodeAt(0);
        bytes[2] = portString.charCodeAt(0);
        bytes[3] = realAngle;
        for(var i = 4; i<bytes.length;++i) {
            bytes[i] = 0;
        }
        device.write(bytes.buffer);
    };

    ext.setVibration = function(portnum, intensitynum){
        var realPort = portnum-1; //convert to zero-indexed number
        var portString = realPort.toString(); //convert to string
        var realIntensity = fitTo255(Math.floor(intensitynum*2.55));

        var bytes = new Uint8Array(9);
        bytes[0] = 0;
        bytes[1] = 'V'.charCodeAt(0);
        bytes[2] = portString.charCodeAt(0);
        bytes[3] = realIntensity;
        for(var i = 4; i<bytes.length;++i) {
            bytes[i] = 0;
        }
        device.write(bytes.buffer);
    };

    ext.getTemp = function(port){
        //returns temperature in Celsius degrees
        return Math.floor(((sensorData[port-1]-127)/2.4+25)*100/100);
    };

    ext.getDistance = function(port){
        var reading = sensorvalue[port-1]*4;
        if(reading < 130){
            return 100;
        }
        else { //formula based on mathematical regression
            reading = reading - 120;
            var distance;
            if (reading > 680)
                distance = 5.0;
            else{
                var sensor_val_square = reading*reading;
                distance = sensor_val_square*sensor_val_square*reading*-0.000000000004789
				               + sensor_val_square*sensor_val_square*0.000000010057143
				               - sensor_val_square*reading*0.000008279033021
				               + sensor_val_square*0.003416264518201
				               - reading*0.756893112198934
				               + 90.707167605683000;
            }
            return parseInt(distance);
        }
    };

    ext.getVolt = function(port){
        //returns voltage 0-5V
        return Math.floor(100*sensorData[port-1]/51.0)/100;
    };

    ext.getSound = function(port){
        //sound is already approximately on a 0-100 scale, so it does not need to be scaled
        return sensorData[port-1];
    };

    ext.getRaw = function(port) {
        //converts to 0 to 100 scale
        return Math.floor(sensorData[port-1]/2.55);
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            [" ", "HB motor %m.two , speed %n", "setHummingbirdMotor",1,0],
            [" ", "HB triLED %m.two , R: %n G: %n B: %n", "setTriLed",1,0,100,0],
            [" ", "HB LED %m.port , intensity %n", "setLed",1,50],
            [" ", "HB servo %m.port , angle %n", "setServo",1,90],
            [" ", "HB vibration motor %m.two , speed %n", "setVibration",1,50],
            ["r", "HB temperature on port %m.port", "getHummingbirdTemp",1],
            ["r", "HB sound on port %m.port", "getSound",1],
            ["r", "HB rotary on port %m.port", "getRaw",1],
            ["r", "HB light sensor on port %m.port", "getRaw",1],
            ["r", "HB distance sensor on port %m.port", "getDistance",1],
            ["r", "HB voltage on port %m.port", "getVolt",1]
        ],
        menus: {
            port:['1','2','3','4'],
            two: ['1','2']
        }
    };

    // Register the extension
    ScratchExtensions.register('Hummingbird_Scratch', descriptor, ext, {type: 'hid', vendor: 0x2354, product: 0x2222});
})({});

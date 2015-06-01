(function (ext) {
    var hummingbirdAppID = "lfloofocohhfeeoohpokmljiinfmpenj"; //unique app ID for Hummingbird Scratch App
    //port connecting to chrome app
    var hPort;
    //connection status
    var hStatus = 0;
    //sensor info
    var sensorvalue = new Array(4);
    //when a new message is recieved, save all the info
    var onMsgHummingbird = function (msg) {
        sensorvalue = msg;
    };
    //gets the connection status fo the hummingbird
    var getHummingbirdStatus = function () {
        console.log("status");
        chrome.runtime.sendMessage(hummingbirdAppID, {message: "STATUS"}, function (response) {
            if (response === undefined) { //Chrome app not found
                console.log("Chrome app not found");
                hStatus = 0;
                setTimeout(getHummingbirdStatus, 1000);
            }
            else if (response.status === false) { //Chrome app says not connected
                if (hStatus === 0) {
                    console.log("Not connected");
                    hPort = chrome.runtime.connect(hummingbirdAppID);
                    hPort.onMessage.addListener(onMsgHummingbird);
                }
                hStatus = 1;
                setTimeout(getHummingbirdStatus, 1000);
            }
            else {// successfully connected
                if (hStatus === 0) {
                    console.log("Connected");
                    hPort = chrome.runtime.connect(hummingbirdAppID);
                    hPort.onMessage.addListener(onMsgHummingbird);
                }
                hStatus = 2;
                setTimeout(getHummingbirdStatus, 1000);
            }
        });
    };
    //all the below functions take in a portnum, it is assumed that the port
    //has the appropriate device connected to it. i.e. getDistance(1) assumes
    //a distance sensor is actually connected in port 1. If a different device
    //is connected the information received will not be useful.

    //setters for motors, LEDs, servos, and vibration
    ext.setHummingbirdMotor = function (portnum, velocity) {
        var realPort = portnum - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var direction;
        if (velocity < 0) {
            direction = "1".charCodeAt(0);
            velocity = Math.floor(velocity * -2.55);
        }
        else {
            direction = "0".charCodeAt(0);
            velocity = Math.floor(velocity * 2.55);
        }
        var report = {
            message: "M".charCodeAt(0),
            port: portString.charCodeAt(0),
            dir: direction, //direction
            vel: velocity //speed
        };
        hPort.postMessage(report);
    };

    ext.setTriLed = function (portnum, rednum, greennum, bluenum) {
        var realPort = portnum - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var realRed = Math.floor(rednum * 2.55);
        var realGreen = Math.floor(greennum * 2.55);
        var realBlue = Math.floor(bluenum * 2.55);
        var report = {
            message: "O".charCodeAt(0),
            port: portString.charCodeAt(0),
            red: realRed,
            green: realGreen,
            blue: realBlue
        };
        hPort.postMessage(report);
    };

    ext.setLed = function (portnum, intensitynum) {
        var realPort = portnum - 1;
        var portString = realPort.toString();
        var realIntensity = Math.floor(intensitynum * 2.55);
        var report = {
            message: "L".charCodeAt(0),
            port: portString.charCodeAt(0),
            intensity: realIntensity
        };
        hPort.postMessage(report);
    };

    ext.setServo = function (portnum, ang) {
        var realPort = portnum - 1; //convert to zero-indexed number
        var portString = realPort.toString(); //convert to string
        var realAngle = Math.floor(ang * 2.35);
        var report = {
            message: "S".charCodeAt(0),
            port: portString.charCodeAt(0),
            angle: realAngle
        };
        hPort.postMessage(report);
    };

    ext.setVibration = function (portnum, intensitynum) {
        var realPort = portnum - 1; //convert to zero-indexed number
        var portString = realPort.toString(); //convert to string
        var realIntensity = Math.floor(intensitynum * 2.55);
        var report = {
            message: "V".charCodeAt(0),
            port: portString.charCodeAt(0),
            intensity: realIntensity
        };
        hPort.postMessage(report);
    };

    //getters for sensor information

    ext.getHummingbirdTemp = function (port) {
        //returns temperature in Celsius degrees
        return Math.floor(((sensorvalue[port - 1] - 127) / 2.4 + 25) * 100 / 100);
    };

    ext.getDistance = function (port) {
        var reading = sensorvalue[port - 1] * 4;
        if (reading < 130) {
            return 100;
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
            return parseInt(distance);
        }
    };

    ext.getVolt = function (port) {
        //returns voltage 0-5V
        return Math.floor(100 * sensorvalue[port - 1] / 51.0) / 100;
    };

    ext.getSound = function (port) {
        //sound is already approximately on a 0-100 scale, so it does not need to be scaled
        return sensorvalue[port - 1];
    };

    ext.getRaw = function (port) {
        //converts to 0 to 100 scale
        return Math.floor(sensorvalue[port - 1] / 2.55);
    };

    ext.hSpeak = function (phrase) {
        //uses Chrome text to speech API to speak the phrase
        var report = {message: "SPEAK", val: phrase};
        hPort.postMessage(report);
    };

    ext._shutdown = function () {
        //sends disconnect to Hummingbird
        var report = {message: "R".charCodeAt(0)};
        hPort.postMessage(report);
    };

    ext.resetAll = function () {
        //sends reset to Hummingbird
        var report = {message: "X".charCodeAt(0)};
        hPort.postMessage(report);
    };

    ext._getStatus = function () {
        var currStatus = hStatus;
        if (currStatus === 2)
            return {status: 2, msg: 'Connected'};
        else if (currStatus === 1)
            return {status: 1, msg: 'Hummingbird Not Connected'};
        else
            return {status: 0, msg: 'Chrome App Not Connected'};
    };

    var descriptor = {
        blocks: [
            [' ', "HB motor %m.two , speed %n", "setHummingbirdMotor", 1, 0],
            [' ', "HB triLED %m.two , R: %n G: %n B: %n", "setTriLed", 1, 0, 100, 0],
            [' ', "HB LED %m.port , intensity %n", "setLed", 1, 50],
            [' ', "HB servo %m.port , angle %n", "setServo", 1, 90],
            [' ', "HB vibration motor %m.two , speed %n", "setVibration", 1, 50],
            [' ', "Speak %s", "hSpeak", "Hello World!"],
            ['r', "HB temperature on port %m.port", "getHummingbirdTemp", 1],
            ['r', "HB sound on port %m.port", "getSound", 1],
            ['r', "HB rotary on port %m.port", "getRaw", 1],
            ['r', "HB light sensor on port %m.port", "getRaw", 1],
            ['r', "HB distance sensor on port %m.port", "getDistance", 1],
            ['r', "HB voltage on port %m.port", "getVolt", 1]
        ],
        menus: {
            port: ['1', '2', '3', '4'],
            two: ['1', '2']
        },
        url: 'http://hummingbirdkit.com/learning/scratch-20-programming'
    };
    getHummingbirdStatus();
    ScratchExtensions.register('Hummingbird', descriptor, ext);
})({});
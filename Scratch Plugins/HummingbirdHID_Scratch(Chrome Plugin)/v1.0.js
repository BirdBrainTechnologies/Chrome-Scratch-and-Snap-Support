(function () {
    var LED_COUNT = 4;
    var hummingbirdAppID = "lfloofocohhfeeoohpokmljiinfmpenj"; //unique app ID for Hummingbird Scratch App
    //port connecting to chrome app
    var hPort;
    //connection status
    var hStatus = 0;
    //whether or not this is a dup
    var isDuo;
    //sensor info
    var sensorvalue = new Array(4);
    //when a new message is recieved, save all the info
    var triLEDs = {};
    var motors = {};
    var LEDs = {};
    var servos = {};
    var vibrations = {};
    var onMsgHummingbird = function (msg) {
        if (msg.sensors !== undefined) {
            sensorvalue = msg.sensors;
        } else {
            console.log(msg);
        }
        if (msg.motor !== undefined) {
            if (msg.motor.velocity === motors[msg.motor.port]) {
                delete motors[msg.motor.port];
            } else {
                sendMotorMessage(msg.motor.port, motors[msg.motor.port]);
            }
        }
        if (msg.triLED !== undefined) {
            if (JSON.stringify(msg.triLED.intensities) === JSON.stringify(triLEDs[msg.triLED.port])) {
                delete triLEDs[msg.triLED.port];
            } else {
                sendTriLEDMessage(msg.triLED.port, triLEDs[msg.triLED.port]);
            }
        }
        if (msg.LED !== undefined) {
            if (JSON.stringify(msg.LED.intensity) === LEDs[msg.LED.port]) {
                delete LEDs[msg.LED.port];
            } else {
                sendLEDMessage(msg.LED.port, LEDs[msg.LED.port]);
            }
        }
        if (msg.vibration !== undefined) {
            if (msg.vibration.intensity === vibrations[msg.vibration.port]) {
                delete vibrations[msg.vibration.port];
            } else {
                sendVibrationMessage(msg.vibration.port, vibrations[msg.vibration.port]);
            }
        }
        if (msg.servo !== undefined) {
            if (msg.servo.angle === servos[msg.servo.port]) {
                delete servos[msg.servo.port];
            } else {
                sendServoMessage(msg.servo.port, servos[msg.servo.port]);
            }
        }
    };

    function sendMotorMessage(port, velocity) {
        hPort.postMessage({
            message: "MOTOR",
            port: port,
            velocity: velocity
        });
    }

    function sendTriLEDMessage(port, intensities) {
        hPort.postMessage({
            message: "TRILED",
            port: port,
            intensities: intensities
        });
    }

    function sendLEDMessage(port, intensity) {
        hPort.postMessage({
            message: "LED",
            port: port,
            intensity: intensity
        });
    }

    function sendServoMessage(port, angle) {
        hPort.postMessage({
            message: "SERVO",
            port: port,
            angle: angle
        });
    }

    function sendVibrationMessage(port, intensity) {
        hPort.postMessage({
            message: "VIBRATION",
            port: port,
            intensity: intensity
        });
    }

    var constrain = function (min, n, max) {
        return Math.max(min, Math.min(n, max));
    }

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
                if (hStatus !== 1) {
                    console.log("Not connected");
                    hPort = chrome.runtime.connect(hummingbirdAppID);
                    hPort.onMessage.addListener(onMsgHummingbird);
                }
                hStatus = 1;
                setTimeout(getHummingbirdStatus, 1000);
            }
            else {// successfully connected
                if (hStatus !==2) {
                    console.log("Connected");
                    isDuo = response.duo;
                    console.log("isDuo: " + isDuo);
                    hPort = chrome.runtime.connect(hummingbirdAppID);
                    hPort.onMessage.addListener(onMsgHummingbird);
                    console.log(hPort.onMessage);
                }
                hStatus = 2;
                setTimeout(getHummingbirdStatus, 1000);
            }
        });
    };

    var setOutput = function (argumentHandler, cache, messageSender) {
        var timeouts = {};
        return function (portnum) {
            var realPort = portnum - 1;

            var args = argumentHandler(arguments);

            if (cache[realPort] === undefined) {
                messageSender.apply(this, [realPort, args]);
            }

            cache[realPort] = args;

            if (timeouts[realPort]) {
                clearTimeout(timeouts[realPort]);
                delete timeouts[realPort];
            }

            timeouts[realPort] = setTimeout(function() {
                delete cache[realPort];
                delete timeouts[realPort];
            }, 300);
        };
    };

    var ext = {
        //all the below functions take in a portnum, it is assumed that the port
        //has the appropriate device connected to it. i.e. getDistance(1) assumes
        //a distance sensor is actually connected in port 1. If a different device
        //is connected the information received will not be useful.

        //setters for motors, LEDs, servos, and vibration
        setHummingbirdMotor: setOutput(function (portnum, velocity) {
            return constrain(-255, Math.round(velocity * 2.55), 255);
        }, motors, sendMotorMessage),
        setTriLed: setOutput(function (portnum, rednum, greennum, bluenum) {
            return [rednum, greennum, bluenum].map(function(intensity) {
                return Math.floor(Math.max(Math.min(intensity*2.55, 255), 0));
            });
        }, triLEDs, sendTriLEDMessage),
        setLed: setOutput(function (portnum, intensitynum) {
            return constrain(0, Math.floor(intensitynum * 2.55), 255);
        }, LEDs, sendLEDMessage),
        setServo: setOutput(function (portnum, ang) {
            return constrain(0, ang * 1.25, 255);
        }, servos, sendServoMessage),
        setVibration: setOutput(function (portnum, intensitynum) {
            return constrain(0, Math.floor(intensitynum * 2.55), 255);
        }, vibrations, sendVibrationMessage),

        //getters for sensor information
        getHummingbirdTemp: function (port) {
            //returns temperature in Celsius degrees
            return Math.floor(((sensorvalue[port - 1] - 127) / 2.4 + 25) * 100 / 100);
        },
        getDistance: function (port) {
            var reading;
            var polynomial;
            if (isDuo){
                reading = sensorvalue[port - 1] * 4;
                if (reading < 130) {
                    return 100;
                }
                reading = reading - 120;
                if (reading > 680) {
                    return 5;
                }
                polynomial = [
                    +90.707167605683000,
                    -0.756893112198934,
                    +0.003416264518201,
                    -0.000008279033021,
                    +0.000000010057143,
                    -0.000000000004789
                ];
            }
            else{
                reading = sensorvalue[port-1];
                if(reading < 23){
                    return 80;
                }
                polynomial = [
                    +206.76903754529479,
                    -9.3402257299483011,
                    +0.19133513242939543,
                    -0.0019720997497951645,
                    +9.9382154479167215*Math.pow(10, -6),
                    -1.9442731496914311*Math.pow(10, -8)
                ];
            }
            var distance = 0;
            // Evaluate ax^5 + bx^4 + cx^3  dx^2 + ex + f
            for (var i = 0; i < 6; i++) {
                distance += Math.pow(reading, i) * polynomial[i];
            }
            return Math.floor(distance);
        },
        getVolt: function (port) {
            //returns voltage 0-5V
            return Math.floor(100 * sensorvalue[port - 1] / 51.0) / 100;
        },
        getSound: function (port) {
            //sound is already approximately on a 0-100 scale, so it does not need to be scaled
            return sensorvalue[port - 1];
        },
        getRaw: function (port) {
            //converts to 0 to 100 scale
            return Math.floor(sensorvalue[port - 1] / 2.55);
        },
        getRotary: function (port) {
            return ext.getRaw(port);
        },
        getLight: function (port) {
            return ext.getRaw(port);
        },
        hSpeak: function (phrase) {
            //uses Chrome text to speech API to speak the phrase
            var report = {message: "SPEAK", val: phrase};
            hPort.postMessage(report);
        },
        _shutdown: function () {
            //sends disconnect to Hummingbird
            var report = {message: "R".charCodeAt(0)};
            chrome.runtime.sendMessage(hummingbirdAppID, report);
        },
        resetAll: function () {
            //sends reset to Hummingbird
            var report = {message: "X".charCodeAt(0)};
            chrome.runtime.sendMessage(hummingbirdAppID, report);
            
            for (var i = 1; i <= LED_COUNT; i++) { // LEDs are 1-indexed for this function
                ext.setLed(i, 0);
            }
        },
        _getStatus: function () {
            var currStatus = hStatus;
            if (currStatus === 2)
                return {status: 2, msg: 'Connected'};
            else if (currStatus === 1)
                return {status: 1, msg: 'Hummingbird Not Connected'};
            else
                return {status: 0, msg: 'Chrome App Not Connected'};
        }
    }

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
            ['r', "HB rotary on port %m.port", "getRotary", 1],
            ['r', "HB light sensor on port %m.port", "getLight", 1],
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
})();

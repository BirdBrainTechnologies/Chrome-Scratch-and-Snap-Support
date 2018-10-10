(function () {
    finchAppID = "ojocioejjpmeccjfjlhkepchminjemod"; //unique app ID for Finch Scratch App
    //port connecting to chrome app
    var fPort;

    //sensor info
    var sensors = {
        temperature: null,
        obstacles: new Array(2),
        lights: new Array(2),
        acceleration: new Array(3)
    }

    //connection status
    var fStatus = 0;


    var moveSpeeds = null;
    function sendMotorMessage(speeds) {
        fPort.postMessage({
            message: "MOTOR",
            speeds: speeds
        });
    }

    var LEDs = null;
    function sendLEDMessage(values) {
        fPort.postMessage({
            message: "LED",
            values: values
        });
    }
    var buzzer = null;
    function sendBuzzerMessage(value) {
        fPort.postMessage({
            message: "BUZZER",
            value: value
        });
    }

    //when a new message is recieved, save all the info
    var onMsgFinch = function (msg) {
        if (msg.sensors !== undefined) {
            sensors = msg.sensors;
        } else {
            console.log(msg);
        }
        if (msg.moveSpeeds !== undefined) {
            if (JSON.stringify(msg.moveSpeeds) === JSON.stringify(moveSpeeds)) {
                moveSpeeds = null;
            } else {
                sendMotorMessage(moveSpeeds);
            }
        }
        if (msg.LEDs !== undefined) {
            if (JSON.stringify(msg.LEDs) === JSON.stringify(LEDs)) {
                LEDs = null;
            } else {
                sendLEDMessage(LEDs);
            }
        }
        if (msg.buzzer !== undefined) {
            if (JSON.stringify(msg.buzzer) === JSON.stringify(buzzer)) {
                buzzer = null;
            } else {
                sendBuzzerMessage(buzzer);
            }
        }
    };

    function fitTo255(num) {
        return Math.max(Math.min(num,255.0),0.0);
    }

    //gets the connection status of the finch
    var getFinchStatus = function () {
        chrome.runtime.sendMessage(finchAppID, {message: "STATUS"}, function (response) {
            if (response === undefined) { //Chrome app not found
                fStatus = 0;
                console.log("Chrome app not found");
                setTimeout(getFinchStatus, 1000);
            }
            else if (response.status === false) { //Chrome app says not connected
                if (fStatus === 0) {
                    console.log("Not connected");
                    fPort = chrome.runtime.connect(finchAppID);
                    fPort.onMessage.addListener(onMsgFinch);
                }
                fStatus = 1;
                setTimeout(getFinchStatus, 1000);
            }
            else { // successfully connected
                if (fStatus === 0) {
                    console.log("Connected");
                    fPort = chrome.runtime.connect(finchAppID);
                    fPort.onMessage.addListener(onMsgFinch);
                }
                fStatus = 2;
                setTimeout(getFinchStatus, 1000);
            }
        });
    };
    var ext = {
        //sets the motor speed
        setFinchMotor: function(left, right) {
            var speeds = [fitTo255(Math.round(left * 2.55)), fitTo255(Math.round(right * 2.55))];

            if (moveSpeeds === null) {
              sendMotorMessage(speeds);
            }

            moveSpeeds = speeds;
        },
        //sets the LED color
        setLED: function(red, green, blue) {
            var values = [fitTo255(Math.round(red * 2.55)), fitTo255(Math.round(green * 2.55)), fitTo255(Math.round(blue * 2.55))];

            if (LEDs === null) {
                sendLEDMessage(values);
            }

            LEDs = values;
        },
        //starts the buzzer at a certain frequency for a certain number of milliseconds
        setBuzzer: function(freq, time) {
            function constrain(n) {
                return Math.max(Math.min(n, 0xFFFF), 0);
            }
            var value = {
                freq: constrain(Math.round(freq)),
                time: constrain(Math.round(time))
            };

            if (buzzer === null) {
                sendBuzzerMessage(value);
            }

            buzzer = value;
        },


        //the below functions return the sensor information of the finch
        getFinchTemp: function () {
            //returns temperature in Celsius degrees
            return sensors.temperature;
        },

        getLeftObstacle: function () {
            return sensors.obstacles[0] !== 0;
        },

        getRightObstacle: function () {
            return sensors.obstacles[1] !== 0;
        },

        getLeftLight: function () {
            return sensors.lights[0];
        },

        getRightLight: function () {
            return sensors.lights[1];
        },

        getXAcceleration: function () {
            return sensors.acceleration[0];
        },

        getYAcceleration: function () {
            return sensors.acceleration[1];
        },

        getZAcceleration: function () {
            return sensors.acceleration[2];
        },
        //calculates the orientation of the finch
        getOrientation: function () {
            if (sensors.acceleration[0] > -0.5 && sensors.acceleration[0] < 0.5) {
                if (sensors.acceleration[1] < 0.5 && sensors.acceleration[1] > -0.5) {
                    if (sensors.acceleration[2] > 0.65 && sensors.acceleration[2] < 1.5)
                        return "level";
                    else if (sensors.acceleration[2] > -1.5 && sensors.acceleration[2] < -0.65)
                        return "upside down";
                }
                else if (sensors.acceleration[2] > -0.5 && sensors.acceleration[2] < 0.5) {
                    if (sensors.acceleration[1] > 0.7 && sensors.acceleration[1] < 1.5)
                        return "left wing down";
                    else if (sensors.acceleration[1] > -1.5 && sensors.acceleration[1] < -0.7)
                        return "right wing down";
                }
            }
            else if (sensors.acceleration[1] > -0.3 && sensors.acceleration[1] < 0.3
                  && sensors.acceleration[2] > -0.3 && sensors.acceleration[2] < 0.3) {
                if (sensors.acceleration[0] < 1.5 && sensors.acceleration[0] > 0.8)
                    return "beak down";
                else if (sensors.acceleration[0] < -0.8 && sensors.acceleration[0] > -1.5)
                    return "beak up";
            }
            else
                return "in between";
        },
        fSpeak: function (phrase) {
            //uses Chrome text to speech API to speak the phrase
            var report = {message: "SPEAK", val: phrase};
            fPort.postMessage(report);
        },

        _shutdown: function () {
            //sends disconnect to Finch
            var report = {message: "R".charCodeAt(0)};
            fPort.postMessage(report);
        },

        resetAll: function () {
            //sends reset to Finch
            var report = {message: "X".charCodeAt(0)};
            fPort.postMessage(report);
            report = {message: "SPEAK", val: ""};
            fPort.postMessage(report);

        },


        _getStatus: function () {
            var currStatus = fStatus;
            if (currStatus === 2)
                return {status: 2, msg: 'Connected'};
            else if (currStatus === 1)
                return {status: 1, msg: 'Finch Not Connected'};
            else
                return {status: 0, msg: 'Chrome App Not Connected'};
        },

    }

    var descriptor = {
        "blocks": [
            [" ", "Move Finch left: %n right: %n", "setFinchMotor", 0, 0],
            [" ", "Finch buzz at %n Hz for %n ms", "setBuzzer", 440, 500],
            [" ", "Finch LED color R: %n G: %n B: %n", "setLED", 0, 0, 0],
            [" ", "Speak %s", "fSpeak", "Hello World!"],
            ["r", "Finch temperature", "getFinchTemp"],
            ["r", "Finch left obstacle", "getLeftObstacle"],
            ["r", "Finch right obstacle", "getRightObstacle"],
            ["r", "Finch left light", "getLeftLight"],
            ["r", "Finch right light", "getRightLight"],
            ["r", "Finch X acceleration", "getXAcceleration"],
            ["r", "Finch Y acceleration", "getYAcceleration"],
            ["r", "Finch Z acceleration", "getZAcceleration"],
            ["r", "Finch Orientation", "getOrientation"]
        ]
    };

    getFinchStatus();
    ScratchExtensions.register('Finch', descriptor, ext);
})();

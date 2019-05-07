(function (ext) {
    alert("This ScratchX project is out of date. If you have reached this page from a link or bookmark, please open ScratchX from the Finch Connection App. If you reached this page from the Finch Connection App, please update the app in the Chrome Web Store.");
    finchAppID = "ojocioejjpmeccjfjlhkepchminjemod"; //unique app ID for Finch Scratch App
    //port connecting to chrome app
    var fPort;

    //sensor info
    var temperature;
    var obstacle = new Array(2);
    var lights = new Array(2);
    var acceleration = new Array(3);

    //connection status
    var fStatus = 0;

    //when a new message is recieved, save all the info
    var onMsgFinch = function (msg) {
        temperature = msg.temperature;
        obstacle[0] = msg.obs1;
        obstacle[1] = msg.obs2;
        lights[0] = msg.light1;
        lights[1] = msg.light2;
        acceleration[0] = msg.xAcc;
        acceleration[1] = msg.yAcc;
        acceleration[2] = msg.zAcc;
    };
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
    //sets the motor speed
    ext.setFinchMotor = function (left, right) {
        var ldir = 0;
        var rdir = 0;
        if (left < 0) {
            ldir = 1;
            left = -1 * left;
        }
        if (right < 0) {
            rdir = 1;
            right = -1 * right;
        }

        var report = {
            message: "M".charCodeAt(0),
            leftdirection: ldir,
            leftspeed: Math.floor(left * 2.55),
            rightdirection: rdir,
            rightspeed: Math.floor(right * 2.55)
        };
        fPort.postMessage(report);
    };
    //sets the LED color
    ext.setLED = function (rednum, greennum, bluenum) {
        var report = {
            message: "O".charCodeAt(0),
            red: Math.floor(rednum * 2.55),
            green: Math.floor(greennum * 2.55),
            blue: Math.floor(bluenum * 2.55)
        };
        fPort.postMessage(report);
    };
    //starts the buzzer at a certain frequency for a certain number of milliseconds
    ext.setBuzzer = function (freq, time) {
        var fOne = (freq >>> 8) & 0xFF;
        var fTwo = freq & 0xFF;
        var tOne = (time >>> 8) & 0xFF;
        var tTwo = time & 0xFF;
        var report = {
            message: "B".charCodeAt(0),
            timefirst: tOne,
            timesecond: tTwo,
            freqfirst: fOne,
            freqsecond: fTwo
        };
        fPort.postMessage(report);
    };

    //the below functions return the sensor information of the finch
    ext.getFinchTemp = function () {
        //returns temperature in Celsius degrees
        return temperature;
    };

    ext.getLeftObstacle = function () {
        var result = obstacle[0];
        return result !== 0;
    };

    ext.getRightObstacle = function () {
        var result = obstacle[1];
        return result !== 0;
    };

    ext.getLeftLight = function () {
        return lights[0];
    };

    ext.getRightLight = function () {
        return lights[1];
    };

    ext.getXAcceleration = function () {
        return acceleration[0];
    };

    ext.getYAcceleration = function () {
        return acceleration[1];
    };

    ext.getZAcceleration = function () {
        return acceleration[2];
    };
    //calculates the orientation of the finch
    ext.getOrientation = function () {
        if (acceleration[0] > -0.5 && acceleration[0] < 0.5 && acceleration[1] < 0.5 && acceleration[1] > -0.5 && acceleration[2] > 0.65 && acceleration[2] < 1.5)
            return "level";
        else if (acceleration[0] > -0.5 && acceleration[0] < 0.5 && acceleration[1] < 0.5 && acceleration[1] > -0.5 && acceleration[2] > -1.5 && acceleration[2] < -0.65)
            return "upside down";
        else if (acceleration[0] < 1.5 && acceleration[0] > 0.8 && acceleration[1] > -0.3 && acceleration[1] < 0.3 && acceleration[2] > -0.3 && acceleration[2] < 0.3)
            return "beak down";
        else if (acceleration[0] < -0.8 && acceleration[0] > -1.5 && acceleration[1] > -0.3 && acceleration[1] < 0.3 && acceleration[2] > -0.3 && acceleration[2] < 0.3)
            return "beak up";
        else if (acceleration[0] > -0.5 && acceleration[0] < 0.5 && acceleration[1] > 0.7 && acceleration[1] < 1.5 && acceleration[2] > -0.5 && acceleration[2] < 0.5)
            return "left wing down";
        else if (acceleration[0] > -0.5 && acceleration[0] < 0.5 && acceleration[1] > -1.5 && acceleration[1] < -0.7 && acceleration[2] > -0.5 && acceleration[2] < 0.5)
            return "right wing down";
        else
            return "in between";
    };
    ext.fSpeak = function (phrase) {
        //uses Chrome text to speech API to speak the phrase
        var report = {message: "SPEAK", val: phrase};
        fPort.postMessage(report);
    };

    ext._shutdown = function () {
        //sends disconnect to Finch
        var report = {message: "R".charCodeAt(0)};
        fPort.postMessage(report);
    };

    ext.resetAll = function () {
        //sends reset to Finch
        var report = {message: "X".charCodeAt(0)};
        fPort.postMessage(report);
        report = {message: "SPEAK", val: ""};
        fPort.postMessage(report);

    };


    ext._getStatus = function () {
        var currStatus = fStatus;
        if (currStatus === 2)
            return {status: 2, msg: 'Connected'};
        else if (currStatus === 1)
            return {status: 1, msg: 'Finch Not Connected'};
        else
            return {status: 0, msg: 'Chrome App Not Connected'};
    };

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
})({});

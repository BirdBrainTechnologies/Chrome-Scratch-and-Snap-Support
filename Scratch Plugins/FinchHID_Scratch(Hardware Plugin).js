(function() {
    var sensor_nums = {   temperature: 0,
        light1: 0,
        light2: 0,
        xAcc: 0,
        yAcc: 0,
        zAcc: 0,
        obs1: 0,
        obs2: 0
    };

    var device = null;
    var pollerRec = null;
    var pollerSend = null;
    var ext = this;

    ext._deviceConnected = function(dev) {
        if(device) return;

        device = dev;
        device.open();

        pollerSend = setInterval(function() {
            var bytes = new Uint8Array(9);
            bytes[0] = 0;
            bytes[1] = "L".charCodeAt(0);
            bytes[8] = "L".charCodeAt(0);
            device.write(bytes.buffer);

            bytes[0] = 0;
            bytes[1] = "T".charCodeAt(0);
            bytes[8] = "T".charCodeAt(0);
            device.write(bytes.buffer);

            bytes[0] = 0;
            bytes[1] = "A".charCodeAt(0);
            bytes[8] = "A".charCodeAt(0);
            device.write(bytes.buffer);

            bytes[0] = 0;
            bytes[1] = "I".charCodeAt(0);
            bytes[8] = "I".charCodeAt(0);
            device.write(bytes.buffer);
        }, 10);

        pollerRec = setInterval(function(){
            parseRead(device.read(8));
        }, 5);

    };
    var parseRead = function(rawData) {
        var data_array = new Uint8Array(rawData);
        if (data_array[7] === "T".charCodeAt()) {
            sensor_nums.temperature = Math.round(((data_array[0] - 127) / 2.4 + 25) * 10) / 10;
        }
        else if (data_array[7] === "L".charCodeAt()) {
            sensor_nums.light1 = Math.round(data_array[0] / 2.55);
            sensor_nums.light2 = Math.round(data_array[1] / 2.55);
        }
        else if (data_array[7] === "I".charCodeAt()) {
            sensor_nums.obs1 = data_array[0];
            sensor_nums.obs2 = data_array[1];
        }
        else if (data_array[0] === 153) {
            var newdata = Array(3);
            for (var i = 1; i < 4; i++) {
                if (data_array[i] > 0x1F)
                    newdata[i - 1] = (data_array[i] - 64) / 32 * 1.5;
                else
                    newdata[i - 1] = data_array[i] / 32 * 1.5;
            }
            sensor_nums.xAcc = Math.round(newdata[0] * 10) / 10;
            sensor_nums.yAcc = Math.round(newdata[1] * 10) / 10;
            sensor_nums.zAcc = Math.round(newdata[2] * 10) / 10;
        }
    };
    ext._deviceRemoved = function(dev) {
        if(device != dev) return;
        device = null;
        stopPolling();
    };

    function stopPolling() {
        if(pollerRec) clearInterval(pollerRec);
        if(pollerSend) clearInterval(pollerSend);
        pollerRec = null;
        pollerSend = null;
    }

    ext._shutdown = function() {
        stopPolling();

        if(device) {
            var bytes = new Uint8Array(8);
            bytes[0] = 0;
            bytes[1] = "X".charCodeAt(0);
            for(var i = 2;i<bytes.length;i++){
                bytes[i] = 0;
            }
            device.write(bytes.buffer);
            device.close();
        }
        device = null;
    };

    ext._getStatus = function() {
        if(!device) return {status: 1, msg: 'Finch disconnected'};
        return {status: 2, msg: 'Finch connected'};
    };

    ext.setLED = function(rednum,greennum,bluenum) {
        var bytes = new Uint8Array(8);
        bytes[1] = "O".charCodeAt(0);
        bytes[2] = Math.floor(rednum*2.55);
        bytes[3] = Math.floor(greennum*2.55);
        bytes[4] = Math.floor(bluenum*2.55);
        for (var i = 5; i < bytes.length; ++i) {
            bytes[i] = 0;
        }
        bytes[0] = 0;
        device.write(bytes.buffer);
    };

    ext.setBuzzer = function(freq, time) {
        var fOne = (freq >>> 8) & 0xFF;
        var fTwo = freq & 0xFF;
        var tOne = (time >>> 8) & 0xFF;
        var tTwo = time & 0xFF;
        var bytes = new Uint8Array(8);
        bytes[0] = 0;
        bytes[1] = "B".charCodeAt(0);
        bytes[2] = tOne;
        bytes[3] = tTwo;
        bytes[4] = fOne;
        bytes[5] = fTwo;
        device.write(bytes.buffer);
    };

    ext.setFinchMotor = function(left,right){
        var ldir = 0;
        var rdir = 0;
        if(left < 0) {
            ldir = 1;
            left = -1*left;
        }
        if(right < 0) {
            rdir = 1;
            right = -1*right;
        }
        var bytes = new Uint8Array(8);
        bytes[0] = 0;
        bytes[1] = "M".charCodeAt(0);
        bytes[2] = ldir;
        bytes[3] = Math.floor(left*2.55);
        bytes[4] = rdir;
        bytes[5] = Math.floor(right*2.55);
        device.write(bytes.buffer);
    };
    ext.getFinchTemp = function(){
        //returns temperature in Celsius degrees
        return sensor_nums.temperature;
    };

    ext.getLeftObstacle = function(){
        var result = sensor_nums.obs1;
        return result !== 0;
    };

    ext.getRightObstacle = function(){
        var result = sensor_nums.obs2;
        return result !== 0;
    };

    ext.getLeftLight = function(){
        return sensor_nums.light1;
    };

    ext.getRightLight = function(){
        return sensor_nums.light2;
    };

    ext.getXAcceleration = function(){
        return sensor_nums.xAcc;
    };

    ext.getYAcceleration = function(){
        return sensor_nums.yAcc;
    };

    ext.getZAcceleration = function(){
        return sensor_nums.zAcc;
    };
    ext.getOrientation = function(){
        if(sensor_nums.xAcc > -0.5 && sensor_nums.xAcc < 0.5 && sensor_nums.yAcc < 0.5 && sensor_nums.yAcc > -0.5 && sensor_nums.zAcc > 0.65 && sensor_nums.zAcc < 1.5)
            return "level";
        else if(sensor_nums.xAcc > -0.5 && sensor_nums.xAcc < 0.5 && sensor_nums.yAcc < 0.5 && sensor_nums.yAcc > -0.5 && sensor_nums.zAcc > -1.5 && sensor_nums.zAcc < -0.65)
            return "upside down";
        else if(sensor_nums.xAcc < 1.5 && sensor_nums.xAcc > 0.8 && sensor_nums.yAcc >-0.3 && sensor_nums.yAcc < 0.3 && sensor_nums.zAcc > -0.3 && sensor_nums.zAcc < 0.3)
            return "beak down";
        else if(sensor_nums.xAcc < -0.8 && sensor_nums.xAcc > -1.5 && sensor_nums.yAcc >-0.3 && sensor_nums.yAcc < 0.3 && sensor_nums.zAcc > -0.3 && sensor_nums.zAcc < 0.3)
            return "beak up";
        else if(sensor_nums.xAcc > -0.5 && sensor_nums.xAcc < 0.5 && sensor_nums.yAcc > 0.7 && sensor_nums.yAcc < 1.5 && sensor_nums.zAcc > -0.5 && sensor_nums.zAcc < 0.5)
            return "left wing down";
        else if(sensor_nums.xAcc > -0.5 && sensor_nums.xAcc < 0.5 && sensor_nums.yAcc > -1.5 && sensor_nums.yAcc < -0.7 && sensor_nums.zAcc > -0.5 && sensor_nums.zAcc < 0.5)
            return "right wing down";
        else
            return "in between";
    };
    var descriptor = {
        blocks: [
            [" ", "Move Finch left: %n right: %n", "setFinchMotor",0,0],
            [" ", "Finch buzz at %n Hz for %n ms", "setBuzzer",440,500],
            [" ", "Finch LED color R: %n G: %n B: %n", "setLED",0,0,0],
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
    ScratchExtensions.register('Finch_Scratch', descriptor, ext, {type: 'hid', vendor:0x2354, product:0x1111});
})();

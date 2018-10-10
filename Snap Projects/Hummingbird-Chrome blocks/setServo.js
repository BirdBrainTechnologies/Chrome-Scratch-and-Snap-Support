var hummingbirdAppID = "lfloofocohhfeeoohpokmljiinfmpenj";
var realPort = portnum-1;
////////////////////////////////////////////////////////////////////////////////
// In order to avoid sending more messages than the app can handle, whenever we
// send a message we also save it in a persistent global variable. When the
// message is processed in the app, the callback checks if the global variable
// still matches what it was changed to. If it was, it deletes the global
// variable. Otherwise the message is resent with new data.
//
// When this block is called it checks if the global value has been set. If it
// has, it sends a message. Otherwise it just updates the value and lets the
// callback handle it.


// We can't run code beforehand to define values so we must check each block
// call if they are set.
if (window.birdbrain === undefined || window.birdbrain.servos === undefined) {
    window.birdbrain = window.birdbrain || {};
    window.birdbrain.servos = {
        // By attaching this function to a global variable, it is only
        // defined once instead of every time this block is called, improving
        // performance significantly.
        setServoAngle: function (port, angle) {
            function callback() {
                if (window.birdbrain.servos[port] === angle) {
                    delete window.birdbrain.servos[port];
                }
                else {
                    window.birdbrain.servos.setServoAngle(port, window.birdbrain.servos[port]);
                }
            }
            var report = {
                message: "S".charCodeAt(0),
                port: port.toString().charCodeAt(0),
                angle: angle
            };
            chrome.runtime.sendMessage(hummingbirdAppID, report, callback);
        }
    };
}

var realAngle = Math.floor(ang*1.25);

realAngle = Math.max(Math.min(realAngle,225.0),0.0);

if (window.birdbrain.servos[realPort] === undefined) {
    window.birdbrain.servos.setServoAngle(realPort, realAngle);
}

window.birdbrain.servos[realPort] = realAngle;

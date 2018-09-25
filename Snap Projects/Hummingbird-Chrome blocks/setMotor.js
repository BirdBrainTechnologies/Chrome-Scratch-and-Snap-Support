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
if (window.birdbrain === undefined || window.birdbrain.motors === undefined) {
    window.birdbrain = window.birdbrain || {};
    window.birdbrain.motors = {
        // By attaching this function to a global variable, it is only
        // defined once instead of every time this block is called, improving
        // performance significantly.
        setMotorVelocity: function (port, velocity) {
            function callback() {
                if (window.birdbrain.motors[port] === velocity) {
                    delete window.birdbrain.motors[port];
                }
                else {
                    window.birdbrain.motors.setMotorVelocity(port, window.birdbrain.motors[port]);
                }
            }
            var report = {
                message: "M".charCodeAt(0),
                port: port.toString().charCodeAt(0),
                direction: (velocity < 0 ? 1 : 0).toString().charCodeAt(0),
                velocity: Math.abs(velocity)
            };
            chrome.runtime.sendMessage(hummingbirdAppID, report, callback);
        }
    };
}

var realVelocity = Math.floor(velocity*2.55);

realVelocity = Math.max(Math.min(realVelocity,255), -255);

if (window.birdbrain.motors[realPort] === undefined) {
  window.birdbrain.motors.setMotorVelocity(realPort, realVelocity);
}

window.birdbrain.motors[realPort] = realVelocity;
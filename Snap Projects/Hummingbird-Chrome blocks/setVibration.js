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
if (window.birdbrain === undefined || window.birdbrain.vibrations === undefined) {
    window.birdbrain = window.birdbrain || {};
    window.birdbrain.vibrations = {
        // By attaching this function to a global variable, it is only
        // defined once instead of every time this block is called, improving
        // performance significantly.
        setServoIntensity: function (port, intensity) {
            function callback() {
                if (window.birdbrain.vibrations[port] === intensity) {
                    delete window.birdbrain.vibrations[port];
                }
                else {
                    window.birdbrain.vibrations.setServoIntensity(port, window.birdbrain.vibrations[port]);
                }
            }
            var report = {
                message: "V".charCodeAt(0),
                port: port.toString().charCodeAt(0),
                intensity: intensity
            };
            chrome.runtime.sendMessage(hummingbirdAppID, report, callback);
        }
    };
}

var realIntensity = Math.floor(intensitynum*2.55);

realIntensity = Math.max(Math.min(realIntensity,255.0),0.0);

if (window.birdbrain.vibrations[realPort] === undefined) {
  window.birdbrain.vibrations.setServoIntensity(realPort, realIntensity);
}

window.birdbrain.vibrations[realPort] = realIntensity;
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
if (window.birdbrain === undefined || window.birdbrain.triLEDs === undefined) {
    window.birdbrain = window.birdbrain || {};
    window.birdbrain.triLEDs = {
        // By attaching this function to a global variable, it is only
        // defined once instead of every time this block is called, improving
        // performance significantly.
        setLEDIntensities: function(port, intensities) {
            function callback() {
                if (JSON.stringify(window.birdbrain.triLEDs[port]) === JSON.stringify(intensities)) {
                    delete window.birdbrain.triLEDs[port];
                }
                else {
                    window.birdbrain.triLEDs.setLEDIntensities(port, window.birdbrain.triLEDs[port]);
                }
            }

            var report = {
                message:"O".charCodeAt(0),
                port: port.toString().charCodeAt(0),
                red: intensities[0],
                green: intensities[1],
                blue: intensities[2]
            };
            chrome.runtime.sendMessage(hummingbirdAppID, report, callback);
        }
    }
}

var realIntensities = [rednum, greennum, bluenum].map(function(intensity) {
    return Math.floor(Math.max(Math.min(intensity*2.55, 255), 0));
});

if (window.birdbrain.triLEDs[realPort] === undefined) {
    window.birdbrain.triLEDs.setLEDIntensities(realPort, realIntensities);
}

window.birdbrain.triLEDs[realPort] = realIntensities;

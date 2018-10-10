finchAppID = "ojocioejjpmeccjfjlhkepchminjemod";
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
if (window.birdbrain === undefined || window.birdbrain.moveSpeed === undefined) {
    window.birdbrain = window.birdbrain || {};
    window.birdbrain.moveSpeed = {
        // By attaching this function to a global variable, it is only
        // defined once instead of every time this block is called, improving
        // performance significantly.
        setMoveSpeed: function (speeds) {
            function callback() {
                // This array comparison is by reference instead of value.
                // This could mean false negatives if it's set to the same value, but these are uncommon and
                // the consequences are just a couple more messages sent. I do not think it is worth the
                // execution time and code complexity to do a proper value comparison.
                if (window.birdbrain.moveSpeed.speeds === speeds) {
                    delete window.birdbrain.moveSpeed.speeds;
                }
                else {
                    window.birdbrain.moveSpeed.setMoveSpeed(window.birdbrain.moveSpeed.speeds);
                }
            }
            var report = {
                message: "M".charCodeAt(0),
                leftDirection: speeds[0] < 0 ? 1 : 0,
                leftSpeed: Math.abs(speeds[0]),
                rightDirection: speeds[1] < 0 ? 1 : 0,
                rightSpeed: Math.abs(speeds[1]),
            };
            console.log(report);
            chrome.runtime.sendMessage(finchAppID, report, callback);
        }
    };
}

// constrain n to the range [-255..255]
function constrain(n) {
    return Math.max(Math.min(n, 255), -255);
}

var speeds = [constrain(Math.round(left * 2.55)), constrain(Math.round(right * 2.55))];

if (window.birdbrain.moveSpeed.speeds === undefined) {
  window.birdbrain.moveSpeed.setMoveSpeed(speeds);
}

window.birdbrain.moveSpeed.speeds = speeds;
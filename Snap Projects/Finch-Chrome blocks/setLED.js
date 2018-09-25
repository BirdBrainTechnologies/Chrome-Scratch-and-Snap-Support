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
if (window.birdbrain === undefined || window.birdbrain.LED === undefined) {
    window.birdbrain = window.birdbrain || {};
    window.birdbrain.LED = {
        // By attaching this function to a global variable, it is only
        // defined once instead of every time this block is called, improving
        // performance significantly.
        setLED: function (values) {
            function callback() {
                // This array comparison is by reference instead of value.
                // This could mean false negatives if it's set to the same value, but these are uncommon and
                // the consequences are just a couple more messages sent. I do not think it is worth the
                // execution time and code complexity to do a proper value comparison.
                if (window.birdbrain.LED.values === values) {
                    delete window.birdbrain.LED.values;
                }
                else {
                    window.birdbrain.LED.setLED(window.birdbrain.LED.values);
                }
            }
            var report = {  message: "O".charCodeAt(0),
                            red: values[0],
                            green: values[1],
                            blue: values[2]
                         };
            console.log(report);
            chrome.runtime.sendMessage(finchAppID, report, callback);
        }
    };
}

// constrain n to the range [0..255]
function constrain(n) {
    return Math.max(Math.min(n, 255), 0);
}

var values = [constrain(Math.round(red * 2.55)), constrain(Math.round(green * 2.55)), constrain(Math.round(blue * 2.55))];

if (window.birdbrain.LED.values === undefined) {
  window.birdbrain.LED.setLED(values);
}

window.birdbrain.LED.values = values;
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
if (window.birdbrain === undefined || window.birdbrain.buzzer === undefined) {
    window.birdbrain = window.birdbrain || {};
    window.birdbrain.buzzer = {
        // By attaching this function to a global variable, it is only
        // defined once instead of every time this block is called, improving
        // performance significantly.
        setBuzzer: function (value) {
            function callback() {
                // This object comparison is by reference instead of value.
                // This could mean false negatives if it's set to the same value, but these are uncommon and
                // the consequences are just a couple more messages sent. I do not think it is worth the
                // execution time and code complexity to do a proper value comparison.
                if (window.birdbrain.buzzer.value === value) {
                    delete window.birdbrain.buzzer.value;
                }
                else {
                    window.birdbrain.buzzer.setBuzzer(window.birdbrain.buzzer.value);
                }
            }
            var report = {
                message: "B".charCodeAt(0),
                timeHigh: value.time >> 8,  // Since the report must be in bytes
                timeLow: value.time & 0xFF, // and these values are bigger than a byte
                freqHigh: value.freq >> 8,  // they are split into two bytes
                freqLow: value.freq & 0xFF
            };
            chrome.runtime.sendMessage(finchAppID, report, callback);
        }
    };
}

// constrain n to the range [0..65535]
function constrain(n) {
    return Math.max(Math.min(n, 0xFFFF), 0);
}

var value = {
    freq: constrain(Math.round(freq)),
    time: constrain(Math.round(time))
};

if (window.birdbrain.buzzer.value === undefined) {
    window.birdbrain.buzzer.setBuzzer(value);
}

window.birdbrain.buzzer.value = value;
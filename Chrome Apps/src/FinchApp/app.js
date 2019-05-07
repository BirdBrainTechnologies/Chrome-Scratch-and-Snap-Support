"use strict";
(function () {

    function openSnap() {
        var radios = document.getElementsByName('level');

        for (var i = 0, length = radios.length; i < length; i++) {
            if (radios[i].checked) {
                chrome.browser.openTab({
                    url: radios[i].value
                });
                break;
            }
        }

    }
    function openScratch() {
        chrome.browser.openTab({
            url: 'http://scratchx.org/?url=http://birdbraintechnologies.github.io/Chrome-Scratch-and-Snap-Support/Scratch%20Plugins/FinchHID_Scratch(Chrome%20Plugin)/v1.0.js#scratch'
        });
    }

    var ui = {
        connected: null,
        disconnected: null
    };

    //creates the initial window for the app, adds listeners for when a connection
    //is made, and looks for the finch
    var initializeWindow = function () {
        for (var k in ui) {
            var id = k.replace(/([A-Z])/, '-$1').toLowerCase();
            var element = document.getElementById(id);
            if (!element) {
                throw "Missing UI element: " + k;
            }
            ui[k] = element;
        }
        enableIOControls(false);
        document.getElementById("snapButton").addEventListener('click', openSnap);
        document.getElementById("scratchButton").addEventListener('click', openScratch);

    };

    //controls the display of the app (showing if the finch is connected or
    //disonnected)
    var enableIOControls = function (ioEnabled) {
        if (ui.connected === null) {
            // initialization hasn't run yet
            setTimeout(enableIOControls, 100, ioEnabled);
            return;
        }
        ui.disconnected.style.display = ioEnabled ? 'none' : 'inline';
        ui.connected.style.display = ioEnabled ? 'inline' : 'none';
    };

    window.addEventListener('load', initializeWindow);
    chrome.runtime.onMessage.addListener(enableIOControls);
}());

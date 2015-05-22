chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create(
      "window.html",
      {
        innerBounds: { width: 250, height: 250, minWidth: 250 }
      });
});
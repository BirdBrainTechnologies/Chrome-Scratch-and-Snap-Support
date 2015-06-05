chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create(
      "window.html",
      {
        innerBounds: { width: 230, height: 320, minWidth: 230}
      });
});

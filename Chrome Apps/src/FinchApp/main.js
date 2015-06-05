chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create(
      "window.html",
      {
        innerBounds: { width: 230, height: 420, minWidth: 230}
      });
});
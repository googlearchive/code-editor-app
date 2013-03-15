chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('spark.html', {
    frame: 'chrome', width: 940, height: 800
  });
});

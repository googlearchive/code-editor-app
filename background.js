// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chrome.app.runtime.onLaunched.addListener(function() {
  var screenWidth = screen.availWidth;
  var screenHeight = screen.availHeight;
  var width = Math.floor(screenWidth*(7/8));
  var height = Math.floor(screenHeight*(7/8));
  chrome.app.window.create('spark.html', {
    frame: 'chrome',
    width: width, 
    height: height,
    minWidth: 600,
    minHeight: 350,
    left: Math.floor((screenWidth-width)/2),
    top: Math.floor((screenHeight-height)/2)
  });
});

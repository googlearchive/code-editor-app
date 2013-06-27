// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

TemplateLoader = function(spark) {
  this.spark = spark;
  this.pendingWrites = 0;
  this.callback = function() {};
}

TemplateLoader.prototype.loadTemplate = function(callback) {
  this.pendingWrites = 8;
  this.callback = callback;
  this.readFile(chrome.runtime.getURL('sample_app/manifest_2.json'),
      'manifest.json');
  this.readFile(chrome.runtime.getURL('sample_app/index.html'), 'index.html');
  this.readFile(chrome.runtime.getURL('sample_app/main.js'), 'main.js');
  this.readFile(chrome.runtime.getURL('sample_app/main.css'), 'main.css');
  this.readFile(chrome.runtime.getURL('sample_app/icon_16.png'), 'icon_16.png');
  this.readFile(chrome.runtime.getURL('sample_app/README.md'), 'README.md');
  this.readFile(chrome.runtime.getURL('sample_app/icon_128.png'),
      'icon_128.png');
  this.readFile(chrome.runtime.getURL('sample_app/hello_world.png'),
      'hello_world.png');
}

TemplateLoader.prototype.readFile = function(url, name) {
  var file = new XMLHttpRequest();
  file.open("GET", url, true);
  file.responseType = "blob";
  var templateLoader = this;
  var spark = templateLoader.spark;
  file.onreadystatechange = function() {
    if (file.readyState === 4)
      if (file.status === 200) {
        var createFileCb = function(fileEntry, is_created) {
          var onwriteend = function() {
            templateLoader.pendingWrites--;
            console.log(templateLoader.pendingWrites);
            if (!templateLoader.pendingWrites) {
              templateLoader.callback();
              console.log('writes done.');
            }
          };
          spark.fileOperations.writeFile(fileEntry, file.response, onwriteend);
        }
        var root = fileEntryMap[spark.getAbsolutePath(spark.ActiveProjectName)];
        console.log(root);
        spark.fileOperations.createFile(name, root, createFileCb);
        }
  }
  file.send(null);
}

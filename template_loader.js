// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

TemplateLoader = function(filetree) {
  this.filetree = filetree;
  this.pendingWrites = 0;
}

TemplateLoader.prototype.loadTemplate = function(callback) {
  this.pendingWrites = 3;
  this.callback = callback;
  this.readFile(chrome.runtime.getURL('sample_app/manifest.json'),
      'manifest.json');
  this.readFile(chrome.runtime.getURL('sample_app/window.html'), 'window.html');
  this.readFile(chrome.runtime.getURL('sample_app/main.js'), 'main.js');
}

TemplateLoader.prototype.readFile = function(url, name) {
  var file = new XMLHttpRequest();
  file.open("GET", url, true);
  var templateLoader = this;
  file.onreadystatechange = function() {
    if (file.readyState === 4)
      if (file.status === 200)
        templateLoader.writeFile(name, file.responseText);
  }
  file.send(null);
}

TemplateLoader.prototype.writeFile = function(name, content) {
  var templateLoader = this;
  this.filetree.filer.fs.root.getFile(
      name, {create: true},
      function(entry) {
        entry.createWriter(function(writer) {
          writer.truncate(0);
          writer.onwriteend = function() {
            var blob = new Blob([content]);
            var size = content.length;
            writer.write(blob);
            writer.onwriteend = function() {
              templateLoader.pendingWrites--;
              if (!templateLoader.pendingWrites)
                templateLoader.callback();
            };
          };
        });
      });
}


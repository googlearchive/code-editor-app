// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

TemplateLoader = function(filetree, spark) {
  this.spark = spark;
  this.filetree = filetree;
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
  file.onreadystatechange = function() {
    if (file.readyState === 4)
      if (file.status === 200)
        templateLoader.writeFile(name, file.response);
  }
  file.send(null);
}

TemplateLoader.prototype.writeFiles = function(entries, callback) {
  this.callback = callback;
  this.pendingWrites = entries.length;
  var templateLoader = this;
  for (var i = 0; i < entries.length; ++i) {
    entries[i].file(function(file) {
      var reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = function(ev) {
        templateLoader.writeFile(file.name, ev.target.result)
      };
   }  , function() {});
  }
}

TemplateLoader.prototype.writeFile = function(name, content) {
  var templateLoader = this;
  var activeProject = this.spark.projects[this.spark.ActiveProjectName];
  activeProject.getFile(
      name, {create: true},
      function(entry) {
        entry.createWriter(function(writer) {
          writer.truncate(0);
          writer.onwriteend = function() {
            var blob = new Blob([content]);
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


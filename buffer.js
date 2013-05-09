// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var openedTabEntries = new Array();
var openedTabHash = new Object();

Buffer = function(fileEntry, spark) {
  this.fileEntry = fileEntry;
  this.spark = spark;

  // TODO(dvh): needs to be refactored to remove UI from this class.
  this.tabElement = $("<li><a href='#'>" +
    "<span class=\"close-buffer-button\">&#215;</span>" +
    fileEntry.name + "</a></li>");
  this.tabElement.click(this.switchTo.bind(this));
  var matches = this.tabElement.children().children();
  
  var buffer = this;
  matches.click(this.userRemoveTab.bind(this))
  
  $("#tabs").append(this.tabElement);
  openedTabEntries.push(this);
  openedTabHash[fileEntry.name] = this;

  var pattern = /\.(jpg|jpeg|png|gif)$/i;
  this.isImage = pattern.test(fileEntry.name);
  
  this.doc = CodeMirror.Doc('<loading>');

  this.open();
  this.switchTo();
};

Buffer.showEmptyBuffer = function() {
  var buffer = this;
  var event = new CustomEvent("emptyBuffer");
  window.dispatchEvent(event);
}

Buffer.showImageBuffer = function() {
  var buffer = this;
  var event = new CustomEvent("imageBuffer");
  window.dispatchEvent(event);
}

Buffer.prototype.userRemoveTab = function() {
  var buffer = this;
  var event = new CustomEvent("removeBuffer",
    { detail: { buffer: buffer }});
  window.dispatchEvent(event);
}

Buffer.prototype.indexInTabs = function() {
  var buffer = this;
  var foundValue = -1;
  openedTabEntries.forEach(function(value, i) {
    if (value == buffer) {
      foundValue = i;
      return;
    }
  });
  return foundValue;
}

Buffer.prototype.removeTab = function() {
  var index = this.indexInTabs();
  delete openedTabHash[openedTabEntries[index].fileEntry.name];
  openedTabEntries.splice(index, 1);
  this.tabElement.remove();
}

Buffer.prototype.markDirty = function() {
  // TODO(miket): we save so quickly that a visual indicator of unsaved work
  // would be distracting. Perhaps instead raise an alert if saving fails?
  if (!this.isDirty)
    this.isDirty = true;
}

Buffer.prototype.switchTo = function() {
  var event = new CustomEvent("bufferSwitch",
    { detail: { buffer: this }});
  window.dispatchEvent(event);
  this.handleDocumentChange();
};

Buffer.prototype.handleDocumentChange = function() {
  var title = this.fileEntry.name;
  var mode = "javascript";
  var modeName = "JavaScript";
  if (title) {
    title = title.match(/[^/]+$/)[0];
    //document.getElementById("title").innerHTML = title;
    //document.title = title;
    if (title.match(/.json$/)) {
      mode = {name: "javascript", json: true};
      modeName = "JavaScript (JSON)";
    } else if (title.match(/.html$/)) {
      mode = "htmlmixed";
      modeName = "HTML";
    } else if (title.match(/.css$/)) {
      mode = "css";
      modeName = "CSS";
    } else if (this.isImage) {
      modeName = "Image";
    }
  } else {
    //document.getElementById("title").innerHTML = "[no document loaded]";
  }
  this.doc.getEditor().setOption("mode", mode);
  //document.getElementById("mode").innerHTML = modeName;
}

Buffer.prototype.open = function() {
  var buffer = this;
  buffer.fileEntry.file(function(file) {
    var fileReader = new FileReader();

    fileReader.onload = function(e) {
      if (!buffer.hasImageData) {
        buffer.doc.setValue(e.target.result);
        buffer.doc.clearHistory();
        buffer.handleDocumentChange(buffer.fileEntry.name);
      } else {
        buffer.imageData = e.target.result;
        buffer.doc.setValue('<image>');
        var event = new CustomEvent("imageLoaded",
        { detail: { buffer: buffer }});
        window.dispatchEvent(event);
      }
      buffer.isDirty = false;
    };

    fileReader.onerror = function(e) {
      console.log("Read failed: " + e.toString());
    };

    if (buffer.isImage) {
      buffer.isImage = true;
      buffer.hasImageData = true;
      fileReader.readAsDataURL(file);
    } else {
      buffer.isImage = false;
      buffer.hasImageData = false;
      fileReader.readAsText(file);
    }
  }, errorHandler);
}

Buffer.prototype.save = function() {
  if (!this.isDirty)
    return;
  if (this.hasImageData)
    return;

  var buffer = this;
  buffer.fileEntry.createWriter(function(fileWriter) {
    fileWriter.onwriteend = function(e) {
      var blob = new Blob([buffer.doc.getValue()]);
      fileWriter.write(blob);
      fileWriter.onwriteend = function(e) {
        buffer.isDirty = false;
        chrome.developerPrivate.exportSyncfsFolderToLocalfs(
            buffer.spark.ActiveProjectName,
            function(){});
      }
    };

    fileWriter.onerror = function(e) {
      console.log("Write failed: " + e.toString());
    };

    fileWriter.truncate(0);
  }, errorHandler);
}

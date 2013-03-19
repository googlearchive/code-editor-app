// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Spark = function() {
  if (false) {
    chrome.syncFileSystem.requestFileSystem(this.onFileSystemOpened);
  } else {
    webkitRequestFileSystem(window.PERSISTENT, 1024 * 1024 * 10,
      this.onFileSystemOpened.bind(this),
      errorHandler);
  }

  this.initContextMenu();

  var spark = this;
  this.editor = CodeMirror(
    document.getElementById("editor"),
    {
      mode: {name: "javascript", json: true },
      lineNumbers: true,
      extraKeys: {
        "Cmd-S": function(instance) { spark.handleSaveButton.bind(spark) },
        "Ctrl-S": function(instance) { spark.handleSaveButton.bind(spark) },
      }
    });

  this.editor.on('change', this.onEditorChange.bind(this));

  $("#new-button").click(this.handleNewButton.bind(this));
  $("#run-button").click(this.handleRunButton.bind(this));
  $("#test-button").click(this.handleTestButton.bind(this));
  $("#publish-button").click(this.handlePublishButton.bind(this));
  $("#export-button").click(this.handleExportButton.bind(this));

  window.addEventListener("bufferSwitch", this.onBufferSwitch.bind(this));

  this.currentBuffer = null;

  window.setInterval(this.onSaveTimer.bind(this), 2000);

  $(".tt").tooltip({ 'placement': 'bottom' });

  $("#alert").hide();
};

Spark.prototype.onSaveTimer = function() {
  if (this.currentBuffer)
    this.currentBuffer.save();
};

Spark.prototype.onEditorChange = function(instance, changeObj) {
  if (this.currentBuffer)
    this.currentBuffer.markDirty();
};

Spark.prototype.onBufferSwitch = function(e) {
  if (this.currentBuffer) {
    this.currentBuffer.onInactive();
  }
  this.currentBuffer = e.detail.buffer;
  var buffer = this.currentBuffer;
  buffer.onActive();

  $("#tabs").children().removeClass("active");
  buffer.tabElement.addClass("active");

  this.editor.swapDoc(buffer.doc);
};

Spark.prototype.setAlert = function(text) {
  $("#alert-text").text(text);
  $("#alert").show();
};

Spark.prototype.handleNewButton = function(e) {
  e.preventDefault();
  var newFileName = $("#new-file-name").val();
  this.fileTree.createNewFile(newFileName);
};

Spark.prototype.handleRunButton = function(e) {
  e.preventDefault();
  this.setAlert("Run isn't implemented yet.");
};

Spark.prototype.handleTestButton = function(e) {
  e.preventDefault();
  this.setAlert("Test isn't implemented yet.");
};

Spark.prototype.handlePublishButton = function(e) {
  e.preventDefault();
  this.setAlert("Publish isn't implemented yet.");
};

Spark.prototype.exportProject = function(fileEntry) {
  var zip = new JSZip();

  var writeZipFile = function() {
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onerror = function(e) {
        console.log("Export failed: " + e.toString());
      };

      var blob = zip.generate({"type": "blob"});
      fileWriter.truncate(blob.size);
      fileWriter.onwriteend = function() {
        fileWriter.onwriteend = function(e) {
          console.log("Export completed.");
        };

        fileWriter.write(blob);
      }
    }, errorHandler);
  }

  var zipEntries = function() {
    if (entries.length) {
      var entry = entries.pop();
      entry.file(function(file) {
        var fileReader = new FileReader();
        fileReader.onload = function(e) {
          zip.file(entry.name, e.target.result);
          zipEntries();
        };
        fileReader.onerror = function(e) {
          console.log("Error while zipping: " + e.toString());
        };
        fileReader.readAsText(file);
      }, errorHandler);
    } else {
      writeZipFile();
    }
  };

  var dirReader = this.fileTree.projectsDir.createReader();
  var entries = [];
  var readEntries = function() {
    dirReader.readEntries(function(results) {
      if (results.length) {
        entries = entries.concat(toArray(results));
        readEntries();
      } else {
        zipEntries();
      }
    }, errorHandler);
  };
  readEntries();
};

Spark.prototype.handleExportButton = function(e) {
  e.preventDefault();
  chrome.fileSystem.chooseEntry({ "type": "saveFile",
    "suggestedName": "project.zip" },
    this.exportProject.bind(this));
};

Spark.prototype.onFileSystemOpened = function(fs) {
  console.log("Obtained file system");
  this.fileSystem = fs;
  this.fileTree = new FileTree(fs);
};

$(function() {
  var spark = new Spark();
});

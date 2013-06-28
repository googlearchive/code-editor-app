// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function errorHandler(e) {
  var msg = "";

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
    msg = "QUOTA_EXCEEDED_ERR";
    break;
    case FileError.NOT_FOUND_ERR:
    msg = "NOT_FOUND_ERR";
    break;
    case FileError.SECURITY_ERR:
    msg = "SECURITY_ERR";
    break;
    case FileError.INVALID_MODIFICATION_ERR:
    msg = "INVALID_MODIFICATION_ERR";
    break;
    case FileError.INVALID_STATE_ERR:
    msg = "INVALID_STATE_ERR";
    break;
    default:
    msg = "Unknown Error";
    break;
  };

  console.log("Error: " + msg);
}

function SparkFilesystem() {
  this.fs = null;
  this.indexFileEntry = null;
  this.indexJSON = null;

  this.init = function(realFilesystem) {
    this.fs = realFilesystem;
    this.fs.root.getFile('index.json',{create: true},
        function(f) { this.indexFileEntry = f; readIndex() });
  };

  this.readIndex = function() {
    this.indexFileEntry.file(function(file) {
      var fileReader = new FileReader();

      fileReader.onload = function(e) {
        this.indexJSON = e.target.result;
      };

      fileReader.onerror = function(e) {
        console.log("Read failed: " + e.toString());
      };

      fileReader.readAsText(file);
    }, errorHandler);
  };
}

// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


var fileEntryMap = [];

/** Creates and initializes the DOMFilesystem
 * @contructor
 */
FileNode = function(entry, pnt) {
  this.node = entry;
  this.pnt = pnt;
  this.isDirectory = entry.isDirectory;
  this.childrens = [];
  fileEntryMap[entry.fullPath] = this;
  if (this.isDirectory) {
    var reader = entry.createReader();
    var handleReadEntriesCb = function(entries) {
      for (var i = 0; i < entries.length; ++i) {
        var file_node = new FileNode(entries[i], this);
        this.childrens[file_node.node.fullPath] = file_node;
      }
    };
    reader .readEntries(handleReadEntriesCb.bind(this));
  }
}

function FileOperations() {
  console.log('file operations initialized.');
}

FileOperations.prototype = {

  /**
   *
   */
  createFile: function(name, root, callback) {
    var entry = fileEntryMap[root.node.fullPath + '/' + name];
    if (entry) {
      console.log(name + ': file already exists.');
      if (callback)
        callback(entry, true);
      return;
    }
    root.node.getFile(name, {create:true}, function(fileEntry) {
      var fileNode = new FileNode(fileEntry, root);
      fileEntryMap[fileEntry.fullPath] = fileNode;
      root.childrens.push(fileNode);
      if (callback)
        callback(fileNode, false);
    }, errorHandler);
  },

  /**
   *
   */
  createDirectory: function(name, root, callback) {
    var entry = fileEntryMap[root.fullPath + '/' + name];
    if (entry) {
      console.log(name + ': directory already exists');
      if (callback)
        callback(entry, true);
      return;
    }
    console.log("creating directory");
    root.node.getDirectory(name, {create:true}, function(directory) {
      var directoryNode = new FileNode(directory, root);
      root.childrens.push(directoryNode);
      fileEntryMap[directory.fullPath] = directoryNode;
      if (callback)
        callback(directoryNode, false);
    }, errorHandler);
  },

  /**
   *
   */
  copyFile: function(sourceEntry, root, callback) {
    var fileOperations = this;
    sourceEntry.file(function(file) {
      var reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = function(ev) {
        var createFileCb = function(targetEntry) {
          fileOperations.writeFile(targetEntry, ev.target.result, callback);
        };
        fileOperations.createFile(sourceEntry.name, root, createFileCb);
      };
    });
  },

  /**
   *
   */
  copyDirectory: function(sourceEntry, root, callback, pendingCallbacks) {
    var fileOperations = this;
    if (pendingCallbacks == null) {
      pendingCallbacks = {};
      pendingCallbacks.count = 1;
    }

    if (sourceEntry.isDirectory) {
      var createDirectoryCb = function(directory) {
        var reader = sourceEntry.createReader();
        var readEntriesCb = function(entries) {
          pendingCallbacks.count += entries.length - 1;
          console.log(pendingCallbacks.count);
          for (var i = 0; i < entries.length; ++i) {
            fileOperations.copyDirectory(entries[i], directory, callback, pendingCallbacks);
          }

          if (!pendingCallbacks.count && callback)
            callback();
        };
        reader.readEntries(readEntriesCb);
      }
      fileOperations.createDirectory(sourceEntry.name, root, createDirectoryCb);
    } else {
      var copyFileCb = function() {
        pendingCallbacks.count--;
        console.log(pendingCallbacks.count);
        if (!pendingCallbacks.count && callback)
          callback();
      };
      this.copyFile(sourceEntry, root, copyFileCb);
    }
  },

  /**
   *
   */
  deleteFile: function(entry, callback) {
    // remove from parent's children list. Delete the node and file.
    if (fileEntryMap[entry.fullPath]) {
      var pnt = fileEntryMap[entry.fullPath].pnt;
      delete pnt.childrens[entry.fullPath];
      delete fileEntryMap[entry.fullPath];
    }
    entry.remove(callback);
  },

  /**
   *
   */
  deleteDirectory: function(entry, callback) {
    console.log("directory delete is not supported yet.");
  },

  /**
   *
   */
  renameFile: function(entry, newName, callback) {
    var file_node = fileEntryMap[entry.fullPath];
    entry.moveTo(file_node.pnt.node, newName);
    file_node.pnt.node.getFile(newName, {create: true},
        function(createdEntry) {
      delete file_node.pnt.childrens[entry.fullPath];
      file_node = new FileNode(createdEntry, file_node.pnt);
      fileEntryMap[createdEntry.fullPath] = file_node;
      file_node.pnt.childrens[createdEntry.fullPath] = createdEntry;
      callback(createdEntry);
    });
  },

  /**
   *
   */
  renameDirectory: function() {
  },

  /**
   *
   */
  writeFile: function(fileEntry, content, onwriteend) {
    fileEntry.node.createWriter(function(writer) {
      writer.truncate(0);
      writer.onwriteend = function() {
        var blob = new Blob([content]);
        writer.write(blob);
        writer.onwriteend = onwriteend;
      };
    });
  }
};

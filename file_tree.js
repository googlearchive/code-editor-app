// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

FileTree = function(filer, spark) {
  this.filer = filer;
  this.spark = spark;
  this.parentElement = $('#filetree');
  this.refresh();
};

FileTree.prototype.refresh = function() {
  var fileTree = this;
  this.parentElement.empty();
  var reader = this.filer.fs.root.createReader();
  this.entries = {};
  var handleProjectLs = function(entries) {
    for (var i = 0; i < entries.length; ++i) {
      this.entries[entries[i].name] = entries[i];
      // prefs file should not be visible.
      if (entries[i].name == 'prefs')
        continue;
      this.handleCreatedEntry(entries[i]);
    }
  };
  reader.readEntries(handleProjectLs.bind(this));
}

FileTree.prototype.handleProjectsLs = function(entries) {
  var fileTree = this;
  entries.forEach(function(entry, i) {
    fileTree.handleCreatedEntry(entry);
  });
};

FileTree.prototype.removeDeletedEntries = function() {
  for (var fname in this.entries) {
    if (this.entries[fname].deleted)
      delete this.entries[fname];
  }
}

FileTree.prototype.clearFileSystem = function(callback) {
  this.removeDeletedEntries();
  this.removeCallback = callback;
  this.pendingRemove = Object.keys(this.entries).length;
  // We don't remove the prefs file.
  this.pendingRemove--;
  // Call the callback when the filesystem is already clear.
  if (this.pendingRemove == 0) {
    this.removeCallback();
    return;
  }

  for (var fname in this.entries) {
    // Do not remove the prefs file.
    if (fname == 'prefs')
      continue;
    var entry = this.entries[fname];
    if (entry.active) {
      entry.buffer.removeTab();
      if (entry.buffer.active)
        this.spark.editor.swapDoc(CodeMirror.Doc(''));
    }
    var fileRemove = function() {
      this.pendingRemove--;
      if (this.pendingRemove == 0) {
        this.parentElement.empty();
        this.entries = {};
        console.log('file system cleared.');
        this.removeCallback();
      }
    }
    entry.remove(fileRemove.bind(this));
  }
};

FileTree.prototype.createNewFile = function(name) {
  var entry = this.entries[name];
  if (entry) {
    console.log(name + ': file already exist.');
    if (!entry.buffer)
      entry.buffer = new Buffer(entry);
    entry.buffer.switchTo();
    $('#new-file-name').val('');
    return;
  }
  this.filer.fs.root.getFile(
      name, {create: true}, this.handleCreatedEntry.bind(this), errorHandler);
}

FileTree.prototype.handleCreatedEntry = function(fileEntry) {
  var fileTree = this;
  fileEntry.active = false;
  this.entries[fileEntry.name] = fileEntry;

  var fragment = $('<li>');

  var mainIcon = $('<i>');
  if (fileEntry.isDirectory)
    mainIcon.addClass("icon-folder-close");
  else
    mainIcon.addClass("icon-file");
  var deleteIcon = $('<i>').addClass("icon-trash");
  fragment.append(mainIcon);
  fragment.append(['<span>', fileEntry.name, '</span>'].join(''));
  fragment.append(deleteIcon);

  var filer = this.filer;
  deleteIcon.click(function() {
    fileEntry.remove(function() {
      console.log(fileEntry.fullPath + ' removed.');
      fragment.remove();
      if (fileEntry.active) {
        if (fileEntry.buffer.active)
          fileTree.spark.editor.swapDoc(CodeMirror.Doc(''));
        fileEntry.buffer.removeTab();
      }
      fileEntry.deleted = true;
      // TODO(grv): switch to another tab, and then remove this tab
    });
  });

  fragment.dblclick(function() {
    fileEntry.active = true;
    if (!fileEntry.buffer) {
      // This feels wrong.
      fileEntry.buffer = new Buffer(fileEntry);
    } else {
      fileEntry.buffer.switchTo();
    }
  });

  this.parentElement.append(fragment);
  $('#new-file-name').val('');
};

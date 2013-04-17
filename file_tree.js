// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

FileTree = function(filer) {
  this.filer = filer;
  this.parentElement = $('#filetree');
  this.refresh();
};

FileTree.prototype.refresh = function() {
  var fileTree = this;
  var reader = this.filer.fs.root.createReader();
  var handleProjectLs = function(entries) {
    for (var i = 0; i < entries.length; ++i) {
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

FileTree.prototype.clearFileSystem = function(callback) {
  var reader = this.filer.fs.root.createReader();
  this.removeCallback = callback;
  var removeCb = function(entries) {
  this.pendingRemove = entries.length;
  // Call the callback when the filesystem is already clear.
  if (this.pendingRemove == 0)
    this.removeCallback();
    for (var i = 0; i < entries.length; ++i) {
      var fileRemove = function() {
        this.pendingRemove--;
        if (this.pendingRemove == 0) {
          this.parentElement.empty();
          console.log('file system cleared.');
          this.removeCallback();
        }
      };
      entries[i].remove(fileRemove.bind(this));
    }
  };

  reader.readEntries(removeCb.bind(this));
}

FileTree.prototype.createNewFile = function(name) {
  this.filer.fs.root.getFile(
      name, {create: true}, this.handleCreatedEntry.bind(this), errorHandler);
}

FileTree.prototype.handleCreatedEntry = function(fileEntry) {
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
      fileEntry.buffer.removeTab();
      // TODO(grv): switch to another tab, and then remove this tab
    });
  });

  fragment.dblclick(function() {
    if (!fileEntry.buffer) {
      // This feels wrong.
      fileEntry.buffer = new Buffer(fileEntry);
    } else {
      fileEntry.buffer.switchTo();
    }
  });

  this.parentElement.append(fragment);
};

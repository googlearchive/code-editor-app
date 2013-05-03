// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

FileTree = function(filer, spark) {
  this.filer = filer;
  this.spark = spark;
  this.parentElement = $('#filetree');
  this.entries = [];
};

FileTree.prototype.refresh = function() {
  this.entries = [];
  var fileTree = this;
  var reader =
      this.spark.projects[this.spark.ActiveProjectName].createReader();
  var handleProjectLs = function(entries) {
    this.parentElement.empty();
    for (var i = 0; i < entries.length; ++i) {
      this.handleCreatedEntry(entries[i]);
    }
    
    var opened_one = false;
    var firstEntry = null;

    // TODO(dvh): should open the last opened file on this project.
    // Try to open the manifest file.
    for (var i = 0; i < entries.length; ++i) {
      if (entries[i].name == 'prefs')
        continue;
      if (firstEntry == null)
        firstEntry = entries[i];
      if (entries[i].name == 'manifest.json') {
        opened_one = true;
        this.openFileEntry(entries[i]);
      }
    }

    // If manifest has not been found, open the first valid entry.
    if (!opened_one) {
      if (firstEntry != null) {
        this.openFileEntry(firstEntry);
      }
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

FileTree.prototype.openFileEntry = function(fileEntry) {
  fileEntry.active = true;
  if (!fileEntry.buffer) {
    // This feels wrong.
    fileEntry.buffer = new Buffer(fileEntry);
  } else {
    fileEntry.buffer.switchTo();
  }
}

FileTree.prototype.closeOpendTabs = function() {
  for (var fname in this.entries) {
    if (fname == 'prefs')
      continue;
    var entry = this.entries[fname];
    if (entry.active) {
      entry.buffer.removeTab();
      if (entry.buffer.active)
        this.spark.editor.swapDoc(CodeMirror.Doc(''));
    }
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
      // TODO(grv): switch to another tab, and then remove this tab
    });
  });

  fragment.click(function() {
    fileTree.openFileEntry(fileEntry);
  });

  this.parentElement.append(fragment);
  $('#new-file-name').val('');
};

// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

FileTree = function(filer) {
  this.filer = filer;
  this.parentElement = $('#filetree');

  var fileTree = this;
  filer.mkdir(this.PROJECT_DIR, false, function(createdDirEntry) {
    filer.cd(createdDirEntry.fullPath, function(dirEntry) {
      filer.ls(dirEntry, fileTree.handleProjectsLs.bind(fileTree),
        errorHandler);
    });
  });

};

FileTree.prototype.PROJECT_DIR = 'projects';

FileTree.prototype.handleProjectsLs = function(entries) {
  var fileTree = this;
  entries.forEach(function(entry, i) {
    fileTree.handleCreatedEntry(entry);
  });
};

FileTree.prototype.createNewFile = function(name) {
  this.filer.create(name, true, this.handleCreatedEntry.bind(this),
    errorHandler);
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
    filer.rm(fileEntry.fullPath, function() {
      fragment.remove();
      // TODO(miket): switch to another tab, and then remove this tab
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

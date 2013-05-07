// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Callbacks for the controller

var FilesListViewControllerDelegate = function() {
}

FilesListViewControllerDelegate.prototype.filesListViewControllerSelectionChanged = function(entries) {
  // Do nothing.
}

FilesListViewControllerDelegate.prototype.filesListViewControllerSelectionChanged = function(entries) {
  // Do nothing.
}

var FilesListViewController = function(element, delegate) {
  this.entries = null;
  this.listView = new ListView(element, this);
  this.listView.reloadData();
  this.delegate = delegate;
}

FilesListViewController.prototype.updateEntries = function(entries) {
  this.entries = entries;
  this.listView.reloadData();
}

FilesListViewController.prototype.setSelection = function(selectedEntries) {
  var indexes = new Object();
  this.entries.forEach(function(entry, i) {
    indexes[entry.name] = i;
  });

  var rowIndexes = new Array();
  selectedEntries.forEach(function(entry, i) {
    var idx = indexes[entry.name]
    if (idx != null) {
      rowIndexes.push(idx);
    }
  });
  this.listView.setSelectedRows(rowIndexes);
}

FilesListViewController.prototype.setSelectionByNames = function(names) {
  var indexes = new Object();
  this.entries.forEach(function(entry, i) {
    indexes[entry.name] = i;
  });

  var rowIndexes = new Array();
  names.forEach(function(name, i) {
    var idx = indexes[name];
    if (idx != null) {
      rowIndexes.push(idx);
    }
  });
  this.listView.setSelectedRows(rowIndexes);
}

FilesListViewController.prototype.selection = function() {
  var result = new Array();
  if (this.entries == null) {
    return result;
  }
  var controller = this;
  this.listView.selectedRows().forEach(function(rowIndex, i) {
    result.push(controller.entries[rowIndex]);
  });
  return result;
}

// Callbacks for ListView.
FilesListViewController.prototype.listViewNumberOfRows = function() {
  if (this.entries == null) {
    return 0;
  }
  return this.entries.length;
}

FilesListViewController.prototype.listViewElementForRow = function(rowIndex) {
  var image = "<img src=\"img/file-regular.png\"/>"
  return $("<div class=\"file-item\">" + image + this.entries[rowIndex].name + "</div>");
}

FilesListViewController.prototype.listViewHeightForRow = function(rowIndex) {
  return 25.;
}

FilesListViewController.prototype.listViewSelectionChanged = function(rowIndexes) {
  this.delegate.filesListViewControllerSelectionChanged(this.selection());
}

FilesListViewController.prototype.listViewDoubleClicked = function(rowIndexes) {
  this.delegate.filesListViewControllerDoubleClicked(this.selection());
}

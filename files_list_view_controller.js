// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Callbacks for the controller

var FilesListViewControllerDelegate = function() {
}

FilesListViewControllerDelegate.prototype.filesListViewControllerSelectionChanged = function(entries) {
  // Do nothing.
}

FilesListViewControllerDelegate.prototype.filesListViewControllerDoubleClicked = function(entries) {
  // Do nothing.
}

FilesListViewControllerDelegate.prototype.filesListViewControllerShowContextMenuForElement = function(element) {
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
  var fileicon = $('<img src="img/file-regular.png"/>');
  var text = $('<span class="file-item-text">' + htmlEncode(this.entries[rowIndex].name) + '</span>');
  var caret = $('<span class="caret"></span>');
  var dropdown = $('<div></div>');
  var link = $('<a href="#"></a>');
  link.append(caret);
  dropdown.append(link);
  
  var listitem =  $("<div class=\"file-item\"></div>");
  listitem.append(fileicon);
  listitem.append(text);
  listitem.append(dropdown);
  var controller = this;
  
  link.click(function(e) {
    if ($('#files-menu').css('display') == 'block') {
      return;
    }
    
    // Select item if not selected.
    var isSelected = false;
    controller.listView.selectedRows().forEach(function(currentRowIndex, i) {
      if (currentRowIndex == rowIndex) {
        isSelected = true;
      }
    });
    if (!isSelected) {
      controller.listView.setSelectedRow(rowIndex);
    }
    
    controller.delegate.filesListViewControllerShowContextMenuForElement(link, e);
  });
  
  return listitem;
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

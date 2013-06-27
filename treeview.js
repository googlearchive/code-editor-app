// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";

var TreeViewDelegate = function() {
}

TreeViewDelegate.prototype.treeViewHasChildren = function(nodeUID) {
  return false;
}

TreeViewDelegate.prototype.treeViewNumberOfChildren = function(nodeUID) {
  return 0;
}

// Returns nodeUID
TreeViewDelegate.prototype.treeViewChild = function(nodeUID, childIndex) {
  return null;
}

TreeViewDelegate.prototype.treeViewElementForNode = function(nodeUID) {
  return $("<div></div>");
}

TreeViewDelegate.prototype.treeViewHeightForNode = function(nodeUID) {
  return 20.;
}

TreeViewDelegate.prototype.treeViewSelectionChanged = function(nodesUIDs) {
  // Do nothing.
}

TreeViewDelegate.prototype.treeViewDoubleClicked = function(nodesUIDs) {
  // Do nothing.
}

var TreeViewCell = function() {
  this.expanded = false;
  //this.expanded = true;
  this.nodeUID = null;
  this.hasChildren = false;
  this.indentationLevel = 0;
}

var TreeView = function(element, delegate) {
  this.element = element;
  this.delegate = delegate;
  this.items = new Array();
  this.listView = new ListView(element, this);
}

TreeView.prototype.reloadData = function() {
  this.reloadDataAfterIndex(-1);
}

TreeView.prototype.reloadDataAfterIndex = function(index) {
  var selection = new Array();
  this.listView.selectedRows().forEach(function(rowIndex, i) {
    var nodeUID = this.items[rowIndex].nodeUID;
    selection.push(nodeUID);
  }.bind(this));
  
  this.expandedSet = new Set();

  this.items.forEach(function(cell, i) {
    if (cell.expanded) {
      this.expandedSet.add(cell.nodeUID);
    }
  }.bind(this))

  this.indexes = new Object();
  this.items.length = 0;
  this._fillListForNodeUID(null, 0);

  this.expandedSet.removeAll();

  this.listView.reloadDataAfterIndex(index);
  
  var selectedRows = new Array();
  selection.forEach(function(nodeUID, i) {
    var indexValue = this.indexes[nodeUID];
    if (indexValue != null)
      selectedRows.push(indexValue);
  }.bind(this));
  this.listView.setSelectedRows(selectedRows);
}

TreeView.prototype._fillListForNodeUID = function(nodeUID, indentationLevel) {
  var addChildren = false;
  if (nodeUID != null) {
    var cell = new TreeViewCell();
    cell.nodeUID = nodeUID;
    if (nodeUID != null) {
      if (this.expandedSet.contains(nodeUID)) {
        cell.expanded = true;
      }
    }
    cell.hasChildren = this.delegate.treeViewHasChildren(nodeUID);
    cell.indentationLevel = indentationLevel;
    this.items.push(cell);
    
    addChildren = cell.expanded;
    
    this.indexes[nodeUID] = this.items.length - 1;
  }
  else {
    this.indexes = new Object();
    
    addChildren = true; 
  }
  if (addChildren) {
    var count = this.delegate.treeViewNumberOfChildren(nodeUID);
    for(var i = 0 ; i < count ; ++i) {
      var childUID = this.delegate.treeViewChild(nodeUID, i);
      this._fillListForNodeUID(childUID, indentationLevel + 1);
    }
  }
}

TreeView.prototype.listViewNumberOfRows = function() {
  return this.items.length;
}

TreeView.prototype.listViewElementForRow = function(rowIndex) {
  var cell = this.items[rowIndex];
  var result = $('<div></div>');
  var element = this.delegate.treeViewElementForNode(cell.nodeUID);
  var paddingLeft = cell.indentationLevel * 10;
  result.css('padding-left', paddingLeft + 'px');
  var expandButton = $('<div></div>');
  result.append(expandButton);
  expandButton.addClass('folder-expand-button');
  if (cell.hasChildren) {
    expandButton.html('<div>&#9654;</div>');
    if (cell.expanded) {
      expandButton.addClass('expanded');
    } else {
      expandButton.removeClass('expanded');
    }
  }
  result.append(element);
  expandButton.click(function(evt) {
    this.toggle(cell.nodeUID);
    evt.stopPropagation();
  }.bind(this));
  return result;
}

TreeView.prototype.listViewHeightForRow = function(rowIndex) {
  var cell = this.items[rowIndex];
  return this.delegate.treeViewHeightForNode(cell.nodeUID);
}

TreeView.prototype.listViewSelectionChanged = function(rowIndexes) {
  var treeview = this;
  var selection = new Array();
  rowIndexes.forEach(function(rowIndex, i) {
    var nodeUID = treeview.items[rowIndex].nodeUID;
    selection.push(nodeUID);
  });
  this.delegate.treeViewSelectionChanged(selection);
}

TreeView.prototype.listViewDoubleClicked = function(rowIndexes) {
  var treeview = this;
  var selection = new Array();
  rowIndexes.forEach(function(rowIndex, i) {
    var nodeUID = treeview.items[rowIndex].nodeUID;
    selection.push(nodeUID);
  });
  this.delegate.treeViewDoubleClicked(selection);
}

TreeView.prototype.toggle = function(nodeUID) {
  var index = this.indexes[nodeUID];
  var cell = this.items[index];
  cell.expanded = !cell.expanded;
  var element = this.listView.cells[index].element;
  var expandButton = element.find('.folder-expand-button');
  if (cell.expanded) {
    expandButton.addClass('expanded');
  } else {
    expandButton.removeClass('expanded');
  }
  this.reloadDataAfterIndex(index);
}

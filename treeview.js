// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";

var TreeViewDelegate = function() {
}

TreeViewDelegate.prototype.hasChildren = function(nodeUID) {
  return false;
}

TreeViewDelegate.prototype.numberOfChildren = function(nodeUID) {
  return 0;
}

TreeViewDelegate.prototype.child = function(nodeUID, childIndex) {
  return null;
}

TreeViewDelegate.prototype.elementForNode = function(nodeUID) {
  return $("<div></div>");
}

TreeViewDelegate.prototype.heightForNode = function(nodeUID) {
  return 20.;
}

TreeViewDelegate.prototype.treeViewSelectionChanged = function(nodesUIDs) {
  // Do nothing.
}

var TreeViewCell = function() {
  //this.expanded = false;
  this.expanded = true;
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
  this.expandedSet = new Set();
  
  var treeview = this;
  this.items.forEach(function(cell, i) {
    if (cell.expanded) {
      treeview.expandedSet.add(cell.nodeUID);
    }
  })
  
  this.items.length = 0;
  this._fillListForNodeUID(null, 0);
  
  this.expandedSet.removeAll();
  
  this.listView.reloadData();
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
    cell.hasChildren = this.delegate.hasChildren(nodeUID);
    cell.indentationLevel = indentationLevel;
    this.items.push(cell);
    
    addChildren = cell.expanded;
  }
  else {
    addChildren = true; 
  }
  if (addChildren) {
    var count = this.delegate.numberOfChildren(nodeUID);
    for(var i = 0 ; i < count ; ++i) {
      var childUID = this.delegate.child(nodeUID, i);
      this._fillListForNodeUID(childUID, indentationLevel + 1);
    }
  }
}

TreeView.prototype.numberOfRows = function() {
  return this.items.length;
}

TreeView.prototype.elementForRow = function(rowIndex) {
  var cell = this.items[rowIndex];
  var element = this.delegate.elementForNode(cell.nodeUID);
  var paddingLeft = cell.indentationLevel * 10;
  element.css('padding-left', paddingLeft + 'px');
  return element;
}

TreeView.prototype.heightForRow = function(rowIndex) {
  var cell = this.items[rowIndex];
  return this.delegate.heightForNode(cell.nodeUID);
}

TreeView.prototype.listViewSelectionChanged = function(rowIndexes) {
  var treeview = this;
  var selection = new Array();
  rowIndexes.forEach(function(rowIndex, i) {
    var nodeUID = treeview.items[rowIndex].nodeUID;
    selection.push(nodeUID);
  })
  this.delegate.treeViewSelectionChanged(selection);
}
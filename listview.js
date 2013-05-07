// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ListViewDelegate

"use strict";

var ListViewDelegate = function() {
}

ListViewDelegate.prototype.listViewNumberOfRows = function() {
  return 0;
}

ListViewDelegate.prototype.listViewElementForRow = function(rowIndex) {
  return $("<div></div>");
}

ListViewDelegate.prototype.listViewHeightForRow = function(rowIndex) {
  return 20.;
}

ListViewDelegate.prototype.listViewSelectionChanged = function(rowIndexes) {
  // Do nothing.
}

ListViewDelegate.prototype.listViewDoubleClicked = function(rowIndexes) {
  // Do nothing.
}

// ListViewCell

var ListViewCell = function() {
  this.y = 0;
  this.height = 0;
  this.element = null;
  this.selected = false;
  this.cleanupTimer = null;
  this.existingMinimumRowIndex = 0;
  this.existingMaximumRowIndex = -1;
  this.firstVisibleRowIndex = 0;
  this.lastVisibleRowIndex = -1;
}

// ListView

var ListView = function(element, delegate) {
  this.element = element;
  this.innerElement = $('<div></div>');
  this.innerElement.css('position', 'relative');
  this.element.append(this.innerElement);
  this.element.css('overflow', 'scroll');
  this.delegate = delegate;
  this.cells = new Array();
  this.lastSelectedRow = -1;
  this.selectedRowsSet = new Set();
  var listview = this;
  this.element.scroll(function() {
    listview._updateScrollArea();
  });
}

ListView.selectedColor = '#eee';

ListView.prototype.reloadData = function() {
  if (this.cleanupTimer != null) {
    window.clearTimeout(this.cleanupTimer);
    this.cleanupTimer = null;
  }
  
  this.firstVisibleRowIndex = 0;
  this.lastVisibleRowIndex = -1;
  this._cleanupCells();
  
  this.cells = new Array();
  var count = this.delegate.listViewNumberOfRows();
  var y = 0;
  var updatedSelectedRowsSet = new Set();
  for (var i = 0 ; i < count ; ++i) {
    var cell = new ListViewCell();
    this.cells.push(cell);
    cell.y = y;
    cell.height = this.delegate.listViewHeightForRow(i);
    y += cell.height;
    if (this.selectedRowsSet.contains(i)) {
      updatedSelectedRowsSet.add(i);
    }
  }
  this.selectedRowsSet = updatedSelectedRowsSet;
  this.innerElement.height(y);
  this._updateScrollArea();
}

ListView.prototype._rowIndexForTopPositionBounds = function(top, leftBound, rightBound) {
  if (leftBound == rightBound) {
    return leftBound;
  }
  var middle = Math.ceil((leftBound + rightBound) / 2);
  
  if (top >= this.cells[middle].y) {
    // middle, rightBound
    if (middle == leftBound) {
      return rightBound;
    }
    return this._rowIndexForTopPositionBounds(top, middle, rightBound);
  }
  else {
    // leftBound, middle - 1
    if (middle == leftBound) {
      return leftBound;
    }
    return this._rowIndexForTopPositionBounds(top, leftBound, middle - 1);
  }
}

ListView.prototype._rowIndexForTopPosition = function(top) {
  return this._rowIndexForTopPositionBounds(top, 0, this.cells.length - 1);
}

ListView.prototype.setSelectedRows = function(rowIndexes) {
  var listview = this;
  this.selectedRowsSet.allObjects().forEach(function(rowIndex, i) {
    if (listview.cells[rowIndex].element != null) {
      listview.cells[rowIndex].element.css('background-color', '');
    }
  });
  this.selectedRowsSet.removeAll();
  rowIndexes.forEach(function(rowIndex, i) {
    listview.selectedRowsSet.add(rowIndex);
  });
  this.selectedRowsSet.allObjects().forEach(function(rowIndex, i) {
    if (listview.cells[rowIndex].element != null) {
      listview.cells[rowIndex].element.css('background-color', ListView.selectedColor);
    }
  });
}

ListView.prototype.selectedRows = function() {
  return this.selectedRowsSet.allObjects();
}

ListView.prototype.setSelectedRow = function(rowIndex) {
  this.lastSelectedRow = rowIndex;
  this.setSelectedRows([rowIndex]);
}

ListView.prototype._handleRowDoubleClicked = function(rowIndex, e) {
  this.delegate.listViewDoubleClicked(this.selectedRowsSet.allObjects());
}

ListView.prototype._handleRowClicked = function(rowIndex, e) {
  if (e.ctrlKey || e.metaKey) {
    if (this.selectedRowsSet.contains(rowIndex)) {
      var newSelection = new Set();
      this.selectedRows().forEach(function(rowIndex, i) {
        newSelection.add(rowIndex);
      });
      newSelection.remove(rowIndex);
      this.setSelectedRows(newSelection.allObjects());
    } else {
      var selection = this.selectedRows();
      selection.push(rowIndex);
      this.setSelectedRows(selection);
    }
  } else if (e.shiftKey) {
    if (this.lastSelectedRow != -1) {
      var min;
      var max;
      if (rowIndex < this.lastSelectedRow) {
        min = rowIndex;
        max = this.lastSelectedRow;
      } else {
        min = this.lastSelectedRow;
        max = rowIndex;
      }
      var rowIndexes = new Array();
      for(var i = min ; i <= max ; ++i) {
        rowIndexes.push(i);
      }
      this.setSelectedRows(rowIndexes);
    } else {
      this.setSelectedRow(rowIndex);
    }
  } else {
    this.setSelectedRow(rowIndex);
  }
  this.delegate.listViewSelectionChanged(this.selectedRowsSet.allObjects());
}

ListView.prototype._updateScrollArea = function() {
  if (this.cells.length == 0) {
    return;
  }
  
  var y = this.element.scrollTop();
  var firstVisibleRowIndex = this._rowIndexForTopPosition(y);
  var lastVisibleRowIndex = this._rowIndexForTopPosition(y + this.element.height());
  for(var i = firstVisibleRowIndex ; i <= lastVisibleRowIndex ; ++i) {
    if (this.cells[i].element != null) {
      continue;
    }
    var elt = $('<div></div>');
    elt.css('position', 'absolute');
    elt.css('overflow', 'hidden');
    elt.css('width', '100%');
    elt.css('top', this.cells[i].y + 'px');
    elt.css('height', this.cells[i].height + 'px');
    if (this.selectedRowsSet.contains(i)) {
      elt.css('background-color', ListView.selectedColor);
    }
    elt.append(this.delegate.listViewElementForRow(i));
    elt.click(this._handleRowClicked.bind(this, i));
    elt.dblclick(this._handleRowDoubleClicked.bind(this, i));
    this.cells[i].element = elt;
    this.innerElement.append(elt);
  }
  
  if (firstVisibleRowIndex < this.existingMinimumRowIndex) {
    this.existingMinimumRowIndex = firstVisibleRowIndex;
  }
  if (lastVisibleRowIndex > this.existingMaximumRowIndex) {
    this.existingMaximumRowIndex = lastVisibleRowIndex;
  }
  this.firstVisibleRowIndex = firstVisibleRowIndex;
  this.lastVisibleRowIndex = lastVisibleRowIndex;
  
  var listView = this;
  if (this.cleanupTimer != null) {
    window.clearTimeout(this.cleanupTimer);
    this.cleanupTimer = null;
  }
  this.cleanupTimer = window.setTimeout(function() {
    listView._cleanupCells();
  }, 100);
}

ListView.prototype._cleanupCells = function() {
  for(var i = this.existingMinimumRowIndex ; i <= this.existingMaximumRowIndex ; ++i) {
    if ((i >= this.firstVisibleRowIndex) && (i <= this.lastVisibleRowIndex)) {
      continue;
    }
    if (this.cells[i].element != null) {
      this.cells[i].element.remove();
      this.cells[i].element = null;
    }
  }
  //console.log('cleanup ' + this.existingMinimumRowIndex + ' ' + this.existingMaximumRowIndex);
  this.existingMinimumRowIndex = this.firstVisibleRowIndex;
  this.existingMaximumRowIndex = this.lastVisibleRowIndex;
}

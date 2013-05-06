// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Set = function() {
  this.content = new Object();
}

Set.prototype.add = function(a) {
  this.content[a] = true;
}

Set.prototype.remove = function(a) {
  delete this.content[a];
}

Set.prototype.contains = function(a) {
  return (a in this.content);
}

Set.prototype.allObjects = function() {
  return Object.keys(this.content);
}

Set.prototype.removeAll = function() {
  this.content = new Object();
}
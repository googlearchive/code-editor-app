// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function TabsManager(spark) {
  this.spark = spark;
  window.addEventListener("bufferSwitch", this.onBufferSwitch.bind(this));
  window.addEventListener("emptyBuffer", this.onEmptyBuffer.bind(this));
  window.addEventListener("imageBuffer", this.onImageBuffer.bind(this));
  window.addEventListener("imageLoaded", this.onImageLoaded.bind(this));
  window.addEventListener("removeBuffer", this.onRemoveBuffer.bind(this));
  console.log("tabs initialized.");
}

TabsManager.prototype = {

  openedTabEntries: Array(),

  openedTabHash: Object(),

  onRemoveBuffer: function(e) {
    this.closeTab(e.detail.buffer);
  },

  onBufferSwitch: function(e) {
    if (this.spark.currentBuffer)
      this.spark.currentBuffer.active = false;
    this.spark.currentBuffer = e.detail.buffer;
    var buffer = this.spark.currentBuffer;
    buffer.active = true;

    $("#tabs").children().removeClass("active");
    buffer.tabElement.addClass("active");

    if (this.spark.currentBuffer.isImage) {
      Buffer.showImageBuffer();
      this.updateImage();
    } else {
      $("#editor-pane").show();
      $("#editor").show();
      $("#editor-placeholder").hide();
      $("#editor-image").hide();
    }

    this.spark.editor.swapDoc(buffer.doc);
  },

  onEmptyBuffer:  function(e) {
    $("#editor-pane").hide();
    $("#editor").hide();
    $("#editor-placeholder").show();
    $("#editor-image").hide();
  },

  onImageBuffer: function(e) {
    $("#editor-pane").show();
    $("#editor").hide();
    $("#editor-placeholder").hide();
    $("#editor-image").show();
  },

  onImageLoaded: function(e) {
    if (e.detail.buffer != this.spark.currentBuffer) {
      return;
    }
    this.updateImage();
  },

  updateImage: function() {
    if (this.spark.currentBuffer == null) {
      $("#edited-image").hide();
    } else if (this.spark.currentBuffer.hasImageData) {
      $("#edited-image").show();
      $("#edited-image").one("load", function() {
        $("#edited-image").css('left', ($("#editor-image").width()
            - $("#edited-image").width()) / 2);
        $("#edited-image").css('top', ($("#editor-image").height()
            - $("#edited-image").height()) / 2);
      }).attr("src", this.spark.currentBuffer.imageData);
    } else {
      $("#edited-image").hide();
    }
  },

  closeTab: function(buffer) {
    if (buffer == this.spark.currentBuffer) {
      var currentBufferIndex = this.spark.currentBuffer.indexInTabs();
      var previousBuffer = null;

      this.closeBuffer(buffer);

      if (currentBufferIndex > 0) {
        previousBuffer = this.openedTabEntries[currentBufferIndex - 1];
      } else if (this.openedTabEntries.length > 0) {
        previousBuffer = this.openedTabEntries[0];
      }

      if (previousBuffer != null) {
        previousBuffer.switchTo();
      } else {
        var emptyDoc = CodeMirror.Doc('');
        this.spark.editor.swapDoc(emptyDoc);
        Buffer.showEmptyBuffer();
      }
    } else {
      this.closeBuffer(buffer);
    }
  },

  closeBuffer: function(buffer) {
    // Save before closing.
    buffer.save();
    buffer.fileEntry.buffer = null;
    buffer.fileEntry.active = false;
    buffer.removeTab();
  },
};


// Copyright (c) 2013 The Chromium Authors. All rights reserved.
//
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function SparkWindow(spark) {
  this.spark = spark;

  window.onerror = function(e) {
    console.log(e);
  };

  this.setupEditor();
  $(window).resize(this.onWindowResize.bind(this));
  this.onWindowResize(null);

  $("#run-button").click(this.handleRunButton.bind(this));
  $("#export-button").click(this.handleExportButton.bind(this));
  $(".tt").tooltip({ 'placement': 'bottom' });

};

SparkWindow.prototype = {
  onWindowResize: function(e) {
    var windowWidth = $(window).innerWidth();
    var windowHeight = $(window).innerHeight();
    var topBarHeight = $("#top-bar").outerHeight();
    // Hard-coded size because it won't work on launch. (dvh)
    topBarHeight = 45;

    $("#top-bar").width(windowWidth);
    $("#main-view").width(windowWidth);
    var mainViewHeight = windowHeight - topBarHeight;
    $("#main-view").height(mainViewHeight);
    // Hard-coded size because it won't work on launch. (dvh)
    var fileTreePaneWidth = 205;
    // Adds a right margin.
    var editorPaneWidth = windowWidth - fileTreePaneWidth;
    $("#editor-pane").width(editorPaneWidth);
    $("#editor-pane").height(mainViewHeight);
    $("#file-tree").height(mainViewHeight);
    $("#files-listview-container").height(mainViewHeight);
    var filesContainerHeight = $("#files-listview-actions").outerHeight();
    $("#files-listview").css('top', '40px');
    $("#files-listview").height(mainViewHeight - filesContainerHeight - 50);
    var tabsHeight = $('#tabs').outerHeight();
    // Hard-coded size because it won't work on first launch. (dvh)
    tabsHeight = 31 + 50;
    var editorHeight = mainViewHeight - tabsHeight;
    var editorWidth = editorPaneWidth;
    $("#tabs").width(editorWidth);
    $("#editor").css('position', 'absolute');
    $("#editor").css('top', '40px');
    $("#editor").width(editorWidth);
    $("#editor").height(editorHeight);
    $("#editor-placeholder").css('top', '40px');
    $("#editor-placeholder").width(editorPaneWidth);
    $("#editor-placeholder").height(editorHeight);
    $("#editor-placeholder div").css('line-height', editorHeight + 'px');
    $("#editor-image").css('top', '40px');
    $("#editor-image").width(editorWidth);
    $("#editor-image").height(editorHeight);
    $("#edited-image").css('left', (editorWidth - $("#edited-image").width()) / 2);
    $("#edited-image").css('top', (editorHeight - $("#edited-image").height()) / 2);

    $("#editor .CodeMirror").width(editorWidth);
    $("#editor .CodeMirror").height(editorHeight);
    $("#editor .CodeMirror-scroll").width(editorWidth);
    $("#editor .CodeMirror-scroll").height(editorHeight);
  },

  setupEditor: function() {
    var spark = this.spark;
    CodeMirror.commands.autocomplete = function(cm) {
      CodeMirror.showHint(cm, CodeMirror.javascriptHint);
    };

    CodeMirror.commands.closeBuffer = function(cm) {
      if (spark.tabsManager.currentBuffer != null) {
        spark.tabsManager.currentBuffer.userRemoveTab();
      }
    };

    spark.editor = CodeMirror(
        document.getElementById("editor"),
        {
          mode: {name: "javascript", json: true },
        lineNumbers: true,
        extraKeys: {"Ctrl-Space": "autocomplete", "Ctrl-W": "closeBuffer"},
        });

    spark.editor.on('change', spark.onEditorChange.bind(spark));

    $('#editor-placeholder-string').html('No file selected');

    Buffer.showEmptyBuffer();
  },

  handleRunButton: function(e) {
    e.preventDefault();
    var spark = this.spark;
    var exportFolderCb = function() {
      chrome.developerPrivate.loadProject(spark.ActiveProjectName,
          function(itemId) {
            // loadProject may return before the app is actually loaded returning
            // garbage item_id. However, a second call should succeed.
            // TODO (grv): Listen to loadProject event and return when the app
            // is loaded.
            setTimeout(function() {
              chrome.developerPrivate.loadProject(spark.ActiveProjectName,
                function(itemId) {
                  setTimeout(function() {
                    if (!itemId) {
                      console.log('invalid itemId');
                      return;
                    }
                    // Since the API doesn't wait for the item to load,may return
                    // before it has fully loaded. Delay the launch event.
                    chrome.management.launchApp(itemId, function(){});
                  }, 500);
                });
            }, 500);
          });
    };
    chrome.developerPrivate.exportSyncfsFolderToLocalfs(
        spark.ActiveProjectName, exportFolderCb.bind(spark));
  },

  handleExportButton: function(e) {
    e.preventDefault();
    var spark = this.spark;
    chrome.fileSystem.chooseEntry({ "type": "saveFile",
      "suggestedName": spark.ActiveProjectName + ".zip" },
      spark.exportProject.bind(spark));
  },
};


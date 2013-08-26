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
  $("#import-button").click(this.handleImportButton.bind(this));
  $(".tt").tooltip({ 'placement': 'bottom' });

};

SparkWindow.prototype = {
  onWindowResize: function(e) {
    var windowWidth = $(window).innerWidth();
    var windowHeight = $(window).innerHeight();
    var topBarHeight = $("#top-bar").outerHeight();
    // Hard-coded size because it won't work on launch. (dvh)
    topBarHeight = 72;

    $("#top-bar").width(windowWidth);
    $("#main-view").width(windowWidth);
    var mainViewHeight = windowHeight - topBarHeight;
    $("#main-view").height(mainViewHeight);
    // Hard-coded size because it won't work on launch. (dvh)
    var fileTreePaneWidth = 285;
    // Adds a right margin.
    var editorPaneWidth = windowWidth - fileTreePaneWidth;
    $("#files-listview-container").width(fileTreePaneWidth - 5);
    $("#files-listview").width(fileTreePaneWidth - 5);
    $("#editor-pane").css('left', fileTreePaneWidth + 'px');
    $("#editor-placeholder").css('left', fileTreePaneWidth + 'px');
    
    $("#editor-pane").width(editorPaneWidth);
    $("#editor-pane").height(mainViewHeight);
    $("#file-tree").height(mainViewHeight);
    $("#files-listview-container").height(mainViewHeight);
    var filesContainerHeight = $("#files-listview-actions").outerHeight();
    $("#files-listview").css('top', '40px');
    $("#files-listview").height(mainViewHeight - filesContainerHeight - 40);
    var tabsHeight = $('#tabs').outerHeight();
    // Hard-coded size because it won't work on first launch. (dvh)
    tabsHeight = 40 + 5;
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
    var activeProject = spark.getActiveProject();
    console.log(activeProject.entry);
    chrome.developerPrivate.loadDirectory(
        activeProject.entry, exportFolderCb.bind(spark));
  },

  runDirectory: function(directory, callback) {
    var spark = this.spark;
    var exportFolderCb = function() {
      console.log('comes in exprot');

      console.log(directory.name);
      chrome.developerPrivate.loadProject(directory.name,
          function(itemId) {
            // loadProject may return before the app is actually loaded returning
            // garbage item_id. However, a second call should succeed.
            // TODO (grv): Listen to loadProject event and return when the app
            // is loaded.
            setTimeout(function() {
              chrome.developerPrivate.loadProject(directory.name,
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
    chrome.developerPrivate.loadDirectory(
        directory, exportFolderCb.bind(spark));
  },

  handleExportButton: function(e) {
    e.preventDefault();
    var spark = this.spark;
    chrome.fileSystem.chooseEntry({ "type": "saveFile",
      "suggestedName": spark.ActiveProjectName + ".zip" },
      spark.exportProject.bind(spark));
  },

  handleImportButton: function(e) {
    e.preventDefault();
    var spark = this.spark;
    $('#ImportProjectModal').modal('show');
  },
};


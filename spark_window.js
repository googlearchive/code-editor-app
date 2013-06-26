// Copyright (c) 2013 The Chromium Authors. All rights reserved.
//
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function SparkWindow(spark) {
  this.spark = spark;
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
};


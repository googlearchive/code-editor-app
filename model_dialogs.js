// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function ModelDialogsController(spark) {
  this.spark = spark;
  this.setup();
}

ModelDialogsController.prototype = {
  setup: function() {
    var spark = this.spark;

    // Add project modal configuration.
    $('#AddProjectModal').on('show', function () {
      spark.modalShown = true;
    });
    $('#AddProjectModal').on('hide', function () {
      spark.modalShown = false;
      $('#new-project-name').blur();
    });
    $('#AddProjectModal').on('shown', function () {
      $('#new-project-name').val('');
      $('#new-project-name').focus();
    })
    $('#AddFileModal').on('show', function () {
      spark.modalShown = true;
    });
    $('#AddFileModal').on('hide', function () {
      spark.modalShown = false;
      $('#new-file-name').blur();
    });
    $('#AddFileModal').on('shown', function () {
      $('#new-file-name').val('');
      $('#new-file-name').focus();
    })
    $('#RemoveFilesModal').on('show', function () {
      var selection = spark.filesListViewController.selection();

      if (selection.length == 0) {
        return;
      }

      if (selection.length == 1) {
        $('#delete-modal-description').text('Do you really want to delete ' + selection[0].name + '?');
      } else {
        $('#delete-modal-description').text('Do you really want to delete ' + selection.length + ' files?');
      }

      spark.modalShown = true;
      spark.removeFilesModalShown = true;
    });
    $('#RemoveFilesModal').on('hide', function () {
      spark.modalShown = false;
      spark.removeFilesModalShown = false;
    });
    $('#RemoveFilesModal').on('shown', function () {
      spark.modalShown = true;
    })
    $('#RenameFilesModal').on('show', function () {
      spark.modalShown = true;
      spark.renameFilesModalShown = true;
    });
    $('#RenameFilesModal').on('hide', function () {
      spark.modalShown = false;
      spark.renameFilesModalShown = false;
      $('#rename-file-name').blur();
    });
    $('#RenameFilesModal').on('shown', function () {
      $('#rename-file-name').focus();
    })

    $('#new-file-name').keypress(this.onAddFileModalKeyPress.bind(this));
    $('#new-project-name').keypress(this.onAddProjectModalKeyPress.bind(this));
    $('#rename-file-name').keypress(this.onRenameFileModalKeyPress.bind(this));
    $('#RemoveFilesModal').keydown(this.modalDeleteDialogkeyDown.bind(this));
    $('#AddFileModal .btn-primary').click(this.onAddFileModalClicked.bind(this));
    $('#AddProjectModal .btn-primary').click(this.onAddProjectModalClicked.bind(this));
    $('#RemoveFilesModal .btn-primary').click(spark.onConfirmDeletion.bind(spark));
    $('#RenameFilesModal .btn-primary').click(spark.onConfirmRename.bind(spark));
  },

  // Button actions.

  onAddFileModalKeyPress: function(e) {
    if (e.keyCode == 13) {
      e.preventDefault();
      this.onAddFileModalClicked(e);
    }
  },

  onAddProjectModalKeyPress: function(e) {
    if (e.keyCode == 13) {
      e.preventDefault();
      this.onAddProjectModalClicked(e);
    }
  },

  onRenameFileModalKeyPress: function(e) {
    if (e.keyCode == 13) {
      e.preventDefault();
      this.spark.onConfirmRename(e);
    }
  },

  modalDeleteDialogkeyDown: function(e) {
    if (e.keyCode == 13) {
      e.preventdefault;
      this.onConfirmDeletion(null);
    }
  },

  onAddFileModalClicked: function(e) {
    var filename = $('#new-file-name').val();
    var spark = this.spark;
    var root = fileEntryMap[spark.getAbsolutePath(spark.ActiveProjectName)];
    spark.fileOperations.createFile(filename, root, function(fileNode, isCreated) {
      if (!isCreated) {
        spark.fileTree.refresh(false, function() {
          console.log('select ' + filename);
          spark.filesListViewController.setSelectionByNames([filename]);
        });
      }
    });
    $('#AddFileModal').modal('hide')
  },

  onAddProjectModalClicked: function(e) {
    var projectName = $('#new-project-name').val();
    this.spark.tabsManager.closeOpenedTabs();
    this.spark.ActiveProjectName = projectName;
    this.spark.writePrefs();
    var createProjectCb = function() {
      this.spark.refreshProjectList();
      $('#AddProjectModal').modal('hide')
    };
    this.spark.createProject(this.spark.ActiveProjectName,
        createProjectCb.bind(this));
  },
}

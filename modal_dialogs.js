// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function ModalDialogsController(spark) {
  this.spark = spark;
  this.setup();
}

ModalDialogsController.prototype = {
  setup: function() {
    var spark = this.spark;
    var mdc = this;

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

    // Add project modal configuration.
    $('#AddGitProjectModal').on('show', function () {
      spark.modalShown = true;
    });
    $('#AddGitProjectModal').on('hide', function () {
      spark.modalShown = false;
      $('#new-git-project-name').blur();
    });
    $('#AddGitProjectModal').on('shown', function () {
      $('#new-git-project-name').val('');
      $('#new-git-project-name').focus();
    })

    // Pull Model configuration.
    $('#GitPullModal').on('show', function () {
      spark.modalShown = true;
      var gitPull = mdc.onGitPull.bind(mdc);
      gitPull();
      console.log('sdfsadfsadf');
    });
    $('#GitPullModal').on('hide', function () {
      spark.modalShown = false;
    });

    // Push Model configuration.
    $('#GitPushModal').on('show', function () {
      spark.modalShown = true;
      var gitPush = mdc.onGitPush.bind(mdc);
      gitPush();
    });
    $('#GitPushModal').on('hide', function () {
      spark.modalShown = false;
      //$('#new-git-project-name').blur();
    });

    // Git Commit Model configuration.
    $('#GitCommitModal').on('show', function () {
      spark.modalShown = true;
    });
    $('#GitCommitModal').on('hide', function () {
      spark.modalShown = false;
      $('#git-email').blur();
    });

    // Git Branch Model configuration.
    $('#GitBranchModal').on('show', function () {
      spark.modalShown = true;
    });
    $('#GitBranchModal').on('hide', function () {
      spark.modalShown = false;
      $('#new-branch-name').blur();
    });

    // Git Checkout Model configuration.
    $('#GitCheckoutModal').on('show', function () {
      var dir = spark.getActiveProject().entry;
      spark.modalShown = true;
      console.log(dir);
      GitApi.getLocalBranches({dir: dir}, function(branches) {
        console.log(branches);
        var branchMenu = document.getElementById('checkoutBranch');
        branchMenu.innerHTML = '';
        branches.forEach(function(name, i) {
          var option = document.createElement('option');
          option.value = name;
          option.text = name;
          branchMenu.appendChild(option);
        console.log(branchMenu);
        console.log(option);
        });
      });
      GitApi.getCurrentBranch({dir: dir}, function(branch) {
        console.log(branch);
        $('#currentBranch').val(branch);
    });
    });

    $('#GitCheckoutModal').on('hide', function () {
      spark.modalShown = false;
    });

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
    $('#new-git-project-name').keypress(this.onAddGitProjectModalKeyPress.bind(this));
    $('#rename-file-name').keypress(this.onRenameFileModalKeyPress.bind(this));
    $('#RemoveFilesModal').keydown(this.modalDeleteDialogkeyDown.bind(this));
    $('#AddFileModal .btn-primary').click(this.onAddFileModalClicked.bind(this));
    $('#AddProjectModal .btn-primary').click(this.onAddProjectModalClicked.bind(this));
    $('#AddGitProjectModal .btn-primary').click(this.onAddGitProjectModalClicked.bind(this));
    $('#GitCommitModal .btn-primary').click(this.onGitCommitClicked.bind(this));
    $('#GitBranchModal .btn-primary').click(this.onGitBranchClicked.bind(this));
    $('#GitCheckoutModal .btn-primary').click(this.onGitCheckoutClicked.bind(this));

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

  onAddGitProjectModalKeyPress: function(e) {
    if (e.keyCode == 13) {
      e.preventDefault();
      this.onAddGitProjectModalClicked(e);
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
      console.log('created ' + fileNode);
      console.log(fileNode);
      if (!isCreated) {
        spark.filesListViewController.setSelectionByNames([fileNode.entry.fullPath]);
      }
    });
    $('#AddFileModal').modal('hide')
  },

  onAddProjectModalClicked: function(e) {
    $('#AddProjectModal').modal('hide')
    var projectName = $('#new-project-name').val();
    var createProjectCb = function() {
      this.spark.selectProject(projectName);
      this.spark.writePrefs();
    };
    this.spark.createProject(projectName, null,
        createProjectCb.bind(this));
  },

  onAddGitProjectModalClicked: function(e) {
    $('#AddGitProjectModal').modal('hide')
    var projectName = $('#new-git-project-name').val();
    var repoUrl = $('#remote-git-url').val();
    var createProjectCb = function() {
      this.spark.selectProject(projectName);
      this.spark.writePrefs();
    };
    this.spark.createProject(projectName, repoUrl,
        createProjectCb.bind(this));
  },

  onGitPull: function() {
    var gitPullCb = function() {
      console.log('pulling');
      $('#GitPullModal').modal('hide');
    };
    this.spark.gitClient.pull(gitPullCb);
  },

  onGitBranchClicked: function() {
    var branchName = $('#new-branch-name').val();
    var gitBranchCb = function() {
      console.log('branching');
      $('#GitBranchModal').modal('hide');
    };
    this.spark.gitClient.branch(branchName, gitBranchCb);
  },

  onGitCheckoutClicked: function() {
    var dir = this.spark.getActiveProject().entry;
    GitApi.getLocalBranches({dir: dir}, function(branches) {
      console.log(branches);
    });

    var branchName = $('#checkoutBranch').val();
    var gitCheckoutCb = function() {
      console.log('branching');
      $('#GitCheckoutModal').modal('hide');
    };
    this.spark.gitClient.checkout(branchName, gitCheckoutCb);
  },

  onGitCommitClicked: function() {
    var commitMessage = $('#commit-message');
    var name = $('#git-name');
    var email = $('#git-email');
    var gitCommitCb = function() {
      console.log('commiting');
      $('#GitCommitModal').modal('hide');
    };
    var options = {
      name: name,
      email: email,
      commitMsg : commitMessage
    };
    this.spark.gitClient.commit(options,gitCommitCb);
  },

  onGitPush: function() {
    var directory = this.spark.getActiveProject().entry;
    var gitPushCb = function() {
      console.log('pushing');
      $('#GitPushModal').modal('hide');
    };

    this.spark.gitClient.push(gitPushCb);
  },
}

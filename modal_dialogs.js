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
    var gitClient = spark.gitClient;

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
    $('#new-project-name').keypress(this.onAddProjectModalKeyPress.bind(this));
    $('#AddProjectModal .btn-primary').click(this.onAddProjectModalClicked.bind(this));

    // Import project modal configuration.
    $('#ImportProjectModal').on('show', function () {
      var templateMenu = document.getElementById('templateProject');
      templateMenu.innerHTML = '';
      spark.htmlfs.root.getDirectory('/.templates', {}, function(templates) {
        var dirReader = templates.createReader();
        dirReader.readEntries(function(results) {
          results.forEach(function(entry, i) {
            if (entry.isDirectory && entry.name.search('.git') == -1 ) {
              var option = document.createElement('option');
              option.value = entry.name;
              option.text = entry.name;
              templateMenu.appendChild(option);
            }
          });
        });
      });

      spark.modalShown = true;
    });
    $('#ImportProjectModal .btn-primary').click(this.onImportProjectModalClicked.bind(this));

    // Add Git project modal configuration.
    $('#AddGitProjectModal').on('show', function () {
      spark.modalShown = true;
    });
    $('#AddGitProjectModal').on('hide', function () {
      spark.modalShown = false;
      $('#new-git-project-name').blur();
      $('#AddGitProjectModalProgressContainer').attr('hidden', 'true');
      $('#AddGitProjectModalProgressBarValue').width('0px');
      $('#AddGitProjectModal input').removeAttr('disabled');
      $('#AddGitProjectModal .btn-primary').removeAttr('disabled');
    });
    $('#AddGitProjectModal').on('shown', function () {
      $('#new-git-project-name').val('');
      $('#new-git-project-name').focus();
    })
    $('#new-git-project-name').keypress(this.onAddGitProjectModalKeyPress.bind(this));
    $('#AddGitProjectModal .btn-primary').click(this.onAddGitProjectModalClicked.bind(this));

    // Pull Model configuration.
    $('#GitPullModal').on('show', function () {
      spark.modalShown = true;
      var gitPull = mdc.onGitPull.bind(mdc);
      gitPull();
    });
    $('#GitPullModal').on('hide', function () {
      spark.modalShown = false;
    });

    $('#GitPullModal .btn-primary').click(this.onGitPullClicked.bind(this));

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

    $('#GitPushModal .btn-primary').click(this.onGitPushClicked.bind(this));

    // Git Commit Model configuration.
    $('#GitCommitModal').on('show', function () {
      spark.modalShown = true;
      if (gitClient.settings.email)
        $('#git-email').val(gitClient.settings.email);
      if (gitClient.settings.name)
        $('#git-name').val(gitClient.settings.name);
    });
    $('#GitCommitModal').on('hide', function () {
      $('#git-email').val('');
      $('#git-name').val('');
      spark.modalShown = false;
      $('#git-email').blur();
    });
    $('#GitCommitModal .btn-primary').click(this.onGitCommitClicked.bind(this));

    // Git Branch Model configuration.
    $('#GitBranchModal').on('show', function () {
      spark.modalShown = true;
    });
    $('#GitBranchModal').on('hide', function () {
      spark.modalShown = false;
      $('#new-branch-name').blur();
      $('#new-branch-name').val('');
    });
    $('#GitBranchModal .btn-primary').click(this.onGitBranchClicked.bind(this));

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
    $('#GitCheckoutModal .btn-primary').click(this.onGitCheckoutClicked.bind(this));

    // Add File Modal configuration
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
    $('#new-file-name').keypress(this.onAddFileModalKeyPress.bind(this));
    $('#AddFileModal .btn-primary').click(this.onAddFileModalClicked.bind(this));
    
    // Remove File Modal configuration
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
    $('#RemoveFilesModal .btn-primary').click(spark.onConfirmDeletion.bind(spark));
    
    // Rename File Modal configuration
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
    $('#rename-file-name').keypress(this.onRenameFileModalKeyPress.bind(this));
    $('#RemoveFilesModal').keydown(this.modalDeleteDialogkeyDown.bind(this));
    $('#RenameFilesModal .btn-primary').click(spark.onConfirmRename.bind(spark));
    
    // Error modal configuration
    $('#ErrorMessageModal').on('show', function () {
      spark.modalShown = true;
    });
    $('#ErrorMessageModal').on('hide', function () {
      spark.modalShown = false;
    });
    $('#ErrorMessageModal .btn-primary').click(function() {
      $('#ErrorMessageModal').modal('hide');
    });
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
      this.spark.refreshProjectList();
      this.spark.selectProject(projectName);
      this.spark.writePrefs();
    };
    this.spark.createProject(projectName, null,
        createProjectCb.bind(this));
  },

  onImportProjectModalClicked: function(e) {
    var spark = this.spark;
    var projectName = $('#templateProject').val();
    var callback = function() {
      spark.refreshProjectList();
      spark.selectProject(spark.ActiveProjectName);
      spark.writePrefs();
      $('#ImportProjectModal').modal('hide')
    };
    console.log(projectName);
    spark.htmlfs.root.getDirectory('/.templates/' + projectName, {}, function(project) {
      project.psuedoName = spark.ActiveProjectName;
      spark.fileOperations.copyDirectory(project, fileEntryMap['/'], callback);
    });
  },

  onAddGitProjectModalClicked: function(e) {
    var projectName = $('#new-git-project-name').val();
    var username = $('#git-username').val();
    var password = $('#git-password').val();
    if (username)
      this.spark.gitClient.settings.username = username;
    if (password)
      this.spark.gitClient.settings.password = password;
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
    document.getElementById('GitPullMessage').innerHTML = 'Updated Project Successful!!';
    };
    document.getElementById('GitPullMessage').innerHTML = 'Pulling and Updating from repo.....';
    this.spark.gitClient.pull(gitPullCb);
  },

  onGitPullClicked: function() {
    $('#GitPullModal').modal('hide');
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
    var name = $('#git-name').val();
    var email = $('#git-email').val();
    if (name)
      this.spark.gitClient.settings.name = name;
    if (email)
      this.spark.gitClient.settings.email = email;
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

  onGitPushClicked: function() {
    $('#GitPushModal').modal('hide');
  },

  onGitPush: function() {
    var directory = this.spark.getActiveProject().entry;
    var gitPushCb = function() {
      console.log('pushing');
      document.getElementById('GitPushMessage').innerHTML = 'Push Successful!!';
    };

    var pushMessage = document.getElementById('GitPushMessage');
    console.log(pushMessage);
    pushMessage.innerHTML = 'pushing to repo....';
    this.spark.gitClient.push(gitPushCb);
  },
  
  showErrorMessage: function(title, message) {
    $('#error-dialog-title').text(title);
    $('#error-dialog-message').text(message);
    $('#ErrorMessageModal').modal('show');
  },
}

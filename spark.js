// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Spark = function() {
  chrome.syncFileSystem.requestFileSystem(this.onSyncFileSystemOpened.bind(this));

  var spark = this;

  CodeMirror.commands.autocomplete = function(cm) {
    CodeMirror.showHint(cm, CodeMirror.javascriptHint);
  };

  CodeMirror.commands.closeBuffer = function(cm) {
    if (spark.currentBuffer != null) {
      spark.currentBuffer.userRemoveTab();
    }
  };

  this.editor = CodeMirror(
    document.getElementById("editor"),
    {
      mode: {name: "javascript", json: true },
      lineNumbers: true,
      extraKeys: {"Ctrl-Space": "autocomplete", "Ctrl-W": "closeBuffer"},
    });

  this.editor.on('change', this.onEditorChange.bind(this));

  $("#run-button").click(this.handleRunButton.bind(this));
  $("#export-button").click(this.handleExportButton.bind(this));

  window.addEventListener("bufferSwitch", this.onBufferSwitch.bind(this));
  window.addEventListener("removeBuffer", this.onRemoveBuffer.bind(this));
  window.addEventListener("emptyBuffer", this.onEmptyBuffer.bind(this));
  window.addEventListener("imageBuffer", this.onImageBuffer.bind(this));
  window.addEventListener("imageLoaded", this.onImageLoaded.bind(this));
  
  $('#editor-placeholder-string').html('No file selected');
  Buffer.showEmptyBuffer();

  this.currentBuffer = null;

  // TODO(dvh): the timer should be triggered only if there's a change.
  window.setInterval(this.onSaveTimer.bind(this), 2000);

  $(window).resize(this.onWindowResize.bind(this));
  this.onWindowResize(null);

  $(".tt").tooltip({ 'placement': 'bottom' });

  this.filesListViewController = new FilesListViewController($('#files-listview'), this);

  this.setupModalDialogs();
  
  this.setupFileMenu();
}

Spark.prototype.setupModalDialogs = function() {
  var spark = this;
  
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
  $('#RemoveFilesModal .btn-primary').click(this.onConfirmDeletion.bind(this));
  $('#RenameFilesModal .btn-primary').click(this.onConfirmRename.bind(this));
}

Spark.prototype.hideFileMenu = function() {
  $('#files-menu').css('display', 'none');
  $('html').unbind('click', this.onClickFileMenuHandler);
  $('.caret', this.currentFileMenuElement).css('opacity', '');
}

Spark.prototype.onClickHideFileMenu = function(e) {
  // If that's in the menu, don't hide it and perform the action instead.
  if ($(e.target).parent().parent().get(0) == $('#files-menu').get(0)) {
    return;
  }
  this.hideFileMenu();
   e.preventDefault();
   e.stopPropagation();
};

Spark.prototype.setupFileMenu = function() {
  var spark = this;
  $('#files-menu-remove').click(function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    spark.hideFileMenu();
    $('#RemoveFilesModal').modal('show');
  });
  $('#files-menu-rename').click(function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    spark.hideFileMenu();
    
    var selection = spark.filesListViewController.selection();
    $('#rename-file-name').val(selection[0].name);
    
    $('#RenameFilesModal').modal('show');
  });
}

Spark.prototype.modalDeleteDialogkeyDown = function(e) {
  if (e.keyCode == 13) {
    e.preventdefault;
    this.onConfirmDeletion(null);
  }
}

Spark.prototype.onConfirmDeletion = function(e) {
  var count = 0;
  var spark = this;
  this.filesListViewController.selection().forEach(function(entry, i) {
    if (openedTabHash[entry.name] != null) {
      openedTabHash[entry.name].userRemoveTab();
    }
    count ++;
    entry.remove(function() {
      // deleted.
      count --;
      if (count == 0) {
        spark.filesListViewController.setSelection([]);
        spark.fileTree.refresh(false, null);
      }
    });
  });
  $('#RemoveFilesModal').modal('hide');
}

Spark.prototype.onConfirmRename = function(e) {
  var count = 0;
  var spark = this;
  var selection = this.filesListViewController.selection();
  var entry = selection[0];
  var buffer = openedTabHash[entry.name];
  if (buffer != null) {
    buffer.userRemoveTab();
  }
  
  var enteredName = $('#rename-file-name').val();
  
  entry.file(function(file) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function(ev) {
      spark.projects[spark.ActiveProjectName].getFile(
        enteredName, {create: true},
        function(createdEntry) {
          console.log("write " + createdEntry.name);
          createdEntry.createWriter(function(writer) {
            writer.truncate(0);
            writer.onwriteend = function() {
              console.log(ev.target.result);
              var blob = new Blob([ev.target.result]);
              writer.write(blob);
              writer.onwriteend = function() {
                entry.remove(function() {
                  spark.fileTree.refresh(false, function() {
                    spark.filesListViewController.setSelection([createdEntry]);
                  });
                  $('#RenameFilesModal').modal('hide');
                  // Done
                });
              };
            };
          });
        });
      };
    }, function() {});
}

// Buttons actions

Spark.prototype.onAddFileModalKeyPress = function(e) {
  if (e.keyCode == 13) {
    e.preventDefault();
    this.onAddFileModalClicked(e);
  }
}

Spark.prototype.onAddProjectModalKeyPress = function(e) {
  if (e.keyCode == 13) {
    e.preventDefault();
    this.onAddProjectModalClicked(e);
  }
}

Spark.prototype.onRenameFileModalKeyPress = function(e) {
  if (e.keyCode == 13) {
    e.preventDefault();
    this.onConfirmRename(e);
  }
}

Spark.prototype.onAddFileModalClicked = function(e) {
  var filename = $('#new-file-name').val();
  var spark = this;
  this.fileTree.createNewFile(filename, function() {
    spark.fileTree.refresh(false, function() {
      console.log('select ' + filename);
      spark.filesListViewController.setSelectionByNames([filename]);
    });
  });
  $('#AddFileModal').modal('hide')
}

Spark.prototype.onAddProjectModalClicked = function(e) {
  var projectName = $('#new-project-name').val();
  this.fileTree.closeOpenedTabs();
  this.ActiveProjectName = projectName;
  this.writePrefs();
  var createProjectCb = function() {
    this.refreshProjectList();
    $('#AddProjectModal').modal('hide')
  };
  this.createProject(this.ActiveProjectName, createProjectCb.bind(this));
}

// Buffers callback.
// TODO(dvh): needs to be refactored using callbacks instead of events.

Spark.prototype.onEmptyBuffer = function(e) {
  $("#editor-pane").hide();
  $("#editor").hide();
  $("#editor-placeholder").show();
  $("#editor-image").hide();
}

Spark.prototype.onImageBuffer = function(e) {
  $("#editor-pane").show();
  $("#editor").hide();
  $("#editor-placeholder").hide();
  $("#editor-image").show();
}

Spark.prototype.onImageLoaded = function(e) {
  if (e.detail.buffer != this.currentBuffer) {
    return;
  }
  this.updateImage();
}

Spark.prototype.updateImage = function() {
  if (this.currentBuffer == null) {
    $("#edited-image").hide();
  } else if (this.currentBuffer.hasImageData) {
    $("#edited-image").show();
    $("#edited-image").one("load", function() {
      $("#edited-image").css('left', ($("#editor-image").width() - $("#edited-image").width()) / 2);
      $("#edited-image").css('top', ($("#editor-image").height() - $("#edited-image").height()) / 2);
    }).attr("src", this.currentBuffer.imageData);
  } else {
    $("#edited-image").hide();
  }
}

Spark.prototype.onRemoveBuffer = function(e) {
  this.closeBufferTab(e.detail.buffer);
};

Spark.prototype.closeBuffer = function(buffer) {
  // Save before closing.
  buffer.save();
  buffer.fileEntry.buffer = null;
  buffer.fileEntry.active = false;
  buffer.removeTab();
}

Spark.prototype.closeBufferTab = function(buffer) {
  var spark = this;
  
  if (buffer == spark.currentBuffer) {
    var currentBufferIndex = spark.currentBuffer.indexInTabs();
    var previousBuffer = null;
  
    this.closeBuffer(buffer);
  
    if (currentBufferIndex > 0) {
      previousBuffer = openedTabEntries[currentBufferIndex - 1];
    } else if (openedTabEntries.length > 0) {
      previousBuffer = openedTabEntries[0];
    }
  
    if (previousBuffer != null) {
      previousBuffer.switchTo();
    } else {
      var emptyDoc = CodeMirror.Doc('');
      spark.editor.swapDoc(emptyDoc);
      Buffer.showEmptyBuffer();
    }
  } else {
    this.closeBuffer(buffer);
  }
}

// Window resize handler.

Spark.prototype.onWindowResize = function(e) {
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
}

Spark.prototype.ActiveProjectName = 'untitled';

Spark.prototype.refreshProjectList = function() {
  var menu = $('#project-selector .dropdown-menu');
  menu.empty();
  for (var name in this.projects) {
    // Do not list prefs file as a project.
    if (name == 'prefs')
      continue;
    var menuItem = $('<li><a tabindex="-1">' + htmlEncode(name) + '</a></li>');
    menuItem.click(this.onProjectSelect.bind(this, name));
    menu.append(menuItem)
    if (this.ActiveProjectName == name) {
      $('a', menuItem).addClass('menu-checkmark');
    }
  }
  $('#project-name').html(htmlEncode(this.ActiveProjectName));
};

Spark.prototype.onProjectSelect = function(projectName, e) {
  // TODO(dvh) : remember last loaded project name.
  this.fileTree.closeOpenedTabs();
  this.ActiveProjectName = projectName;
  this.writePrefs();
  this.fileTree.refresh(true, null);
  
  this.refreshProjectList();
};

Spark.prototype.onSaveTimer = function() {
  if (this.currentBuffer)
    this.currentBuffer.save();
};

Spark.prototype.onEditorChange = function(instance, changeObj) {
  if (this.currentBuffer)
    this.currentBuffer.markDirty();
};

Spark.prototype.onBufferSwitch = function(e) {
  if (this.currentBuffer)
    this.currentBuffer.active = false;
  this.currentBuffer = e.detail.buffer;
  var buffer = this.currentBuffer;
  buffer.active = true;

  $("#tabs").children().removeClass("active");
  buffer.tabElement.addClass("active");
  
  if (this.currentBuffer.isImage) {
    Buffer.showImageBuffer();
    this.updateImage();
  } else {
    $("#editor-pane").show();
    $("#editor").show();
    $("#editor-placeholder").hide();
    $("#editor-image").hide();
  }

  this.editor.swapDoc(buffer.doc);
};

Spark.prototype.handleRunButton = function(e) {
  e.preventDefault();
  var spark = this;
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
      this.ActiveProjectName, exportFolderCb.bind(this));
};

Spark.prototype.exportProject = function(fileEntry) {
  var zip = new JSZip();

  var writeZipFile = function() {
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onerror = function(e) {
        console.log("Export failed: " + e.toString());
      };

      var blob = zip.generate({"type": "blob"});
      fileWriter.truncate(blob.size);
      fileWriter.onwriteend = function() {
        fileWriter.onwriteend = function(e) {
          console.log("Export completed.");
        };

        fileWriter.write(blob);
      }
    }, errorHandler);
  }

  var entries = [];
  var zipEntries = function() {
    if (entries.length) {
      var entry = entries.pop();
      if (entry.isFile) {
        entry.file(function(file) {
          var fileReader = new FileReader();
          fileReader.onload = function(e) {
            zip.file(entry.name, e.target.result, { binary: true });
            zipEntries();
          };
          fileReader.onerror = function(e) {
            console.log("Error while zipping: " + e.toString());
          };
          fileReader.readAsBinaryString(file);
        }, errorHandler);
      } else {
        // TODO(grv): handle directories
        zipEntries();
      }
    } else {
      writeZipFile();
    }
  };
  this.filer.ls(this.ActiveProjectName, function(e) {
    entries = e;
    zipEntries();
  });
};

Spark.prototype.handleExportButton = function(e) {
  e.preventDefault();
  chrome.fileSystem.chooseEntry({ "type": "saveFile",
    "suggestedName": this.ActiveProjectName + ".zip" },
    this.exportProject.bind(this));
};

Spark.prototype.loadProjects = function(callback) {
  var reader = this.fileSystem.root.createReader();
  this.projects = {};
  var handleProjectsLs = function(projects) {
    for (var i = 0; i < projects.length; ++i) {
      // Skip showing files as projects.
      if (!projects[i].isDirectory) {
        continue;
      }
      this.projects[projects[i].name] = projects[i];
      if (projects[i].name == 'prefs')
        continue;
    }
    callback();
  };
  reader.readEntries(handleProjectsLs.bind(this));
};


Spark.prototype.createProject = function(project_name, callback) {
  var handleLoadProject = function(directory) {
    this.activeProject = directory;
    this.projects[project_name] = directory;
    console.log(directory);
    var templateLoadCb = function() {
      this.fileTree.refresh(true, null);
      this.refreshProjectList();
      callback();
    };
    this.templateLoader.loadTemplate(templateLoadCb.bind(this));
  };
  this.fileSystem.root.getDirectory(project_name,{create:true},
      handleLoadProject.bind(this), errorHandler);
};

Spark.prototype.loadPrefsFile = function(callback) {
  var spark = this;
  var handleOpenPrefs = function(entry) {
    spark.prefsEntry = entry;
    entry.file(function(file) {
      var reader = new FileReader();
      reader.readAsText(file, 'utf-8');
      reader.onload = function(ev) {
        // This is the first run of the editor.
        if (!ev.target.result.length) {
          spark.ActiveProjectName = "sample_app";
          spark.writePrefs.bind(spark);
          spark.writePrefs();

          var createProjectCb = function() {
            callback();
          };

          spark.createProject("sample_app", createProjectCb.bind(this));
        } else {
          spark.ActiveProjectName = ev.target.result;
          callback();
        }
      };
    });
  };
  this.filer.fs.root.getFile('prefs', {create: true}, handleOpenPrefs);
};

Spark.prototype.writePrefs = function() {
  var spark = this;
  this.prefsEntry.createWriter(function(writer) {
    writer.truncate(0);
    writer.onwriteend = function() {
      var blob = new Blob([spark.ActiveProjectName]);
      var size = spark.ActiveProjectName.length;
      writer.write(blob);
      writer.onwriteend = function() {
        console.log('prefs file write complete.');
      };
    };
  });
};

Spark.prototype.onSyncFileSystemOpened = function(fs) {
  var spark = this;
  console.log("Obtained sync file system");
  this.fileSystem = fs;
  this.filer = new Filer(fs);
  this.fileTree = new FileTree(this.filer, this);
  this.templateLoader = new TemplateLoader(this.fileTree, this);
  this.activeProject = this.fileSystem.root;

  chrome.syncFileSystem.setConflictResolutionPolicy('last_write_win');

  chrome.syncFileSystem.onFileStatusChanged.addListener(
      function(detail) {
        if (detail.direction == 'remote_to_local') {
          spark.loadProjects(function() {spark.refreshProjectList();});
          var buffer = openedTabHash[detail.fileEntry.name];
          if (buffer && buffer.fileEntry.fullPath == detail.fileEntry.fullPath) {
            buffer.fileEntry = detail.fileEntry;
            buffer.open();
            if (spark.currentBuffer.fileEntry.fullPath
                    == detail.fileEntry.fullPath) {
              spark.editor.swapDoc(buffer.doc);
            }
          }
        }
      });

  var loadPrefsFileCb = function() {
    this.refreshProjectList();
    this.fileTree.refresh(true, null);
  };

  var loadProjectsCb = function() {
    this.loadPrefsFile(loadPrefsFileCb.bind(this));
  };
  this.loadProjects(loadProjectsCb.bind(this));

  var spark = this;
  var dnd = new DnDFileController('body', function(files, e) {
    var items = e.dataTransfer.items;
    var entries = new Array();
    var pendingCount = 0;
    for (var i = 0, item; item = items[i]; ++i) {
      var entry = item.webkitGetAsEntry();
      entries.push(entry);
      var writeendCb = function() {
        console.log('writes done.');
        pendingCount --;
        if (pendingCount == 0) {
          spark.fileTree.refresh(false, function() {
            spark.filesListViewController.setSelection(entries);
          });
        }
      }
      if (entry.isDirectory) {
        var reader = entry.createReader();
        var handleDnDFoler = function(entries) {
          var fileEntries = [];
          for (var i = 0; i < entries.length; ++i) {
            if (entries[i].isDirectory) {
              console.log('Directories are not supported currently. Skipping'
                + ' adding: ' + entries[i].name);
              continue;
            }
            fileEntries.push(entries[i]);
          }

          pendingCount ++
          spark.templateLoader.writeFiles(fileEntries, writeendCb);
        };
        reader.readEntries(handleDnDFoler.bind(this));
      } else {
        pendingCount ++
        spark.templateLoader.writeFiles([entry], writeendCb);
      }
    }
  });
};

// FileTree callbacks.

Spark.prototype.fileViewControllerSetSelection = function(selectedEntries) {
  this.filesListViewController.setSelection(selectedEntries);
}

Spark.prototype.fileViewControllerTreeUpdated = function(entries) {
  this.filesListViewController.updateEntries(entries);
}

// FilesListViewController callback

Spark.prototype.filesListViewControllerSelectionChanged = function(selectedEntries) {
  // Do nothing.
}

Spark.prototype.filesListViewControllerDoubleClicked = function(selectedEntries) {
  if (selectedEntries.length == 1) {
    this.fileTree.openFileEntry(selectedEntries[0]);
  }
}

Spark.prototype.filesListViewControllerShowContextMenuForElement = function(element, event) {
  // Disable rename if number of selected files is not 1.
  if (this.filesListViewController.selection().length == 1) {
    $('#files-menu-rename').parent().removeClass('disabled');
  }
  else {
    $('#files-menu-rename').parent().addClass('disabled');
  }
    
  // Move the files context menu to the location of the caret.
  var x = getAbsoluteX(element.get(0));
  var y = getAbsoluteY(element.get(0)) + element.outerHeight()+ 5;
  $('#files-menu').css('display', 'block');
  $('#files-menu').css('top', y + 'px');
  $('#files-menu').css('left', x + 'px');
  this.currentFileMenuElement = element;
  $('.caret', this.currentFileMenuElement).css('opacity', '1.0');
    
  event.preventDefault();
  event.stopPropagation();

  this.onClickFileMenuHandler = this.onClickHideFileMenu.bind(this);
  // When the user will click anywhere in the page, it will hide the menu.
  $('html').bind('click', this.onClickFileMenuHandler);
}

$(function() {
  var spark = new Spark();
});

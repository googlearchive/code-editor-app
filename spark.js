// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Spark = function() {
  chrome.syncFileSystem.requestFileSystem(this.onSyncFileSystemOpened.bind(this));

  var spark = this;

  this.tabsManager = new TabsManager(this);
  CodeMirror.commands.autocomplete = function(cm) {
    CodeMirror.showHint(cm, CodeMirror.javascriptHint);
  };

  CodeMirror.commands.closeBuffer = function(cm) {
    if (spark.tabsManager.currentBuffer != null) {
      spark.tabsManager.currentBuffer.userRemoveTab();
    }
  };

  this.sparkWindow = new SparkWindow(this);

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

  window.onerror = function(e) {
    console.log(e);
  };

  $('#editor-placeholder-string').html('No file selected');
  Buffer.showEmptyBuffer();

  $(window).resize(this.onWindowResize.bind(this));
  this.onWindowResize(null);

  $(".tt").tooltip({ 'placement': 'bottom' });

  this.filesListViewController = new FilesListViewController($('#files-listview'), this);

  this.modelDialogsController = new ModelDialogsController(this);

  this.setupFileMenu();
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

Spark.prototype.onConfirmDeletion = function(e) {
  var count = 0;
  var spark = this;
  this.filesListViewController.selection().forEach(function(entry, i) {
    if (spark.tabsManager.openedTabHash[entry.name] != null) {
      spark.tabsManager.openedTabHash[entry.name].userRemoveTab();
    }
    count ++;
    var callback = function() {
      // deleted.
      count --;
      if (count == 0) {
        spark.filesListViewController.setSelection([]);
        spark.fileTree.refresh(false, null);
      }
    };
    spark.fileOperations.deleteFile(entry, callback);
  });

  $('#RemoveFilesModal').modal('hide');
}

Spark.prototype.onConfirmRename = function(e) {
  var count = 0;
  var spark = this;
  var selection = this.filesListViewController.selection();
  var entry = selection[0];
  var buffer = this.tabsManager.openedTabHash[entry.name];
  if (buffer != null) {
    buffer.userRemoveTab();
  }

  var enteredName = $('#rename-file-name').val();

  console.log(entry.fullPath);

  var renameCallback = function(fileEntry) {
    spark.fileTree.refresh(false, function() {
      console.log(entry);
      spark.filesListViewController.setSelection([fileEntry]);
    });
    $('#RenameFilesModal').modal('hide');
  };

  this.fileOperations.renameFile(entry, enteredName, renameCallback);
}

// Window resize handler.
Spark.prototype.onWindowResize = function(e) {
  this.sparkWindow.onWindowResize(e);
}

Spark.prototype.getAbsolutePath = function(name) {
  return '/' + name;
};

Spark.prototype.getActiveProject = function() {
  return fileEntryMap[this.getAbsolutePath(this.ActiveProjectName)];
};

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
  this.tabsManager.closeOpenedTabs();
  this.ActiveProjectName = projectName;
  this.writePrefs();
  this.fileTree.refresh(true, null);

  this.refreshProjectList();
};

Spark.prototype.onEditorChange = function(instance, changeObj) {
  if (this.tabsManager.currentBuffer)
    this.tabsManager.currentBuffer.markDirty();
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
        // TODO(miket): handle directories
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
  var root = fileEntryMap['/'];
  this.projects = {};
  for (var path in root.children) {
    this.projects[root.children[path].node.name] = root.children[path];
    callback();
  }
};

Spark.prototype.createProject = function(project_name, callback) {

  var handleLoadProject = function(directory) {
    this.activeProject = directory;
    this.projects[project_name] = directory;
    var templateLoadCb = function() {
      this.fileTree.refresh(true, null);
      this.refreshProjectList();
      callback();
    };
    this.templateLoader.loadTemplate(templateLoadCb.bind(this));
  };
  this.fileOperations.createDirectory(project_name,
      fileEntryMap[this.fileSystem.root.fullPath], handleLoadProject.bind(this));
};

Spark.prototype.loadPrefs = function(callback) {
  var spark = this;
  chrome.storage.sync.get('last_project', function(entry) {
    if (!entry.last_project) {
      spark.ActiveProjectName = 'sample_app';
      spark.writePrefs();
      var createProjectCb = function() {
        callback();
      };
      spark.createProject("sample_app", createProjectCb.bind(this));
    } else {
      spark.ActiveProjectName = entry.last_project;
      callback();
    }
  });
};

Spark.prototype.writePrefs = function() {
  chrome.storage.sync.set({'last_project': this.ActiveProjectName}, function() {
    console.log('prefs saved');
  });
};

var tries = 4;

Spark.prototype.onSyncFileSystemOpened = function(fs) {
  var spark = this;
  console.log("Obtained sync file system");
  this.fileSystem = fs;
  if (!fs) {
    if (tries) {
      tries--;
      chrome.syncFileSystem.requestFileSystem(spark.onSyncFileSystemOpened.bind(tries, this));
      return;
    }
    else {
      console.log('unable to obtain sync filesystem.');
      return;
    }
  }

  this.filer = new Filer(fs);
  this.fileTree = new FileTree(this.filer, this);
  this.templateLoader = new TemplateLoader(this.fileTree, this);
  this.activeProject = this.fileSystem.root;
  this.fileOperations = new FileOperations();
  var fileNodeCb = function() {
    var loadPrefsCb = function() {
      spark.refreshProjectList();
      spark.fileTree.refresh(true, null);
    };

    var loadProjectsCb = function() {
      spark.loadPrefs(loadPrefsCb.bind(spark));
    };
    spark.loadProjects(loadProjectsCb.bind(spark));
  };

  this.fileNode = new FileNode(this.fileSystem.root, null, fileNodeCb);

  chrome.syncFileSystem.setConflictResolutionPolicy('last_write_win');

  chrome.syncFileSystem.onFileStatusChanged.addListener(
      function(detail) {
        if (detail.direction == 'remote_to_local') {
          spark.loadProjects(function() {spark.refreshProjectList();});
          var buffer = this.tabsManager.openedTabHash[detail.fileEntry.name];
          if (buffer && buffer.fileEntry.fullPath == detail.fileEntry.fullPath) {
            buffer.fileEntry = detail.fileEntry;
            buffer.open();
            if (spark.tabsManager.currentBuffer.fileEntry.fullPath
                    == detail.fileEntry.fullPath) {
              spark.editor.swapDoc(buffer.doc);
            }
          }
        }
      });

  var spark = this;
  var pendingCount = 0;
  var dnd = new DnDFileController('body', function(files, e) {
    var items = e.dataTransfer.items;
    var pendingCount = items.length;
    for (var i = 0, item; item = items[i]; ++i) {
      var dndCallback = function() {
        pendingCount--;
        console.log('one batch written');
        if (!pendingCount) {
          spark.fileTree.refresh(false, null);
          console.log('all files written');
        }
      };
      var entry = item.webkitGetAsEntry();
      console.log(fileEntryMap);
      spark.fileOperations.copyDirectory(entry,
          spark.getActiveProject(spark.ActiveProjectName), dndCallback);
      console.log(entry);
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
    this.tabsManager.openTab(selectedEntries[0]);
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
})


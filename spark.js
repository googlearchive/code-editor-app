// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const USE_SYNC_FS = true;

Spark = function() {

  if (USE_SYNC_FS) {
    chrome.syncFileSystem.requestFileSystem(
        this.onSyncFileSystemOpened.bind(this));
  }
  else {
    window.requestFileSystem(window.PERSISTENT, 5*1024*1024*1024,
        this.onSyncFileSystemOpened.bind(this));
  }

  var spark = this;

  this.projects = null;
  this.sparkWindow = new SparkWindow(this);
  this.tabsManager = new TabsManager(this);
  this.gitClient = new GitClient(this);

  this.filesListViewController = new FilesListViewController($('#files-listview'), this);

  this.modalDialogsController = new ModalDialogsController(this);

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
  $('#files-menu-run').click(function(e) {
    e.preventDefault();
    e.stopPropagation();
    var selection = spark.filesListViewController.selection();
    console.log(selection[0]);
    spark.sparkWindow.runDirectory(selection[0]);
    spark.hideFileMenu();
    console.log(e);
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

  var renameCallback = function(entry) {
    $('#RenameFilesModal').modal('hide');
    spark.filesListViewController.setSelection([entry]);
  };

  this.fileOperations.renameFile(entry, enteredName, renameCallback);
}

Spark.prototype.getAbsolutePath = function(name) {
  return '/' + name;
};

Spark.prototype.getActiveProject = function() {
  return fileEntryMap[this.getAbsolutePath(this.ActiveProjectName)];
};

Spark.prototype.ActiveProjectName = 'untitled';

Spark.prototype.refreshProjectList = function() {
  var root = this.fileNode;
  this.projects = {};
  for (var path in root.children) {
    this.projects[root.children[path].entry.name] = root.children[path];
  }

  var menu = $('#project-selector .dropdown-menu');
  menu.empty();
  
  if (this.projects == null)
    return;

  var keys = Object.keys(this.projects);
  keys.sort(function(a,b) {
    if (a.toLowerCase() < b.toLowerCase())
      return -1;
    else if (a.toLowerCase() > b.toLowerCase())
      return 1;
    else
      return 0;
  });
  keys.forEach(function(name, i) {
    // Do not list prefs file as a project.
    if (name == 'prefs' || name == '.templates')
      return;
    var menuItem = $('<li><a tabindex="-1">' + htmlEncode(name) + '</a></li>');
    menuItem.click(this.onProjectSelect.bind(this, name));
    menu.append(menuItem)
    if (this.ActiveProjectName == name) {
      $('a', menuItem).addClass('menu-checkmark');
    }
  }.bind(this));
  $('#project-name').html(htmlEncode(this.ActiveProjectName));
};

Spark.prototype.selectProject = function(projectName) {
  this.tabsManager.closeOpenedTabs();
  this.ActiveProjectName = projectName;
  $('#project-name').html(htmlEncode(this.ActiveProjectName));

  this.filesListViewController.updateRoot(this.getActiveProject());
  this.refreshProjectList();
}

Spark.prototype.onProjectSelect = function(projectName, e) {
  this.selectProject(projectName);
  this.writePrefs();
};

Spark.prototype.onEditorChange = function(instance, changeObj) {
  if (this.tabsManager.currentBuffer)
    this.tabsManager.currentBuffer.markDirty();
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

  var entries = this.getActiveProject().children;
  var pendingWrites = Object.keys(entries).length;
  var zipEntry = function(entry) {
    if (entry.isFile) {
      entry.file(function(file) {
        var fileReader = new FileReader();
        fileReader.onload = function(e) {
          zip.file(entry.name, e.target.result, { binary: true });
          pendingWrites--;
          if (!pendingWrites)
          writeZipFile();
        };
        fileReader.onerror = function(e) {
          console.log("Error while zipping: " + e.toString());
        };
        fileReader.readAsBinaryString(file);
      }, errorHandler);
    } else {
      // TODO(grv): handle directories
    }
  };

  for (var key in entries) {
    zipEntry(entries[key].entry);
  }
};

Spark.prototype.createProject = function(project_name, source, callback) {

  var spark = this;
  var handleLoadProject = function(directory) {
    var templateLoadCb = function() {
      callback();
    };
    this.refreshProjectList();
    this.selectProject(project_name);
    if (source.search('.git') != -1) {
      var options = {
        dir: directory.entry,
        url: source,
        depth: 1
      };
      GitApi.clone(options, function() {
        console.log('Cloning repo' + source);
        var cb = function() {
          spark.refreshProjectList();
          spark.selectProject(project_name);
        };
        spark.fileOperations.copyDirectory(directory.entry, fileEntryMap['/'], cb);
      });
    } else {
      console.log(source);
      spark.templateLoader.loadTemplate(source, templateLoadCb.bind(this));
    }
  };
  this.fileOperations.createDirectory(project_name,
      fileEntryMap[this.fileSystem.root.fullPath], handleLoadProject.bind(this));
};

Spark.prototype.downloadChromeSamples = function() {
  var spark = this;

  var callback = function(templates) {
    var cb = function() {
      spark.refreshProjectList();
      spark.selectProject(spark.ActiveProjectName);
    };
  }

  window.requestFileSystem(window.PERSISTENT, 5*1024*1024*1024, function(fs) {
    spark.htmlfs = fs;
    fs.root.getDirectory('/.templates', {create:false}, function(templates) {
      callback(templates);
    }, function(e) {
      fs.root.getDirectory('/.templates', {create:true}, function(templates) {
        var repoUrl = 'https://github.com/GoogleChrome/chrome-app-samples.git';
        var options = {
          dir: templates,
          url: repoUrl,
          depth: 1
        };

        console.log('Downloading chrome app samples from ' + repoUrl);

        GitApi.clone(options, function() {
          callback(templates);
          console.log('downloaded chrome app samples.');
        });
      });
    })
  });
}

Spark.prototype.loadPrefs = function(callback) {
  chrome.storage.sync.get('last_project', function(entry) {
    if (!entry.last_project) {
      this.selectProject('sample_app');
      this.writePrefs();
      var createProjectCb = function() {
        callback();
      };
      this.createProject("sample_app", createProjectCb.bind(this));
    } else {
      this.selectProject(entry.last_project);
      callback();
    }
  }.bind(this));
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

  window.addEventListener("FileNodeTreeUpdated", this.onFileNodeTreeUpdated.bind(this));
  
  this.templateLoader = new TemplateLoader(this);
  this.activeProject = this.fileSystem.root;
  this.fileOperations = new FileOperations();
  var fileNodeCb = function() {
    var loadPrefsCb = function() {
      spark.refreshProjectList();
    };

    spark.loadPrefs(loadPrefsCb.bind(spark));
    spark.downloadChromeSamples();
  };

  this.fileNode = new FileNode(this.fileSystem.root, null, fileNodeCb);

  chrome.syncFileSystem.setConflictResolutionPolicy('last_write_win');

  chrome.syncFileSystem.onFileStatusChanged.addListener(
      function(detail) {
        if (detail.direction == 'remote_to_local') {
          //this.fileNode = new FileNode(this.fileSystem.root, null, fileNodeCb);
          
          var buffer = spark.tabsManager.openedTabHash[detail.fileEntry.name];
          if (buffer && buffer.fileEntry.fullPath == detail.fileEntry.fullPath) {
            buffer.fileEntry = detail.fileEntry;
            buffer.open();
            if (spark.tabsManager.currentBuffer.fileEntry.fullPath
                    == detail.fileEntry.fullPath) {
              spark.editor.swapDoc(buffer.doc);
            }
          }
        }
      }.bind(this));

  // Drag&Drop handler.
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
          console.log('all files written');
        }
      };
      var entry = item.webkitGetAsEntry();
      spark.fileOperations.copyDirectory(entry,
          spark.getActiveProject(spark.ActiveProjectName), dndCallback);
      console.log(entry);
    }
  });
};

// FileTree callbacks.

Spark.prototype.fileViewControllerSetSelection = function(selectedEntriesPaths) {
  this.filesListViewController.setSelection(selectedEntriesPaths);
}

Spark.prototype.fileViewControllerTreeUpdated = function(entries) {
  this.filesListViewController.updateRoot(this.getActiveProject());
}

// FilesListViewController callback

Spark.prototype.filesListViewControllerSelectionChanged = function(selectedEntries) {
  // Do nothing.
}

Spark.prototype.filesListViewControllerDoubleClicked = function(selectedEntries) {
  if (selectedEntries.length == 1) {
    if (selectedEntries[0].isDirectory) {
      // Don't open directories in the editor.
      return;
    }
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
  var y = getAbsoluteY(element.get(0)) + element.outerHeight() - 2;
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

Spark.prototype.onFileNodeTreeUpdated = function(event) {
  var path = event.detail.path;
  if (path != this.fileNode.entry.fullPath)
    return;

  console.log('project list updated');
  this.refreshProjectList();
}

$(function() {
  var spark = new Spark();
})


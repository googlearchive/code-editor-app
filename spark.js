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
    console.log('close file');
    if (spark.currentBuffer != null) {
      var currentBufferIndex = spark.currentBuffer.indexInTabs();
      var previousBuffer = null;
      
      // Save before closing.
      spark.currentBuffer.save();
      spark.currentBuffer.fileEntry.buffer = null;
      spark.currentBuffer.fileEntry.active = false;
      spark.currentBuffer.removeTab();
      
      if (currentBufferIndex > 0) {
        console.log('will switch to ' + (currentBufferIndex - 1));
        previousBuffer = openedTabEntries[currentBufferIndex - 1];
      } else if (openedTabEntries.length > 0) {
        console.log('will switch to first');
        previousBuffer = openedTabEntries[0];
      }
      
      if (previousBuffer != null) {
        previousBuffer.switchTo();
      } else {
        var emptyDoc = CodeMirror.Doc('');
        spark.editor.swapDoc(emptyDoc);
      }
    }
  };

  this.editor = CodeMirror(
    document.getElementById("editor"),
    {
      mode: {name: "javascript", json: true },
      lineNumbers: true,
      extraKeys: {"Ctrl-Space": "autocomplete", "Ctrl-W": "closeBuffer"}
    });

  this.editor.on('change', this.onEditorChange.bind(this));

  $("#new-button").click(this.handleNewButton.bind(this));
  $("#run-button").click(this.handleRunButton.bind(this));
  //$("#test-button").click(this.handleTestButton.bind(this));
  //$("#publish-button").click(this.handlePublishButton.bind(this));
  $("#export-button").click(this.handleExportButton.bind(this));
  $("#project-button").click(this.handleProjectButton.bind(this));

  window.addEventListener("bufferSwitch", this.onBufferSwitch.bind(this));

  this.currentBuffer = null;

  // TODO(dvh): the timer should be triggered only if there's a change.
  window.setInterval(this.onSaveTimer.bind(this), 2000);

  $(window).resize(this.onWindowResize.bind(this));
  this.onWindowResize(null);

  $(".tt").tooltip({ 'placement': 'bottom' });

  $("#alert").hide();

  var ss = $('#project-chooser');
  // TODO(grv) : remember last loaded project name.
  $('#project-chooser').change(this.onProjectSelect.bind(this));
};

Spark.prototype.onWindowResize = function(e) {
  var windowWidth = $(window).innerWidth();
  var windowHeight = $(window).innerHeight();
  var topBarHeight = $("#top-bar").outerHeight();
  var bottomBarHeight = $("#bottom-bar").outerHeight();
  // Hard-coded size because it won't work on launch. (dvh)
  topBarHeight = 45;
  bottomBarHeight = 45;
  
  $("#top-bar").width(windowWidth);
  $("#main-view").width(windowWidth);
  var mainViewHeight = windowHeight - topBarHeight - bottomBarHeight;
  $("#main-view").height(mainViewHeight);
  // Hard-coded size because it won't work on launch. (dvh)
  var fileTreePaneWidth = 205;
  // Adds a right margin.
  var editorPaneWidth = windowWidth - fileTreePaneWidth - 5;
  $("#editor-pane").width(editorPaneWidth);
  $("#editor-pane").height(mainViewHeight);
  $("#file-tree").height(mainViewHeight);
  $("#bottom-bar").width(windowWidth);
  var tabsHeight = $('#tabs').outerHeight();
  // Hard-coded size because it won't work on first launch. (dvh)
  tabsHeight = 37;
  // CodeMirror will add 20px to show some additional information. (dvh)
  var editorHeight = mainViewHeight - tabsHeight - 20;
  var editorWidth = editorPaneWidth;
  $("#tabs").width(editorWidth);
  $("#editor").width(editorWidth);
  $("#editor").height(editorHeight);
  
  $("#editor .CodeMirror").width(editorWidth);
  $("#editor .CodeMirror").height(editorHeight);
  $("#editor .CodeMirror-scroll").width(editorWidth);
  $("#editor .CodeMirror-scroll").height(editorHeight);
}

Spark.prototype.onProjectSelect = function(e) {
  this.fileTree.closeOpendTabs();
  this.ActiveProjectName = $('#project-chooser').val();
  this.writePrefs();
  this.fileTree.refresh();
};

Spark.prototype.ActiveProjectName = 'untitled';

Spark.prototype.refreshProjectList = function() {
  $('#project-chooser').empty();

  for (var name in this.projects) {
    // Do not list prefs file as a project.
    if (name == 'prefs')
      continue;
    $('#project-chooser').append($('<option>', { key : name }).text(name));
  }

  $('#project-chooser').val(this.ActiveProjectName);
  $('#new-project-name').val('');
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

  this.editor.swapDoc(buffer.doc);
};

Spark.prototype.setAlert = function(text) {
  $("#alert-text").text(text);
  $("#alert").show();
};

Spark.prototype.handleNewButton = function(e) {
  e.preventDefault();
  var newFileName = $("#new-file-name").val();
  this.fileTree.createNewFile(newFileName);
};

Spark.prototype.handleProjectButton = function(e) {
  e.preventDefault();

  this.ActiveProjectName = $('#new-project-name').val();
    this.writePrefs();
    var createProjectCb = function() {
      this.refreshProjectList();
    };
    this.createProject(this.ActiveProjectName, createProjectCb.bind(this));
};

Spark.prototype.handleRunButton = function(e) {
  e.preventDefault();
  var exportFolderCb = function() {
    chrome.developerPrivate.loadProject(this.ActiveProjectName,
        function(itemId) {
          chrome.management.launchApp(itemId, function(){});
        });
  };
  chrome.developerPrivate.exportSyncfsFolderToLocalfs(
      this.ActiveProjectName, exportFolderCb.bind(this));
};

/*Spark.prototype.handleTestButton = function(e) {
  e.preventDefault();
};

Spark.prototype.handlePublishButton = function(e) {
  e.preventDefault();
  this.setAlert("Publish isn't implemented yet.");
};*/

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
  this.filer.ls('.', function(e) {
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
      this.fileTree.refresh();
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
  console.log("Obtained sync file system");
  this.fileSystem = fs;
  this.filer = new Filer(fs);
  this.fileTree = new FileTree(this.filer, this);
  this.templateLoader = new TemplateLoader(this.fileTree, this);
  this.activeProject = this.fileSystem.root;

  var loadPrefsFileCb = function() {
    this.refreshProjectList();
    this.fileTree.refresh();
  };

  var loadProjectsCb = function() {
    this.loadPrefsFile(loadPrefsFileCb.bind(this));
  };

  this.loadProjects(loadProjectsCb.bind(this));

  var spark = this;
  var dnd = new DnDFileController('body', function(files, e) {
    var items = e.dataTransfer.items;
    for (var i = 0, item; item = items[i]; ++i) {
      var entry = item.webkitGetAsEntry();
      var writeendCb = function() {
        console.log('writes done.');
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

          spark.templateLoader.writeFiles(fileEntries, writeendCb);
          for (var i = 0; i < fileEntries.length; ++i) {
            spark.fileTree.createNewFile(fileEntries[i].name);
          }

        };
        reader.readEntries(handleDnDFoler.bind(this));
      } else {
        spark.templateLoader.writeFiles([entry], writeendCb);
        spark.fileTree.createNewFile(entry.name);
      }
    }
  });

};

$(function() {
  var spark = new Spark();
});

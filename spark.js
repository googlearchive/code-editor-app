// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Spark = function() {
  chrome.syncFileSystem.requestFileSystem(this.onSyncFileSystemOpened.bind(this));

  var spark = this;

  CodeMirror.commands.autocomplete = function(cm) {
    CodeMirror.showHint(cm, CodeMirror.javascriptHint);
  };

  this.editor = CodeMirror(
    document.getElementById("editor"),
    {
      mode: {name: "javascript", json: true },
      lineNumbers: true,
      extraKeys: {"Ctrl-Space": "autocomplete"}
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

  window.setInterval(this.onSaveTimer.bind(this), 2000);

  $(".tt").tooltip({ 'placement': 'bottom' });

  $("#alert").hide();

  var ss = $('#project-chooser');
  // TODO(grv) : remember last loaded project name.
  $('#project-chooser').change(this.onProjectSelect.bind(this));
};

Spark.prototype.onProjectSelect = function(e) {

  var loadProjectToSyncfsCb = function() {
    this.fileTree.refresh();
  }

  var clearFileSystemCb = function() {
    this.ActiveProjectName = $('#project-chooser').val();
    this.writePrefs();
    chrome.developerPrivate.loadProjectToSyncfs(
        this.ActiveProjectName, loadProjectToSyncfsCb.bind(this));
  };

  var exportFolderCb = function() {
    this.fileTree.clearFileSystem(clearFileSystemCb.bind(this));
  };

  chrome.developerPrivate.exportSyncfsFolderToLocalfs(
      this.ActiveProjectName, exportFolderCb.bind(this));
};

Spark.prototype.ActiveProjectName = 'untitled';

Spark.prototype.refreshProjectList = function(activeProject) {
  $('#project-chooser').empty();
  chrome.developerPrivate.getProjectsInfo(function(projectInfos) {
    for (var i = 0; i < projectInfos.length; ++i) {
      var name = projectInfos[i];
      $('#project-chooser').append(
          $('<option>', { key : name["name"] }).text(name["name"]));
    }
    $('#project-chooser').val(activeProject);
    $('#new-project-name').val('');
  });

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

  var clearFileSystemCb = function() {
    this.ActiveProjectName = $('#new-project-name').val();
    this.writePrefs();
    var exportCb = function() {
      var templateLoadCb = function() {
        this.refreshProjectList(this.ActiveProjectName);
        this.fileTree.refresh();
      }
      this.templateLoader.loadTemplate(templateLoadCb.bind(this));
    };

    chrome.developerPrivate.exportSyncfsFolderToLocalfs(
        this.ActiveProjectName, exportCb.bind(this));
  }

  var exportFolderCb = function() {
    this.fileTree.clearFileSystem(clearFileSystemCb.bind(this));
  }

  chrome.developerPrivate.exportSyncfsFolderToLocalfs(
      this.ActiveProjectName, exportFolderCb.bind(this));
};

Spark.prototype.handleRunButton = function(e) {
  e.preventDefault();
  var exportFolderCb = function() {
    chrome.developerPrivate.loadProject(this.ActiveProjectName,
        function(itemId) {
          /*chrome.developerPrivate.launchApp(itemId, function() {
          });*/
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
          var templateLoadCb = function() {
            callback();
            this.fileTree.refresh();
          }
          spark.templateLoader.loadTemplate(templateLoadCb.bind(spark));
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
        console.log('write complete.');
      };
    };
  });
};

Spark.prototype.onSyncFileSystemOpened = function(fs) {
  console.log("Obtained sync file system");
  this.fileSystem = fs;
  this.filer = new Filer(fs);
  this.fileTree = new FileTree(this.filer, this);
  this.templateLoader = new TemplateLoader(this.fileTree);

  var loadPrefsFileCb = function() {
    var exportFolderCb = function() {
      this.refreshProjectList.bind(this);
      this.refreshProjectList(this.ActiveProjectName);
    };
    chrome.developerPrivate.exportSyncfsFolderToLocalfs(
        this.ActiveProjectName, exportFolderCb.bind(this));
  };

  this.loadPrefsFile(loadPrefsFileCb.bind(this));

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

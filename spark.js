Spark = function() {
  if (false) {
    chrome.syncFileSystem.requestFileSystem(this.onFileSystemOpened);
  } else {
    webkitRequestFileSystem(window.PERSISTENT, 1024 * 1024 * 10,
      this.onFileSystemOpened.bind(this),
      errorHandler);
  }

  this.initContextMenu();

  var spark = this;
  this.editor = CodeMirror(
    document.getElementById("editor"),
    {
      mode: {name: "javascript", json: true },
      lineNumbers: true,
      extraKeys: {
        "Cmd-S": function(instance) { spark.handleSaveButton.bind(spark) },
        "Ctrl-S": function(instance) { spark.handleSaveButton.bind(spark) },
      }
    });

  this.editor.on('change', this.onEditorChange.bind(this));

  $("#new-button").click(this.handleNewButton.bind(this));
  $("#run-button").click(this.handleRunButton.bind(this));
  $("#publish-button").click(this.handlePublishButton.bind(this));
  $("#export-button").click(this.handleExportButton.bind(this));

  window.addEventListener("bufferSwitch", this.onBufferSwitch.bind(this));

  this.currentBuffer = null;

  window.setInterval(this.onSaveTimer.bind(this), 2000);

  $("#alert").hide();
};

Spark.prototype.onSaveTimer = function() {
  if (this.currentBuffer)
    this.currentBuffer.save();
}

Spark.prototype.onEditorChange = function(instance, changeObj) {
  if (this.currentBuffer)
    this.currentBuffer.markDirty();
};

Spark.prototype.onBufferSwitch = function(e) {
  if (this.currentBuffer) {
    this.currentBuffer.onInactive();
  }
  this.currentBuffer = e.detail.buffer;
  var buffer = this.currentBuffer;
  buffer.onActive();

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
}

Spark.prototype.handleRunButton = function(e) {
  e.preventDefault();
  this.setAlert("Run isn't implemented yet.");
}

Spark.prototype.handlePublishButton = function(e) {
  e.preventDefault();
  this.setAlert("Publish isn't implemented yet.");
}

Spark.prototype.handleExportButton = function(e) {
  e.preventDefault();
  this.setAlert("Export isn't implemented yet.");
}

chrome.contextMenus.onClicked.addListener(function(info) {
  // Context menu command wasn't meant for us.
  if (!document.hasFocus())
{    return;
  }

  // editor.replaceSelection(SNIPPETS[info.menuItemId]);
});

Spark.prototype.onFileSystemOpened = function(fs) {
  console.log("Obtained file system");
  this.fileSystem = fs;
  this.fileTree = new FileTree(fs);
};

Spark.prototype.initContextMenu = function() {
  chrome.contextMenus.removeAll(function() {
    // for (var snippetName in SNIPPETS) {
    //   chrome.contextMenus.create({
    //     title: snippetName,
    //     id: snippetName,
    //     contexts: ['all']
    //   });
    // }
  });
};

$(function() {
  var spark = new Spark();
});

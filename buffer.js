Buffer = function(fileEntry) {
  this.fileEntry = fileEntry;

  this.tabElement = $("<li><a href='#'>" + fileEntry.name + "</a></li>");
  this.tabElement.click(this.switchTo.bind(this));
  $("#tabs").append(this.tabElement);

  this.doc = CodeMirror.Doc('<loading>');

  this.open();
  this.switchTo();
};

Buffer.prototype.markDirty = function() {
  // TODO(miket): we save so quickly that a visual indicator of unsaved work
  // would be distracting. Perhaps instead raise an alert if saving fails?
  if (!this.isDirty)
    this.isDirty = true;
}

Buffer.prototype.switchTo = function() {
  var event = new CustomEvent("bufferSwitch",
    { detail: { buffer: this }});
  window.dispatchEvent(event);
  this.handleDocumentChange();
};

Buffer.prototype.handleDocumentChange = function() {
  var title = this.fileEntry.name;
  var mode = "javascript";
  var modeName = "JavaScript";
  if (title) {
    title = title.match(/[^/]+$/)[0];
    document.getElementById("title").innerHTML = title;
    document.title = title;
    if (title.match(/.json$/)) {
      mode = {name: "javascript", json: true};
      modeName = "JavaScript (JSON)";
    } else if (title.match(/.html$/)) {
      mode = "htmlmixed";
      modeName = "HTML";
    } else if (title.match(/.css$/)) {
      mode = "css";
      modeName = "CSS";
    }
  } else {
    document.getElementById("title").innerHTML = "[no document loaded]";
  }
  this.doc.getEditor().setOption("mode", mode);
  document.getElementById("mode").innerHTML = modeName;
}

Buffer.prototype.setFile = function(theFileEntry, isWritable) {
  fileEntry = theFileEntry;
  hasWriteAccess = isWritable;
}

Buffer.prototype.open = function() {
  var buffer = this;
  buffer.fileEntry.file(function(file) {
    var fileReader = new FileReader();

    fileReader.onload = function(e) {
      buffer.doc.setValue(e.target.result);
      buffer.handleDocumentChange(buffer.fileEntry.name);
      buffer.isDirty = false;
    };

    fileReader.onerror = function(e) {
      console.log("Read failed: " + e.toString());
    };

    fileReader.readAsText(file);
  }, errorHandler);
}

Buffer.prototype.save = function() {
  if (!this.isDirty)
    return;

  var buffer = this;
  buffer.fileEntry.createWriter(function(fileWriter) {
    fileWriter.onwriteend = function(e) {
      var blob = new Blob([buffer.doc.getValue()]);
      fileWriter.write(blob);
      fileWriter.onwriteend = function(e) {
        buffer.isDirty = false;
      }
    };

    fileWriter.onerror = function(e) {
      console.log("Write failed: " + e.toString());
    };

    fileWriter.truncate(0);
  }, errorHandler);
}

Buffer.prototype.onChosenFileToOpen = function(theFileEntry) {
  setFile(theFileEntry, true);
  readFileIntoEditor(theFileEntry);
};

Buffer.prototype.onChosenDirectoryToOpen = function(theDirectoryEntry) {
  console.log("chosen dir");
  directoryEntry = theDirectoryEntry;
  directoryEntry.getFile('myFile.txt', {create: true}, onChosenFileToOpen);
};

Buffer.prototype.onWritableFileToOpen = function(theFileEntry) {
  setFile(theFileEntry, true);
  readFileIntoEditor(theFileEntry);
};

Buffer.prototype.onChosenFileToSave = function(theFileEntry) {
  setFile(theFileEntry, true);
  writeEditorToFile(theFileEntry);
};

Buffer.prototype.onActive = function() {

};

Buffer.prototype.onInactive = function() {

};

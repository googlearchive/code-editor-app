FileTree = function(fileSystem) {
  this.fileSystem = fileSystem;
  this.parentElement = $('#filetree');
  this.fileSystem.root.getDirectory(this.PROJECT_PREFIX, {create: true},
    this.handleProjectsDirectoryEntry.bind(this), errorHandler);
};

FileTree.prototype.PROJECT_PREFIX = '/projects';

FileTree.prototype.handleProjectsDirectoryEntry = function(dirEntry) {
  this.projectsDir = dirEntry;
  this.readProjects(dirEntry);
};

FileTree.prototype.readProjects = function(dirEntry) {
  var dirReader = dirEntry.createReader();
  var entries = [];

  var fileTree = this;
  var readEntries = function() {
   dirReader.readEntries(function(results) {
    if (!results.length) {
      fileTree.listResults(entries.sort());
    } else {
      entries = entries.concat(toArray(results));
      readEntries();
    }
  }, errorHandler);
 };

 readEntries();
};

FileTree.prototype.listResults = function(entries) {
  var fileTree = this;
  entries.forEach(function(entry, i) {
    fileTree.handleCreatedEntry(entry);
  });
};

FileTree.prototype.createNewFile = function(name) {
  this.fileSystem.root.getFile(this.PROJECT_PREFIX + '/' + name,
    {create: true, exclusive: true},
    this.handleCreatedEntry.bind(this),
    errorHandler);
}

FileTree.prototype.handleDeleteFile = function(fileEntry, fragment, info, tab) {

};

FileTree.prototype.handleCreatedEntry = function(fileEntry) {
  var fragment = $('<li>');

  var mainIcon = $('<i>');
  if (fileEntry.isDirectory)
    mainIcon.addClass("icon-folder-close");
  else
    mainIcon.addClass("icon-file");
  var deleteIcon = $('<i>').addClass("icon-trash");
  fragment.append(mainIcon);
  fragment.append(['<span>', fileEntry.name, '</span>'].join(''));
  fragment.append(deleteIcon);

  deleteIcon.click(function() {
    fileEntry.remove(function() {
      fragment.remove();
    });
  });

  var fileSystem = this.fileSystem;
  fragment.dblclick(function() {
    if (!fileEntry.buffer) {
      // This feels wrong.
      fileEntry.buffer = new Buffer(fileEntry);
    } else {
      fileEntry.buffer.switchTo();
    }
  });

  this.parentElement.append(fragment);
};

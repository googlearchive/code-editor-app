// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function GitClient(spark) {
  this.spark = spark;
  this.settings = {};
}

var errorhandler = function(e) {
  console.log(e);
  console.log('something went wrong.');
}

GitClient.prototype = {
  pull: function(callback) {
    var directory = this.spark.getActiveProject().entry;
    var options = {
      dir: directory,
    };

    GitApi.pull(options, function() {
      console.log('pull complete');
      callback();
    }, function(e) {
      document.getElementById('GitPullMessage').innerHTML = e.msg;
      errorhandler(e);
    });
  },

  branch: function(branchName, callback) {
    var directory = this.spark.getActiveProject().entry;
    GitApi.branch({dir: directory, branch: branchName}, function() {
      GitApi.checkout({dir: directory, branch: branchName}, function(){
        // checkout complete, do a push here
        console.log('branching done');
        callback();
        });
    }, errorhandler);
  },

  checkout: function(branchName, callback) {
    var directory = this.spark.getActiveProject().entry;
    console.log(branchName);
    GitApi.checkout({dir: directory, branch: branchName}, function(){
      // checkout complete, do a push here
      console.log('checkout done.');
      callback();
    }, errorhandler);
  },

  commit: function(options, callback) {
    var directory = this.spark.getActiveProject().entry;
    options.dir = directory;
    GitApi.commit(options, function() {
      console.log('commit done.');
      callback();
    }, errorhandler);
  },

  push: function(callback) {
    var directory = this.spark.getActiveProject().entry;
    var options = {
      dir: directory,
      username: this.settings.username,
      password: this.settings.password
    };

    GitApi.push(options, function() {
      console.log('push done.');
      callback();
    }, function(e) {
      document.getElementById('GitPushMessage').innerHTML = e.msg;
      errorhandler(e);
    });
  },
};

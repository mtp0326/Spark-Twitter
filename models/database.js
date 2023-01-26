var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
var db = new AWS.DynamoDB();
var s3 = new AWS.S3();
// const S3 = require('aws-sdk/clients/s3')




//gets username input and returns the password (this is just for one column)
var myDB_getPassword = function (searchTerm, callback) {
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [{ S: searchTerm }]
      }
    },
    TableName: "users",
    AttributesToGet: ['password']
  };

  db.query(params, function (err, data) {
    if (err || data.Items.length == 0) {
      callback(err, null);
    } else {
      callback(err, data.Items[0].password.S);
    }
  });
}

//gets username input and returns the username if existing
var myDB_usernameLookup = function (searchTerm, callback) {
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [{ S: searchTerm }]
      }
    },
    TableName: "users",
    AttributesToGet: ['username']
  };

  db.query(params, function (err, data) {
    if (err || data.Items.length == 0) {
      callback(err, null);
    } else {
      callback(err, data.Items[0].username.S);
    }
  });
}

//create a new account with the right db parameters
var myDB_createAccount =
  function (newUsername, newPassword, newFullname, newBirthday, newPfpURL, callback) {

    console.log("creating new account: " + newUsername + " ...");
    console.log(newUsername);
    console.log(newPassword);
    console.log(newFullname);
    console.log(newBirthday);
    console.log(newPfpURL);

    var params = {
      TableName: "users",
      Item: {
        "username": { S: newUsername },
        "birthday": { S: newBirthday },
        "fullname": { S: newFullname },
        "password": { S: newPassword },
        "pfpURL": { S: newPfpURL }
      }
    };

    db.putItem(params, function (err, data) {
      if (err) {
        console.log("error: " + err);
      }
    });
  }

var myDB_allPosts = (function (userID, callback) {
  var params = {
    TableName: "posts",
    KeyConditionExpression: "userID = :a",
    ExpressionAttributeValues: {
      ":a": { S: userID }
    }
  };

  db.query(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      callback(err, data.Items);
    }
  });
});

//outputs followers
var myDB_getFollowers = (function (username, callback) {
  var params = {
    TableName: "users",
    KeyConditions: {
      username: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [{ S: username }]
      }
    },
    AttributesToGet: ['followers']
  };

  db.query(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      if (data.Items[0].followers == undefined) {
        var empty = [];
        callback(err, empty);
      } else {
        callback(err, data.Items[0].followers.SS);
      }
    }
  });
});

//outputs following
var myDB_getFollowings = (function (username, callback) {
  var params = {
    TableName: "users",
    KeyConditions: {
      username: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [{ S: username }]
      }
    },
    AttributesToGet: ['following']
  };

  db.query(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      if (data.Items[0].following == undefined) {
        var empty = [];
        callback(err, empty);
      } else {
        callback(err, data.Items[0].following.SS);
      }
    }
  });
});

//gets username input and gives the entire user entity
var myDB_userInfo = function (searchTerm, language, callback) {
  var params = {
    Key: {
      "username": {
        S: searchTerm
      }
    },
    TableName: "users"
  };
  db.getItem(params, function (err, data) {
    if (err) {
      console.log(err);
      callback(err, null);
    } else {
      callback(err, data.Item);
    }
  });
}

//creates post with the right db parameters
var myDB_createPost = function (userID, content, timepost, hashtags, callback) {
  console.log("hashtags");
  console.log(hashtags);
  var params = {
    TableName: "posts",
    Item: {
      "userID": {
        S: userID
      },
      "content": {
        S: content
      },
      "timepost": {
        S: timepost
      },
      "postType": {
        S: "posts"
      },
      "comments": {
        L: []
      }
    }
  };

  if(hashtags.length > 1) {
    hashtags.splice(hashtags.length - 1);
    params = {
      TableName: "posts",
      Item: {
        "userID": {
          S: userID
        },
        "content": {
          S: content
        },
        "timepost": {
          S: timepost
        },
        "postType": {
          S: "posts"
        },
        "hashtags": {
          SS: hashtags
        },
        "comments": {
          L: []
        }
      }
    }
  }
    

  db.putItem(params, function (err, data) {
    if (err) {
      console.log(err);
    }
    callback(err, data);
  });
}

var myDB_addHashtag = function (hashtagID, userID, timepost, callback) {
  var postID = userID + "-" + timepost;
  var paramsQuery = {
    TableName: "hashtags",
    KeyConditionExpression: "hashtagID = :a",
    ExpressionAttributeValues: {
      ":a": { S: hashtagID }
    }
  };

  db.query(paramsQuery, function (err, data) {
    if (err) {
      console.log(err);
    }
    console.log("data length");
    console.log(data);
    if (data.Items.length == 0) {
      var paramsPut = {
        TableName: "hashtags",
        Item: {
          "hashtagID": {
            S: hashtagID
          },
          "postID": {
            SS: [postID]
          }
        }
      };

      db.putItem(paramsPut, function (err, data) {
        if (err) {
          console.log(err);
        }
        callback(err, data);
      });
    } else {
      var paramsUpdate = {
        TableName: "hashtags",
        Key: {
          'hashtagID': {
            S: hashtagID
          }
        },
        UpdateExpression: 'ADD postID :c',
        ExpressionAttributeValues: {
          ':c': { SS: [postID] }
        }
      };

      db.updateItem(paramsUpdate, function (err, data) {
        if (err) {
          console.log(err);
        }
        callback(err, data);
      });
    }
  });
}

//adds comment in post using userID (partition key) and timepost (sort key)
var myDB_addComment = function (userID, timepost, comment, table, callback) {
  var paramsGet;

  if (table === "posts") {
    paramsGet = {
      TableName: "posts",
      KeyConditionExpression: 'userID = :a and timepost = :b',
      ExpressionAttributeValues: {
        ':a': { S: userID },
        ':b': { S: timepost }
      }
    };
  } else {
    var userIDArray = [];
    userIDArray = userID.split(" ");
    var receiver = userIDArray[2];
    paramsGet = {
      TableName: "profiles",
      KeyConditionExpression: 'receiver = :a and timepost = :b',
      ExpressionAttributeValues: {
        ':a': { S: receiver },
        ':b': { S: timepost }
      }
    };
  }

  db.query(paramsGet, function (err, data) {
    var tempArr = [];
    if (data != null) {
      tempArr = data.Items[0].comments.L;
    }
    var stringifyComment = {
      S: comment
    }

    tempArr.push(stringifyComment);

    var paramsUpdate;
    if (table === "posts") {
      paramsUpdate = {
        TableName: "posts",
        Key: {
          'userID': {
            S: userID
          },
          'timepost': {
            S: timepost
          },
        },
        UpdateExpression: 'SET comments = :c',
        ExpressionAttributeValues: {
          ':c': { L: tempArr }
        }
      };
    } else {
      paramsUpdate = {
        TableName: "profiles",
        Key: {
          'receiver': {
            S: receiver
          },
          'timepost': {
            S: timepost
          },
        },
        UpdateExpression: 'SET comments = :c',
        ExpressionAttributeValues: {
          ':c': { L: tempArr }
        }
      };
    }

    db.updateItem(paramsUpdate, function (err, data) {
      if (err) {
        console.log(err);
      }
    });
  });
}

//get all the available user ids
var myDB_getAllUsername = (function (callback) {
  var params = {
    TableName: "users",
    ProjectionExpression: 'username'
  };

  db.scan(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      callback(err, data.Items);
    }
  });
});

//get all the available hashtag postids
var myDB_getAllHashtags = (function (callback) {
  var params = {
    TableName: "hashtags",
    ProjectionExpression: 'hashtagID'
  };

  db.scan(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      callback(err, data.Items);
    }
  });
});

//get specific hashtag postids
var myDB_getHashtagID = (function (hashtagID, callback) {
  var params = {
    Key: {
      "hashtagID": {
        S: hashtagID
      }
    },
    TableName: "hashtags"
  };
  
  db.getItem(params, function (err, data) {
    if (err) {
      console.log(err);
      callback(err, null);
    } else {
      callback(err, data.Item);
    }
  });
});

var myDB_getspecificPost = (function (userID, timepost, callback) {
  var params = {
    TableName: "posts",
    KeyConditionExpression: 'userID = :a and timepost = :b',
    ExpressionAttributeValues: {
      ':a': { S: userID },
      ':b': { S: timepost }
    }
  };
  db.query(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      callback(err, data.Items);
    }
  });
});

//update the userinfo
var myDB_updateUser = function (username, variable, columnName, callback) {
  var params = {
    Key: {
      "username": { S: username }
    },
    UpdateExpression: 'SET ' + columnName + ' = :c',
    ExpressionAttributeValues: {
      ':c': { S: variable }
    },
    TableName: "users",
  };

  db.updateItem(params, function (err, data) {
    if (err) {
      console.log("error: " + err);
    } else {
      callback("updated");
    }
  });
}

// Add user1 to user2's followers set
var myDB_addFollower = function (user1, user2, callback) {
  var add1To2 = { SS: [user1] };
  var params = {
    TableName: "users",
    Key: { "username": { S: user2 } },
    UpdateExpression: "ADD followers :newUserID",
    ExpressionAttributeValues: {
      ":newUserID": add1To2
    },
  }
  db.updateItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    }
    callback(err, data);
  });
}

// Add user1 to user2's followers set
var myDB_addFollowing = function (user1, user2, callback) {
  var add1To2 = { SS: [user1] };
  var params = {
    TableName: "users",
    Key: { "username": { S: user2 } },
    UpdateExpression: "ADD following :newUserID",
    ExpressionAttributeValues: {
      ":newUserID": add1To2
    },
  }
  db.updateItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    }
    callback(err, data);
  });
}

//add likes to the db with a string set of usernames (the size of the string set becomes the number of likes)
var myDB_addLike = function (userID, likedUser, timepost, postType, callback) {
  var userStringSet = { SS: [likedUser] };
  console.log("addLike");
  console.log(userID);
  console.log(likedUser);
  console.log(timepost);
  console.log(postType);


  var params;
  if (postType === "posts") {
    params = {
      TableName: "posts",
      Key: {
        'userID': {
          S: userID
        },
        'timepost': {
          S: timepost
        },
      },
      UpdateExpression: "ADD likes :a",
      ExpressionAttributeValues: {
        ":a": userStringSet
      },
    }
  } else {
    var userIDArray = [];
    userIDArray = userID.split(" ");
    var receiver = userIDArray[2];
    params = {
      TableName: "profiles",
      Key: {
        'receiver': {
          S: receiver
        },
        'timepost': {
          S: timepost
        },
      },
      UpdateExpression: "ADD likes :a",
      ExpressionAttributeValues: {
        ":a": userStringSet
      },
    }
  }

  db.updateItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    }
    var paramsGet;

    if (postType === "posts") {
      paramsGet = {
        TableName: "posts",
        KeyConditionExpression: 'userID = :a and timepost = :b',
        ExpressionAttributeValues: {
          ':a': { S: userID },
          ':b': { S: timepost }
        }
      };
    } else {
      paramsGet = {
        TableName: "profiles",
        KeyConditionExpression: "receiver = :a and timepost = :b",
        ExpressionAttributeValues: {
          ":a": { S: receiver },
          ":b": { S: timepost }
        }
      };
    }

    db.query(paramsGet, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        if (data.Items[0].likes == undefined) {
          var empty = [];
          callback(err, empty);
        } else {
          callback(err, data.Items[0].likes.SS);
        }
      }
    });
  });
}

// Deletes a follower
var myDB_deleteFollower = function (username, follower, callback) {
  var followerSet = { SS: [follower] };
  var params = {
    TableName: "users",
    Key: { "username": { S: username } },
    UpdateExpression: "DELETE followers :a",
    ExpressionAttributeValues: {
      ":a": followerSet
    },
  };
  db.updateItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    }
    callback(err, data);
  });
}

// Deletes a follower
var myDB_deleteFollowing = function (username, following, callback) {
  var followingSet = { SS: [following] };
  var params = {
    TableName: "users",
    Key: { "username": { S: username } },
    UpdateExpression: "DELETE following :a",
    ExpressionAttributeValues: {
      ":a": followingSet
    },
  };
  db.updateItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    }
    callback(err, data);
  });
}

var myDB_uploadImagePost = function(username, timepost, file, callback) {
	var params = {
		Bucket: 'spark-twitter-store',
		Key: username,
		Body: file.buffer
	};
	s3.putObject(params, function(err, data) {
		var params2 = {
        	TableName: "posts",
          Key: {
            'userID': {
              S: username
            },
            'timepost': {
              S: timepost
            },
          },
			UpdateExpression: "set images = :a",
			ExpressionAttributeValues: {
            	":a": {BOOL: true}
        	}
		};
		db.updateItem(params2, function(err2, data2){
			callback(err, data);
		});
	});
}

var database = {
  passwordLookup: myDB_getPassword,
  usernameLookup: myDB_usernameLookup,
  createAccount: myDB_createAccount,
  addFollower: myDB_addFollower,
  addFollowing: myDB_addFollowing,
  addLike: myDB_addLike,
  addHashtag: myDB_addHashtag,
  getAllHashtags: myDB_getAllHashtags,
  getHashtagID: myDB_getHashtagID,
  getSpecificPost: myDB_getspecificPost,
  getAllPosts: myDB_allPosts,
  getFollowers: myDB_getFollowers,
  createPost: myDB_createPost,
  addComment: myDB_addComment,
  getUserInfo: myDB_userInfo,
  getAllUsername: myDB_getAllUsername,
  getFollowings: myDB_getFollowings,
  updateUser: myDB_updateUser,
  deleteFollower: myDB_deleteFollower,
  deleteFollowing: myDB_deleteFollowing,
  uploadImagePost: myDB_uploadImagePost

};

module.exports = database;

var db = require('../models/database.js');
var sjcl = require('sjcl');
const { exec } = require('child_process');
// var stemmer = require('stemmer');

//get the starting page (login)
var getMain = function (req, res) {
  req.session.currProfile = null;
  req.session.searchPost = null;
  req.session.isVerified = false;
  res.render('main.ejs');
}

//gets signup page
var getSignup = function (req, res) {
  req.session.currProfile = null;
  req.session.searchPost = null;
  res.render('signup.ejs', { "check": req.session.isVerified });
}

//render homepage
var getHomepage = function (req, res) {
  req.session.currProfile = null;
  req.session.searchPost = null;
  if (!req.session.username) {
    return res.redirect('/')
  }
  res.render('homepage.ejs', { "check": req.session.isVerified })
}

//render profile page
var getProfile = function (req, res) {
  req.session.currProfile = req.session.username;
  req.session.searchPost = null;
  if (!req.session.username) {
    return res.redirect('/')
  }
  res.render('profile.ejs', { "check": req.session.isVerified, "isOther": false, "username": req.session.username });
}

//render other user's profile page
var getOtherProfile = function (req, res) {
  req.session.searchPost = null;
  // req.session.currProfile = req.session.username;
  if (!req.session.username) {
    return res.redirect('/')
  }
  res.render('profile.ejs', { "check": req.session.isVerified, "isOther": true, "username": "other" });
}

//render search post
var getSearchPost = function (req, res) {
  req.session.currProfile = null;
  if (!req.session.username) {
    return res.redirect('/')
  }
  res.render('searchpost.ejs', { "check": req.session.isVerified });
}

//render edit
var getEdit = function (req, res) {
  req.session.currProfile = null;
  req.session.searchPost = null;
  if (!req.session.username) {
    return res.redirect('/')
  }
  res.render('edit.ejs', { "check": req.session.isVerified })
}

//gets logout page
var getLogout = function (req, res) {
  req.session.destroy();
  res.render('main.ejs', {});
}

/* checklogin */

var postVerifyUser = function (req, res) {
  req.session.currProfile = null;
  req.session.searchPost = null;
  var usernameCheck = req.body.username;
  var passwordCheck = req.body.password;
  var hashPassword = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(passwordCheck));
  console.log(usernameCheck);
  console.log(hashPassword);
  db.passwordLookup(usernameCheck, function (err, data) {
    console.log(data);
    if (data == hashPassword && !err) {
      req.session.username = req.body.username;
      req.session.password = req.body.password;
      req.session.isVerified = true;
      res.render('checklogin.ejs', { "check": req.session.isVerified });
    } else {
      req.session.isVerified = false;
      res.render('checklogin.ejs', { "check": req.session.isVerified });
    }
  });
}


/* createaccount */

var postNewAccount = function (req, res) {
  var usernameNewCheck = req.body.username;
  db.usernameLookup(usernameNewCheck, function (err, data) {
    if (data == null || err) {
      var hashPassword = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(req.body.password));
      req.session.username = req.body.username;
      req.session.password = hashPassword;
      req.session.fullname = req.body.firstname + " " + req.body.lastname;
      req.session.birthday = req.body.birthday;
      req.session.pfpURL = req.body.pfpURL;
      db.createAccount(req.session.username, req.session.password, req.session.fullname, req.session.birthday,
        req.session.pfpURL, function (err, data) { });
      req.session.isVerified = true;
      res.render('createaccount.ejs', { "check": req.session.isVerified });
    } else {
      req.session.isVerified = false;
      res.render('createaccount.ejs', { "check": req.session.isVerified });
    }

  });
}


/* homepage */

//get user info
var getUserInfo = function (req, res) {
  db.getUserInfo(req.session.username, "username", function (err, data) {
    res.send(data);
  })
}

//ajax: get the creator information
var getCreator = function (req, res) {
  res.send(JSON.stringify(req.session.username));
}

//get user's posts, user's followers' posts
var getHomepagePostListAjax = function (req, res) {
  var tempList = [];
  db.getAllPosts(req.session.username, function (err, data) {
    var contentArr = data.map(obj => obj.content.S);
    var commentsArr = data.map(obj => obj.comments.L);
    var userIDArr = data.map(obj => obj.userID.S);
    var timepostArr = data.map(obj => obj.timepost.S);
    var postTypeArr = data.map(obj => obj.postType.S);
    var likesArr = data.map(function (obj) {
      if (obj.likes == undefined) {
        return "0";
      } else {
        return obj.likes.SS.length + "";
      }
    })

    for (let i = 0; i < userIDArr.length; i++) {
      var pointer = {
        "content": contentArr[i],
        "comments": commentsArr[i],
        "userID": userIDArr[i],
        "timepost": timepostArr[i],
        "postType": postTypeArr[i],
        "likes": likesArr[i]
      };
      tempList.push(pointer);
    }

    db.getFollowings(req.session.username, function (err, data) {
      console.log("getFollowings");
      console.log(data);
      var followingsList = [];
      data.forEach(function (r) {
        followingsList.push(r);
      });
      if (followingsList[0] === undefined && followingsList.length === 1) {
        if (tempList.length > 1) {
          tempList.sort((a, b) => (a.timepost).localeCompare(b.timepost)).reverse();
        }
        console.log("tempList");
        console.log(tempList);
        res.send(JSON.stringify(tempList));
      } else {
        recGetAllPosts(followingsList, tempList, 0, function (postsList) {
          if (postsList.length > 1) {
            postsList.sort((a, b) => (a.timepost).localeCompare(b.timepost)).reverse();
          }
          console.log("postsList");
          console.log(postsList);
          res.send(JSON.stringify(postsList));
        });
      }
    });
  });
}

//recursion for posts
var recGetAllPosts = function (recFollowingsList, recPostsList, counter, callback) {
  if (counter >= recFollowingsList.length) {
    callback(recPostsList);
  } else {
    db.getAllPosts(recFollowingsList[counter], function (err, data) {
      var contentArr = data.map(obj => obj.content.S);
      var commentsArr = data.map(obj => obj.comments.L);
      var userIDArr = data.map(obj => obj.userID.S);
      var timepostArr = data.map(obj => obj.timepost.S);
      var postTypeArr = data.map(obj => obj.postType.S);
      var likesArr = data.map(function (obj) {
        if (obj.likes == undefined) {
          return "0";
        } else {
          return obj.likes.SS.length + "";
        }
      })

      for (let i = 0; i < userIDArr.length; i++) {
        var pointer = {
          "content": contentArr[i],
          "comments": commentsArr[i],
          "userID": userIDArr[i],
          "timepost": timepostArr[i],
          "postType": postTypeArr[i],
          "likes": likesArr[i]
        };
        recPostsList.push(pointer);
      }
      counter++;
      recGetAllPosts(recFollowingsList, recPostsList, counter, callback);
    });
  }
}

//gets follower list
var getFollowerList = function (req, res) {
  db.getFollowers(req.session.username, function (err, data) {
    console.log("getFollowerList");
    console.log({ L: data });
    res.send({ L: data });
  })
}

//gets following list
var getFollowingList = function (req, res) {
  db.getFollowings(req.session.username, function (err, data) {
    console.log("getFollowingList");
    console.log({ L: data });
    res.send({ L: data });
  })
}

//create new post in the db when all inputs exist in posts
var postNewPostAjax = function (req, res) {
  var content = req.body.content;
  var timepost = req.body.timepost;
  var hashtagsList = req.body.hashtags.split(" ");
  console.log("hashtagsList");
  console.log(hashtagsList);
  var postType = {
    S: "posts"
  };
  if (content.length != 0 && timepost.length != 0) {
    db.createPost(req.session.username, content, timepost, hashtagsList, function (err, data) {
      console.log(hashtagsList.length);
      if (hashtagsList.length == 0 || hashtagsList[0] == '') {
        var response = {
          "userID": req.session.username,
          "content": content,
          "timepost": timepost,
          "postType": postType
        };
        res.send(response);
      } else {
        console.log("hashtagsListTwo");
        console.log(hashtagsList);
        recAddHashtag(hashtagsList, 0, req.session.username, timepost, function (data) {
          var response = {
            "userID": req.session.username,
            "content": content,
            "timepost": timepost,
            "postType": postType
          };
          res.send(response);
        });
      }
    });
  } else {
    res.send(null);
  }
}

var recAddHashtag = function (recHashtagsList, counter, userID, timepost, callback) {
  if (counter >= recHashtagsList.length) {
    callback("done");
  } else {
    db.addHashtag(recHashtagsList[counter], userID, timepost, function (err, data) {
      counter++;
      recAddHashtag(recHashtagsList, counter, userID, timepost, callback);
    });
  }
}

//ajax: add comment in post data in posts
var postNewCommentAjax = function (req, res) {
  var userID = req.body.userID;
  var timepost = req.body.timepost;
  var comment = req.body.comment;
  var table = req.body.table;

  if (userID.length != 0 && timepost.length != 0 && comment.length != 0) {
    db.addComment(userID, timepost, comment, table, function (err, data) { });

    var response = {
      "userID": userID,
      "timepost": timepost,
      "comment": comment
    };

    res.send(response);
  } else {
    res.send(null);
  }
}

/* profile */

//add the req.session.currProfile the user that was searched
var postOtherProfilePageAjax = function (req, res) {
  if (!req.session.username) {
    return res.redirect('/')
  }
  req.session.currProfile = req.body.currProfile;
  console.log(req.session.currProfile);
  res.send("success");
}

//gives information about the profile owner
var getDetermineProfileOwner = function (req, res) {
  db.usernameLookup(req.session.currProfile, function (err, data) {
    if (data === null) {
      req.session.currProfile = null;
      res.send("null");
    } else {
      db.getUserInfo(req.session.currProfile, "username", function (err, data) {
        res.send(data);
      })
    }
  });
}

//ajax: get your posts and profile you receive from followers posting on yours
var getProfileListAjax = function (req, res) {
  var tempList = [];
  db.getAllPosts(req.session.currProfile, function (err, data) {
    var contentArr = data.map(obj => obj.content.S);
    var commentsArr = data.map(obj => obj.comments.L);
    var userIDArr = data.map(obj => obj.userID.S);
    var timepostArr = data.map(obj => obj.timepost.S);
    var postTypeArr = data.map(obj => obj.postType.S);
    var likesArr = data.map(function (obj) {
      if (obj.likes == undefined) {
        return "0";
      } else {
        return obj.likes.SS.length + "";
      }
    })
    console.log("likesArr1");
    console.log(likesArr);

    for (let i = 0; i < userIDArr.length; i++) {
      var pointer = {
        "content": contentArr[i],
        "comments": commentsArr[i],
        "userID": userIDArr[i],
        "timepost": timepostArr[i],
        "postType": postTypeArr[i],
        "likes": likesArr[i]
      };
      tempList.push(pointer);
    }

    if (tempList.length > 1) {
      tempList.sort((a, b) => (a.timepost).localeCompare(b.timepost)).reverse();
    }
    res.send(JSON.stringify(tempList));
  });
}

//check if the profile is a following of the user
var getIsProfileAFollowing = function (req, res) {
  db.getFollowings(req.session.username, function (err, data) {
    if (err) {
      console.log(err);
    }
    var isFollower = { BOOL: false };
    if (req.session.username === req.session.currProfile) {
      isFollower = { BOOL: true };
      res.send(isFollower);
    } else {
      data.forEach(function (r) {
        if (r === req.session.currProfile) {
          isFollower = { BOOL: true };
          res.send(isFollower);
        }
      })
      if (isFollower.BOOL === false) {
        isFollower = { BOOL: false };
        res.send(isFollower);
      }
    }
  });
}

//gets follower list
var getProfileFollowerList = function (req, res) {
  db.getFollowers(req.session.currProfile, function (err, data) {
    console.log("getFollowerList");
    console.log({ L: data });
    res.send({ L: data });
  })
}

//gets following list
var getProfileFollowingList = function (req, res) {
  db.getFollowings(req.session.currProfile, function (err, data) {
    console.log("getFollowingList");
    console.log({ L: data });
    res.send({ L: data });
  })
}

//get all usernames from users database
var getAllUsername = function (req, res) {
  db.getAllUsername(function (err, data) {
    if (err) {
      console.log(err);
    }
    res.send(data);
  });
}

//get all hashtags from hashtags database
var getAllHashtags = function (req, res) {
  db.getAllHashtags(function (err, data) {
    if (err) {
      console.log(err);
    }
    res.send(data);
  });
}

// Send follower request
var sendFollowerRequest = function (req, res) {
  var receiver = req.body.receiver;
  if (!req.session.username) {
    res.render('main.ejs', { message: "Not logged in" });
  } else {
    db.addFollower(req.session.username, receiver, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        db.addFollowing(receiver, req.session.username, function (err1, data) {
          if (err1) {
            console.log(err1);
          } else {
            res.send({ S: "sent follower request" });
          }
        });
      }
    });
  }
}

//adds likes to the specific post
var addLikesToPost = function (req, res) {
  var userID = req.body.userID;
  var postType = req.body.postType;
  var timepost = req.body.timepost;
  var likedUser = req.session.username;

  db.addLike(userID, likedUser, timepost, postType, function (err, data) {
    if (err != null) {
      console.log(err);
    } else {
      var likedNumber = {
        S: data.length
      }
      res.send(likedNumber);
    }
  })
}

//delete follower
var postDeleteFollowing = function (req, res) {
  var following = req.body.following;
  db.deleteFollower(following, req.session.username, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      db.deleteFollowing(req.session.username, following, function (err1, data) {
        if (err1) {
          console.log(err1);
        } else {
          res.send({ S: "deleted following" });
        }
      });
    }
  });
}

/* edit */

//get the information about the user for edit
var getEditUserInfoAjax = function (req, res) {
  db.getUserInfo(req.session.username, "username", function (err, data) {
    data.password.S = "";
    res.send(data);
  });
}

//sign in info to the database
var postUpdateUser = function (req, res) {
  var updateInfoList = [];
  var hashPassword = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(req.body.password));
  updateInfoList.push(req.body.firstname + " " + req.body.lastname);
  updateInfoList.push(hashPassword);
  updateInfoList.push(req.body.pfpURL);

  var updateInfoNameList = [];
  updateInfoNameList.push('fullname');
  updateInfoNameList.push('password');
  updateInfoNameList.push('pfpURL');

  res.render('editaccount.ejs', { "check": true });



  recUpdateUser(req.session.username, updateInfoList, updateInfoNameList, 0, function (err, message) {
    if (err) {
      console.log(err);
    }
  });
}

var recUpdateUser = function (sessionUser, recUpdateInfoList, recUpdateInfoNameList, counter, callback) {
  if (counter >= recUpdateInfoList.length) {
    callback("successfully updated user");
  } else {
    db.updateUser(sessionUser, recUpdateInfoList[counter], recUpdateInfoNameList[counter], function (err, data) {
      counter++;
      recUpdateUser(sessionUser, recUpdateInfoList, recUpdateInfoNameList, counter, callback);
    });
  }
}

/* searchpost */

//add the req.session.searchPost the hashtag that was searched
var postSearchPostAjax = function (req, res) {
  if (!req.session.username) {
    return res.redirect('/')
  }
  req.session.searchPost = req.body.searchPost;
  res.send("success");
}

var getHashtagPostAjax = function (req, res) {
  console.log(req.session.searchPost);
  db.getHashtagID(req.session.searchPost, function (err, data) {
    console.log("hashtagID");
    console.log(data);
    if (data == undefined) {
      res.send("error");
    } else {
      var tempArr = [];
      console.log(data.postID.SS);
      recGetPosts(data.postID.SS, tempArr, 0, function (postsList) {
        if (postsList.length > 1) {
          postsList.sort((a, b) => (a.timepost).localeCompare(b.timepost)).reverse();
        }
        res.send(JSON.stringify(postsList));
      });
    }
  });
}

var recGetPosts = function (recUserTimepostList, recTempArr, counter, callback) {
  if (counter >= recUserTimepostList.length) {
    console.log("recTempArr");
    console.log(recTempArr);
    callback(recTempArr);
  } else {
    var userTimepost = recUserTimepostList[counter].split("-");
    console.log(userTimepost);
    db.getSpecificPost(userTimepost[0], userTimepost[1], function (err, data) {
      var contentArr = data.map(obj => obj.content.S);
      var commentsArr = data.map(obj => obj.comments.L);
      var userIDArr = data.map(obj => obj.userID.S);
      var timepostArr = data.map(obj => obj.timepost.S);
      var postTypeArr = data.map(obj => obj.postType.S);
      var likesArr = data.map(function (obj) {
        if (obj.likes == undefined) {
          return "0";
        } else {
          return obj.likes.SS.length + "";
        }
      })

      for (let i = 0; i < userIDArr.length; i++) {
        var pointer = {
          "content": contentArr[i],
          "comments": commentsArr[i],
          "userID": userIDArr[i],
          "timepost": timepostArr[i],
          "postType": postTypeArr[i],
          "likes": likesArr[i]
        };
        recTempArr.push(pointer);
      }
      counter++;
      recGetPosts(recUserTimepostList, recTempArr, counter, callback);
    });
  }
}
var routes = {
  get_main: getMain,
  verifyUser: postVerifyUser,
  get_signup: getSignup,
  get_logout: getLogout,
  get_creator: getCreator,
  get_profile: getProfile,
  post_otherProfilePageAjax: postOtherProfilePageAjax,
  get_searchpost: getSearchPost,
  get_determineProfileOwner: getDetermineProfileOwner,
  get_userInfo: getUserInfo,
  get_edit: getEdit,
  get_otherprofile: getOtherProfile,
  send_follower_request: sendFollowerRequest,
  get_isProfileAFollowing: getIsProfileAFollowing,
  get_followingList: getFollowingList,
  get_allHashtags: getAllHashtags,
  post_searchPostAjax: postSearchPostAjax,
  get_homepage: getHomepage,
  get_homepagePostListAjax: getHomepagePostListAjax,
  get_profileListAjax: getProfileListAjax,
  get_editUserInfoAjax: getEditUserInfoAjax,
  get_allUsername: getAllUsername,
  get_profileFollowerList: getProfileFollowerList,
  get_ProfileFollowingList: getProfileFollowingList,
  post_newPostAjax: postNewPostAjax,
  post_newCommentAjax: postNewCommentAjax,
  post_updateUser: postUpdateUser,
  post_addLikesToPost: addLikesToPost,
  get_hashtagPostAjax: getHashtagPostAjax,
  post_newAccount: postNewAccount,
  post_deleteFollowing: postDeleteFollowing,
  get_followerList: getFollowerList
};

module.exports = routes;

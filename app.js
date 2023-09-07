var express = require('express');
var routes = require('./routes/routes.js');
var { uploadImage, getImage } = require('./models/database.js');
var app = express();
app.use(express.urlencoded());

const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

const fs = require('fs')
const utils = require('util')
const unlinkFile = utils.promisify(fs.unlink)

// const { myS3_uploadImage } = require('./models/database.js')

var http = require('http').Server(app);

var session = require('express-session');
app.use(session({
   secret: 'loginSecret',
   resave: false,
   saveUnitialized: true,
   cookie: { secure: false }
}));


app.get('/', routes.get_main);
app.get('/signup', routes.get_signup);
app.post('/createaccount', routes.post_newAccount);
app.post('/checklogin', routes.verifyUser);
app.get('/homepage', routes.get_homepage);
app.get('/edit', routes.get_edit);
app.get('/profile', routes.get_profile);
app.get('/otherprofile', routes.get_otherprofile);
app.get('/searchpost', routes.get_searchpost);
app.get('/logout', routes.get_logout);

app.get('/getCreator', routes.get_creator);

app.get('/getPostAjax', routes.get_homepagePostListAjax);
app.get('/getFollowerList', routes.get_followerList);
app.get('/getFollowingList', routes.get_followingList);
app.get('/getProfileFollowerList', routes.get_profileFollowerList);
app.get('/getProfileFollowingList', routes.get_ProfileFollowingList);
app.get('/getUserInfo', routes.get_userInfo);
app.post('/searchPostAjax', routes.post_searchPostAjax);
app.get('/getHashtagPostAjax', routes.get_hashtagPostAjax);

app.get('/getProfileAjax', routes.get_profileListAjax);
app.get('/getEditUserInfoAjax', routes.get_editUserInfoAjax);
app.get('/getAllUsername', routes.get_allUsername);
app.get('/getAllHashtags', routes.get_allHashtags);

app.post('/createpost', routes.post_newPostAjax);
app.post('/createcomment', routes.post_newCommentAjax);
app.post('/postUpdateUser', routes.post_updateUser);
app.post('/addLikesToPost', routes.post_addLikesToPost);

app.get('/getIsProfileAFollowing', routes.get_isProfileAFollowing);
app.post('/sendFollowerRequest', routes.send_follower_request);

app.post('/editaccount', routes.post_updateUser);
app.post('/postOtherProfilePageAjax', routes.post_otherProfilePageAjax);
app.get('/getDetermineProfileOwner', routes.get_determineProfileOwner);
app.post('/deleteFollowing', routes.post_deleteFollowing);
app.get('/images/:key', (req, res) => {
   const key = req.params.key
   const readStream = getImage(key)
   readStream.pipe(res)
});

app.post('/images', upload.single('profile-file'), async (req, res) => {
   const file = req.file
   console.log(JSON.stringify(req.file))
   const result = await uploadImage(file)
   await unlinkFile(file.path)
   console.log(result)
   const description = req.body.description
   res.send({imagePath: `/images/${result.Key}`})
});

/* Run the server */

console.log('Author: Jiwoong Matt Park (mtp0326)');
// app.listen(8080);
http.listen(8080, () => {
   console.log('listening on 8080');
});
console.log('HTTP server started on port 8080');
**1. Brief summary of what your project does**

Similar to twitter, users are able to sign in by completing the signup page with their first and last name, username, password birthday, and any profile pic they want to use. For security, the password is encrypted with SHA256. In the homepage, users can

- see all posts of their own and the accounts they follow in chronological order.
- like and comment on these posts. Users can also post their own tweet, which will appear in both their homepage and profile page
- upload a profile picture, which is stored in S3 for future use

   The profile page has the searched username's or the user's own information along with their own posts. Users also have the choice to follow or unfollow the searched users. The hashtag search bar gives all the posts associated with the searched    hashtag. You can also edit your profile in the edit page. All the features are also mobile responding.

**2. Which features you chose to include**

Node.js for the backend through using routes.js and database.js. I used AWS DynamoDB for the database and S3 for large files like profile pictures. For SHA256 encryption, I used the Stanford Javascript Crypto Library. In the frontend, I used EJS that includes javascript, HTML, and CSS. All IAM keys and locations for AWS DynamoDB and S3 is secured through an .env file.

**3. How much time you spent developing this project**

4 hours

**4. What features you weren’t able to complete and how you would complete them**

None that was required or recommended. I wanted the post to be able to upload pictures through S3. But for the time being, I thought it would be best to just upload pictures to your profile pic because it at least shows that the infrastructure between NodeJS, AWS-sdk, and S3 are well established so any other functions like uploading picture posts can be implemented given enough time.

**5. Details for running your project**

Youtube Link: https://youtu.be/o_dxbPeYGVo

If you would like to try it out yourself

1. Download the github code through this link.
   Github Link: https://github.com/mtp0326/Spark-Twitter
2. Download Node.js
3. Add .env file next to app.js that will provided separately (through email or through google forms submission)
4. From the terminal, type "npm install" then "npm start"
5. Open http://localhost:8080/ in your browser.

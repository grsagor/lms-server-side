const express = require('express');
const cors = require('cors');
const multer = require('multer');
const moment = require('moment-timezone');
const path = require('path');
const shortid = require('shortid');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).array('photos', 5);

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7le8ogp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const usersCollection = client.db('LMS').collection('users');
    const postCollection = client.db('LMS').collection('posts');
    const classCollection = client.db('LMS').collection('classes');
    const assignmentCollection = client.db('LMS').collection('assignments');

    async function generateRandomValue() {
      const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      const randomValue9 = shortid.generate({
        length: 6,
        characters: characters
      });
      const randomValue = randomValue9.slice(0, 6);
      const document = await classCollection.findOne({ code: randomValue });
      if (document) {
        return generateRandomValue();
      } else {
        return randomValue;
      }
    }
    /*============================================================================================== 
    Getting data for a specific id
    ==============================================================================================*/
    app.get('/all', async (req, res) => {
      let postQuery = {};
      let courseQuery = {};
      if (req.query.id) {
        postQuery = {
          courseID: req.query.id
        }
        courseQuery = {
          _id: new ObjectId(req.query.id)
        }
      };
      const posts = await postCollection.find(postQuery).toArray();
      const courseDetails = await classCollection.find(courseQuery).toArray();

      const all = { posts, courseDetails };
      res.send(all)
    })
    /*============================================================================================== 
    Getting users
    ==============================================================================================*/
    app.get('/users', async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email
        }
      };
      const users = await usersCollection.find(query).sort({ _id: -1 }).toArray();
      const classes = await classCollection.find().toArray();
      const posts = await postCollection.find().toArray();
      // if(req.query.email){
        users.map(user => {
          user.classInfo = user.classes.map(clsid => classes.find(cls => cls._id.toString() === clsid.toString()));
          user.posts = user.classes.map(clsid => posts.filter(post => post.courseID === clsid.toString()));
          return user;
        });
      // }
      res.send(users);
    })
    /*============================================================================================== 
    Saving Users in the database
    ==============================================================================================*/
    app.post('/user', async (req, res) => {
      const body = req.body;
      const result = await usersCollection.insertOne(body);
      res.send(result);
    });
    /*============================================================================================== 
    Getting Post, Task & Quiz from database
    ==============================================================================================*/
    app.get('/posts', async (req, res) => {
      let query = {};
      if (req.query.type) {
        query = { type: req.query.type }
      };
      if(req.query.id){
        query = {
          _id: new ObjectId(req.query.id)
        }
      }
      const posts = await postCollection.find(query).toArray();
      res.send(posts);
    })
    /*============================================================================================== 
    Getting Post, Task & Quiz from database for a specifiq users
    ==============================================================================================*/
    // app.get('/user-posts', async (req, res) => {
    //   let query = {};
    //   if(req.query.userID){
    //     _id: new ObjectId(req.query.id)
    //   }
    //   const id = req.query.userID;
    //   const user = usersCollection.
    // })
    /*============================================================================================== 
    Sending Post, Task & Quiz to database
    ==============================================================================================*/
    app.post('/post', async (req, res) => {
      console.log("called");
      upload(req, res, async (err) => {
        if (err) {
          console.log(err);
          res.status(400).json({ error: err });
        } else {
          const post = {
            email: req.body.email,
            type: req.body.type,
            courseID: req.body.courseID,
            creationDate: moment().tz('Asia/Dhaka').format('YYYY-MM-DD'),
            creationTime: moment().tz('Asia/Dhaka').format('h:mm A'),
          };
          if (req.body.post) {
            post.post = req.body.post;
          }
          if (req.body.title) {
            post.title = req.body.title;
          }
          if (req.body.description) {
            post.description = req.body.description;
          }
          if (req.body.date) {
            post.date = req.body.date;
          }
          if (req.body.time) {
            post.time = moment(req.body.time, 'HH:mm').format('h:mm A');
          }
          if (req.body.questions) {
            post.questions = req.body.questions;
          }
          if (req.files) {
            post.files = req.files.map((file) => {
              return { filename: file.filename };
            });
          }
          const options = { w: "majority" };
          const result = await postCollection.insertOne(post, options);
          res.send(result);
        }
      });
    });
    app.post('/submittask', async (req, res) => {
      console.log("called");
      upload(req, res, async (err) => {
        if (err) {
          console.log(err);
          res.status(400).json({ error: err });
        } else {
          const post = {
            studentEmail: req.body.studentEmail,
            courseID: req.body.courseID,
            creationDate: moment().tz('Asia/Dhaka').format('YYYY-MM-DD'),
            creationTime: moment().tz('Asia/Dhaka').format('h:mm A'),
          };
          if (req.files) {
            post.files = req.files.map((file) => {
              return { filename: file.filename };
            });
          }
          const options = { w: "majority" };
          const result = await assignmentCollection.insertOne(post, options);
          res.send(result);
        }
      });
    });

    /*============================================================================================== 
    Class Started
    ==============================================================================================*/
    app.get('/classes', async (req, res) => {
      let query = {};
      if (req.query.id) {
        query = {
          _id: new ObjectId(req.query.id)
        }
      };
      const classes = await classCollection.find(query).toArray();
      const posts = await postCollection.find().toArray();
      classes.map(cls=>{
        cls.posts = posts.filter(post=> post.courseID.toString() === cls._id.toString())
        return cls;
      })
      res.send(classes);
    })

    app.post('/create-class', async (req, res) => {
      const body = req.body;
      const options = { upsert: true };

      body.code = await generateRandomValue();
      const result = await classCollection.insertOne(body);

      const document = await classCollection.findOne({ code: body.code });
      const email = body?.teacher;
      const filterUser = { email: email };
      const documentUser = await usersCollection.findOne(filterUser);
      const updateDoc = {
        $set: {
          classes: [document?._id, ...documentUser?.classes]
        }
      }
      const resultUser = await usersCollection.updateOne(filterUser, updateDoc, options);
      res.send(resultUser);
    });

    app.put('/join-class', async (req, res) => {
      const body = req.body;
      const options = { upsert: true };
      const code = body.code;

      const filter = { code: code };
      const document = await classCollection.findOne({ code: code });
      console.log(document);
      const updateDocClass = {
        $set: {
          students: [body?.email, ...document?.students]
        }
      }
      const result = await classCollection.updateOne(filter, updateDocClass, options);

      const email = body?.email;
      const filterUser = { email: email };
      const documentUser = await usersCollection.findOne(filterUser);
      const updateDoc = {
        $set: {
          classes: [document?._id, ...documentUser?.classes]
        }
      }
      const resultUser = await usersCollection.updateOne(filterUser, updateDoc, options);

      res.send(resultUser);

    })

    /*============================================================================================== 
      Class Ended
      ==============================================================================================*/

    app.get('/', (req, res) => {
      res.send('LMS is runninig');
    });
  } finally {

  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`LMS is running on port: ${port}`);
});
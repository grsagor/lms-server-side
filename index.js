const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const shortid = require('shortid');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
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
console.log(uri);
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

    async function generateRandomValue() {
      const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      const randomValue9 = shortid.generate({ 
        length: 6,
        characters: characters
      });
      const randomValue = randomValue9.slice(0,6);
      const document = await classCollection.findOne({ code: randomValue });
      if (document) {
        return generateRandomValue();
      } else {
        return randomValue;
      }
    }

    app.get('/users', async (req,res) => {
        let query = {};
        if(req.query.email){
            query = {
                email: req.query.email
            }
        };
        const posts = await usersCollection.find(query).sort({_id:-1}).toArray();
        res.send(posts);
    })

    app.post('/user', async (req, res) => {
      const body = req.body;
      const result = await usersCollection.insertOne(body);
      res.send(result);
    });

    app.post('/api/post', (req, res) => {
      upload(req, res, (err) => {
        if (err) {
          console.log(err);
          res.status(400).json({ error: err });
        } else {
          const db = client.db('LMS');
          const post = {
            user_name: req.body.user_name,
            post_content: req.body.post_content,
            photos: req.files.map((file) => {
              return { filename: file.filename };
            })
          };
          const options = { w: "majority" };
          postCollection.insertOne(post, options, (err, result) => {
          });
        }
      });
    });

    app.post('/create-class', async (req, res) => {
      const body = req.body;
      const options = {upsert: true};

      body.code = await generateRandomValue();
      const result = await classCollection.insertOne(body);

      const document = await classCollection.findOne({ code: body.code });
      const email = body?.teacher;
      const filterUser = {email: email};
      const documentUser = await usersCollection.findOne(filterUser);
      const updateDoc ={
          $set:{
            classes: [document?._id,...documentUser?.classes]
          }
      }
      const resultUser = await usersCollection.updateOne(filterUser, updateDoc, options);
      res.send(resultUser);
    });

    app.put('/join-class', async(req, res)=> {
      const body = req.body;
      const options = {upsert: true};
      const code = body.code;

      const filter = {code: code};
      const document = await classCollection.findOne({ code: code });
      console.log(document);
      const updateDocClass ={
          $set:{
            students: [body?.email,...document?.students]
          }
      }
      const result = await classCollection.updateOne(filter, updateDocClass, options);

      const email = body?.email;
      const filterUser = {email: email};
      const documentUser = await usersCollection.findOne(filterUser);
      const updateDoc ={
          $set:{
            classes: [document?._id,...documentUser?.classes]
          }
      }
      const resultUser = await usersCollection.updateOne(filterUser, updateDoc, options);

        res.send(resultUser);

  })

    app.get('/', (req,res) => {
        res.send('LMS is runninig');
    });
  } finally {

  }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`LMS is running on port: ${port}`);
});
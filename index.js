const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());

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
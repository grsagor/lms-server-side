const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());

app.get('/', (req,res) => {
    res.send('LMS is runninig');
})

app.listen(port, () => {
    console.log(`LMS is running on port: ${port}`);
})
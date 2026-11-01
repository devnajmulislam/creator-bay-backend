import express from "express";
import cors from "cors";
import { MongoClient } from 'mongodb';
import 'dotenv/config'


const PORT = 5000;

const app = express();

// middlewares
app.use(cors())
app.use(express.json());

// connect DB
const client = new MongoClient(process.env.MONGO_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectClient = await connectToMongoDB() // get DB
const db = connectClient.db("creator-bay") // create Database
const studiosCollection = db.collection("studios") // create a collection called studios

// API requests

// Create data to DB
app.post('/studios', async(req, res) => {
  const studioData = req.body;
  const result = await studiosCollection.insertOne(studioData);
  res.send(result)
})


// get all datas from studeios collection 
app.get('/studios', async(req, res)=> {
const result = await studiosCollection.find().toArray();
res.send(result); 
})


app.get('/', (req, res)=> {
    res.send('Server is OK to assist!')
})

app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}`)
})
import express from "express";
import cors from "cors";
import { MongoClient } from 'mongodb';
import 'dotenv/config'


const PORT = 5000;

const app = express();

// middlewares
// app.use(cors())
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

connectToMongoDB()



app.get('/', (req, res)=> {
    res.send('Server is OK to assist!')
})

app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}`)
})
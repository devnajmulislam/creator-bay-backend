import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const PORT = 5000;

const app = express();

// middlewares
app.use(cors());
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

const connectClient = await connectToMongoDB(); // get DB
const db = connectClient.db("creator-bay"); // create Database
const studiosCollection = db.collection("studios"); // create a collection called studios
const studiosBookingCollection = db.collection("studiosBooking"); // create a collection for my-booking

// API requests

// Create data to DB
app.post("/studios", async (req, res) => {
  const studioData = req.body;
  const result = await studiosCollection.insertOne(studioData);
  res.send(result);
});

// get all datas from studeios collection
app.get("/studios", async (req, res) => {
  const result = await studiosCollection.find().toArray();
  res.send(result);
});


// inividual crated my-bookings data
app.get('/my-listings/:email', async(req, res)=>{
const email = req.params.email;
// console.log(email)
const result = await studiosCollection.find({creatorEmail: email}).toArray();
res.send(result)
})


// single studio item api
app.get("/studios/:id", async (req, res) => {
  const id = req.params.id;
  // console.log(id, "id");
  const result = await studiosCollection.findOne({ _id: new ObjectId(id) });

  res.send(result);
});

// update individual data - my-listing 
app.patch('/my-listings/:id', async(req, res)=>{
const id = req.params.id;
const updatedData = req.body;
const result = await studiosCollection.updateOne(
  {_id: new ObjectId(id)},
  {$set: updatedData}
)
res.send(result)
})

// delete individual data - my-listing
app.delete('/my-listings/:id', async (req, res)=>{
const id = req.params.id;
const result = await studiosCollection.deleteOne({_id: new ObjectId(id)})
res.send(result)
})


// my-booking api
app.post("/studios/my-bookings", async (req, res) => {
  const bookingData = req.body;
  // console.log(bookingData, "bookingData");
  const result = await studiosBookingCollection.insertOne(bookingData);
  res.send(result);
});

// cancel individual my-booking data
app.patch('/studios/my-bookings/:id', async (req, res) => {
  const id = req.params.id;
  const result = await studiosBookingCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'Cancelled' } }
  );
  res.send(result);
});

// get individual my-booking data
app.get("/studios/my-bookings/:email", async (req, res) => {
  const email = req.params.email;
  // console.log(email, 'email')
  const result = await studiosBookingCollection.find({userEmail: email}).toArray();
  // console.log(result, "result")
  res.send(result)
}) 


app.get("/", (req, res) => {
  res.send("Server is OK to assist!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

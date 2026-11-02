import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const PORT = process.env.PORT || 5000;
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// connect DB
const client = new MongoClient(process.env.MONGO_URI);

export async function connectToMongoDB() {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log("You successfully connected to MongoDB!");
    }
    return client;
  } catch (err) {
    console.dir(err);
  }
}

// Helper
async function getCollections() {
  const connectClient = await connectToMongoDB();
  const db = connectClient.db("creator-bay");
  return {
    studiosCollection: db.collection("studios"),
    studiosBookingCollection: db.collection("studiosBooking"),
  };
}

// Security middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.FRONTEND_URL}/api/auth/jwks`),
  );

  try {
    const { payload } = jwtVerify(token, JWKS, {
      issuer: `${process.env.FRONTEND_URL}/api/auth`,
      audience: "creator-bay-frontend",
    });
    req.user = payload;
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  next();
};

// API requests

// Create data to DB
app.post("/studios", verifyToken, async (req, res) => {
  try {
    const { studiosCollection } = await getCollections();
    const studioData = req.body;
    const result = await studiosCollection.insertOne(studioData);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// get all datas from studeios collection
app.get("/studios", async (req, res) => {
  try {
    const { studiosCollection } = await getCollections();
    const result = await studiosCollection.find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// inividual my-listings data
app.get("/my-listings/:email", verifyToken, async (req, res) => {
  try {
    const { studiosCollection } = await getCollections();
    const email = req.params.email;
    const result = await studiosCollection
      .find({ creatorEmail: email })
      .toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// single studio item api
app.get("/studios/:id", async (req, res) => {
  try {
    const { studiosCollection } = await getCollections();
    const id = req.params.id;
    const result = await studiosCollection.findOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// update individual data - my-listing
app.patch("/my-listings/:id", verifyToken, async (req, res) => {
  try {
    const { studiosCollection } = await getCollections();
    const id = req.params.id;
    const updatedData = req.body;
    const result = await studiosCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData },
    );
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// delete individual data - my-listing
app.delete("/my-listings/:id", verifyToken, async (req, res) => {
  try {
    const { studiosCollection } = await getCollections();
    const id = req.params.id;
    const result = await studiosCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// my-booking api
// app.post("/studios/my-bookings", verifyToken, async (req, res) => {
//   try {
//     const { studiosBookingCollection } = await getCollections();
//     const bookingData = req.body;
//     const result = await studiosBookingCollection.insertOne(bookingData);
//     res.send(result);
//   } catch (err) {
//     res.status(500).send({ error: err.message });
//   }
// });


// my-booking api with double-booking collision prevention
app.post("/studios/my-bookings", verifyToken, async (req, res) => {
  try {
    const { studiosBookingCollection } = await getCollections();
    const { studioId, date, startTime, duration } = req.body;

    if (!studioId || !date || !startTime || !duration) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }

    // Calculate incoming booking time window in minutes from midnight
    const [startHour, startMin] = startTime.split(":").map(Number);
    const newStartMinutes = startHour * 60 + startMin;
    const newEndMinutes = newStartMinutes + Number(duration) * 60;

    // Fetch existing confirmed bookings for the same studio and date
    const existingConfirmed = await studiosBookingCollection.find({
      studioId: studioId,
      date: date,
      status: "Confirmed",
    }).toArray();

    // Check for time overlap
    for (const b of existingConfirmed) {
      if (!b.startTime || !b.duration) continue;
      const [bHour, bMin] = b.startTime.split(":").map(Number);
      const bStartMinutes = bHour * 60 + bMin;
      const bEndMinutes = bStartMinutes + Number(b.duration) * 60;

      // Overlap condition: (StartA < EndB) && (EndA > StartB)
      if (newStartMinutes < bEndMinutes && newEndMinutes > bStartMinutes) {
        return res.status(400).json({
          error: "This time slot conflicts with an existing confirmed reservation.",
        });
      }
    }

    const bookingData = req.body;
    const result = await studiosBookingCollection.insertOne(bookingData);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


// cancel individual my-booking data
app.patch("/studios/my-bookings/:id", verifyToken, async (req, res) => {
  try {
    const { studiosBookingCollection } = await getCollections();
    const id = req.params.id;
    const result = await studiosBookingCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "Cancelled" } },
    );
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// get individual my-booking data
app.get("/studios/my-bookings/:email", verifyToken, async (req, res) => {
  try {
    const { studiosBookingCollection } = await getCollections();
    const email = req.params.email;
    const result = await studiosBookingCollection
      .find({ userEmail: email })
      .toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Server is OK to assist!");
});

// listen locally
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;

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
    await client.connect();
    return client;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}

// Helper
async function getCollections() {
  const connectClient = await connectToMongoDB();
  const db = connectClient.db("creator-bay");
  return {
    studiosCollection: db.collection("studios"),
    bookingsCollection: db.collection("studiosBooking"),
  };
}

// Security middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie || "";
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)creatorbay_jwt=([^;]+)/);

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieMatch
      ? decodeURIComponent(cookieMatch[1])
      : null;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
  const JWKS = createRemoteJWKSet(
    new URL(`${frontendUrl}/api/auth/jwks`),
  );

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${frontendUrl}/api/auth`,
      audience: "creator-bay-frontend",
    });

    req.user = payload;
    return next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

// API requests

// Create data to DB
app.post("/studios", verifyToken, async (req, res) => {
  try {
    const { studiosCollection } = await getCollections();

    const studioData = {
      ...req.body,
      creatorEmail: req.user.email,
      creatorName: req.user.name,
      rating: Number(req.body.rating) || 4.8,
      reviewCount: 0,
      createdAt: new Date(),
    };

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
    const limit = Number(req.query.limit) || 0;
    const sort =
      req.query.sort === "rating"
        ? { rating: -1, createdAt: -1 }
        : { createdAt: -1 };

    let cursor = studiosCollection.find().sort(sort);
    if (limit > 0) cursor = cursor.limit(limit);

    const result = await cursor.toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// inividual my-listings data
app.get("/my-listings/:email", verifyToken, async (req, res) => {
  try {
    const { studiosCollection } = await getCollections();
    const result = await studiosCollection
      .find({ creatorEmail: req.user.email })
      .toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// single studio item api
app.get("/studios/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid studio id" });
  }

  try {
    const { studiosCollection } = await getCollections();
    const result = await studiosCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// update individual data - my-listing
app.patch("/my-listings/:id", verifyToken, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid studio id" });
  }

  try {
    const { studiosCollection } = await getCollections();
    const result = await studiosCollection.updateOne(
      {
        _id: new ObjectId(req.params.id),
        creatorEmail: req.user.email,
      },
      { $set: req.body },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Listing not found" });
    }

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// delete individual data - my-listing
app.delete("/my-listings/:id", verifyToken, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid studio id" });
  }

  try {
    const { studiosCollection } = await getCollections();
    const result = await studiosCollection.deleteOne({
      _id: new ObjectId(req.params.id),
      creatorEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Listing not found" });
    }

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// my-booking api with double-booking collision prevention
app.post("/studios/my-bookings", verifyToken, async (req, res) => {
  try {
    const { bookingsCollection } = await getCollections();
    const { studioId, date, startTime } = req.body;

    if (!studioId || !date || !startTime) {
      return res.status(400).send({
        error: "Studio, date, and start time are required.",
      });
    }

    const conflict = await bookingsCollection.findOne({
      studioId,
      date,
      startTime,
      status: "Confirmed",
    });

    if (conflict) {
      return res.status(409).send({
        error: "This studio is already booked for that date and time.",
      });
    }

    const bookingData = {
      ...req.body,
      email: req.user.email,
      userEmail: req.user.email,
      name: req.user.name,
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(bookingData);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


// cancel individual my-booking data
app.patch("/studios/my-bookings/:id", verifyToken, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid booking id" });
  }

  try {
    const { bookingsCollection } = await getCollections();
    const result = await bookingsCollection.updateOne(
      {
        _id: new ObjectId(req.params.id),
        $or: [
          { userEmail: req.user.email },
          { email: req.user.email },
        ],
      },
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
    const { bookingsCollection } = await getCollections();
    const result = await bookingsCollection
      .find({
        $or: [
          { userEmail: req.user.email },
          { email: req.user.email },
        ],
      })
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

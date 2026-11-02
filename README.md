# CreatorBay - Backend

The backend API for **CreatorBay**, a peer-to-peer creative workspace marketplace for discovering creative studios, managing listings, and handling bookings.

## Tech Stack

- Node.js & Express.js
- MongoDB
- Jose (JWT verification)
- CORS & dotenv

## Features

- Create, view, update, and delete studio listings
- Retrieve creator-specific listings
- Create and view bookings
- Cancel bookings
- JWT-protected API endpoints
- MongoDB database integration

## Installation & Setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment variables**

Create a `.env` file in the project root:

```env
MONGO_URI="your-mongodb-connection-string"
FRONTEND_URL="http://localhost:3000"
PORT=5000
```

Replace the MongoDB placeholder with your actual connection string. Never commit `.env` to GitHub.

**3. Start the server**

```bash
node index.js or nodemon
```

The server runs on port `5000` by default in non-production mode.

**4. Test the server**

Open `http://localhost:5000/`.

Expected response:

```text
Server is OK to assist!
```

## Database Structure

Database: `creator-bay`

| Collection | Purpose |
|---|---|
| `studios` | Studio listings |
| `studiosBooking` | Booking records |

## API Endpoints

Base URL: `http://localhost:5000`

### Studios

| Method | Endpoint | Description |
|---|---|---|
| GET | `/studios` | Get all studios |
| GET | `/studios/:id` | Get a studio by ID |
| POST | `/studios` | Create a studio |
| GET | `/my-listings/:email` | Get creator listings |
| PATCH | `/my-listings/:id` | Update a listing |
| DELETE | `/my-listings/:id` | Delete a listing |

### Bookings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/studios/my-bookings` | Create a booking |
| GET | `/studios/my-bookings/:email` | Get user bookings |
| PATCH | `/studios/my-bookings/:id` | Cancel a booking |

### Authentication

Protected endpoints require a valid JWT bearer token:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Tokens are verified using the frontend's JWKS endpoint. The expected issuer and audience must match the authentication configuration.

## Production Deployment

Before deployment:

- Configure environment variables on the hosting platform.
- Set `FRONTEND_URL` to the deployed frontend origin.
- Configure MongoDB Atlas access and permissions.
- Restrict CORS to trusted frontend origins.
- Verify authentication and resource ownership checks.
- Ensure the hosting configuration supports the exported Express application. The current code does not start its own listener when `NODE_ENV=production`.

## Security

- Keep database credentials and secrets private.
- Validate request data and route parameters.
- Verify resource ownership before updates, deletions, and private data access.
- Avoid exposing internal error details in production.
- Use HTTPS in production.
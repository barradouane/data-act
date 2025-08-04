const express = require("express");
const axios = require("axios");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY;
const STRAPI_URL = process.env.STRAPI_API_URL;

app.use(cors());
app.use(express.json());
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//Register a new user and assign the appropriate GBU role.

app.post("/api/auth/local/register", async (req, res) => {
  const { username, email, password, gbu } = req.body;

  if (!gbu || !["GBU1", "GBU2", "GBU3", "GBU4"].includes(gbu)) {
    return res.status(400).json({ error: "Invalid or missing GBU" });
  }

  try {
    // 1. Register the user
    const registerRes = await axios.post(`${STRAPI_URL}/auth/local/register`, {
      username,
      email,
      password,
    }, {
      headers: { "Content-Type": "application/json" },
    });

    const userId = registerRes.data.user.id;

    // 2. Retrieve available roles
    const rolesRes = await axios.get(`${STRAPI_URL}/users-permissions/roles`, {
      headers: { Authorization: `Bearer ${process.env.STRAPI_TOKEN}` },
    });

    const roles = rolesRes.data.roles || rolesRes.data.data;
    const matchedRole = roles.find((r) => r.name === gbu);
    if (!matchedRole) {
      return res.status(400).json({ error: `No matching role found for GBU ${gbu}` });
    }

    // 3. Assign role to the user
    await axios.put(`${STRAPI_URL}/users/${userId}`, {
      role: matchedRole.id,
    }, {
      headers: {
        Authorization: `Bearer ${process.env.STRAPI_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    res.json(registerRes.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || { error: "Registration failed." };
    res.status(status).json(message);
  }
});

//Login route
app.post("/api/auth/local", async (req, res) => {
  try {
    const response = await axios.post(`${STRAPI_URL}/auth/local`, req.body, {
      headers: { "Content-Type": "application/json" },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Server error" });
  }
});

//Forgot password route

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const response = await axios.post(`${STRAPI_URL}/auth/forgot-password`, req.body, {
      headers: { "Content-Type": "application/json" },
    });
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

//Reset password route

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const response = await axios.post(`${STRAPI_URL}/auth/reset-password`, req.body, {
      headers: { "Content-Type": "application/json" },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Server error" });
  }
});

//Get the current user based on the JWT.

app.get("/api/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const response = await axios.get(`${STRAPI_URL}/users/me?populate=role`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
});

//Proxy route to forward data requests to the correct Strapi GBU collection.
//Only authorized collections are allowed.

app.get("/api/:collection", async (req, res) => {
  const jwt = req.headers.authorization?.split(" ")[1];
  const collection = req.params.collection;
  const allowed = ["gbus", "gbu2s", "gbu3s", "gbu4s"];

  if (!jwt || !allowed.includes(collection)) {
    return res.status(401).json({ error: "Unauthorized or invalid collection" });
  }

  try {
    const strapiRes = await axios.get(`${STRAPI_URL}/${collection}?pagination[pageSize]=100`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });
    res.json(strapiRes.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || { error: "Failed to fetch collection" };
    res.status(status).json(message);
  }
});

//Start HTTPS server using local development certificates.
 
const httpsOptions = {
  key: fs.readFileSync(__dirname + "/certs/key.pem"),
  cert: fs.readFileSync(__dirname + "/certs/cert.pem"),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`Secure proxy running at https://localhost:${PORT}`);
});

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
app.use(express.json()); // Parses JSON body

// 👉 Public route: Register
app.post("/api/auth/local/register", async (req, res) => {
  try {
    const response = await axios.post(`${STRAPI_URL}/auth/local/register`, req.body, {
      headers: { "Content-Type": "application/json" },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Server error" });
  }
});

// Public route: Login
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

// Public route: Forgot password
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

//Public route: Reset password
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

// Protect private routes with API Key
app.use("/api/data-acts", (req, res, next) => {
  const clientKey = req.header("X-API-KEY");
  if (!clientKey || clientKey !== API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
});

// Fetch Strapi collection (requires token)
app.get("/api/data-acts", async (req, res) => {
  try {
    const response = await axios.get(`${STRAPI_URL}/data-acts`, {
      headers: {
        Authorization: `Bearer ${process.env.STRAPI_TOKEN}`,
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error while calling Strapi" });
  }
});

// HTTPS local server (certificate from certs/)
const httpsOptions = {
  key: fs.readFileSync(__dirname + "/certs/key.pem"),
  cert: fs.readFileSync(__dirname + "/certs/cert.pem"),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`Secure proxy running at https://localhost:${PORT}`);
});

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY;

// Middleware :  verify if api key is in the header 
app.use("/api", (req, res, next) => {
  const clientKey = req.header("X-API-KEY");
  if (!clientKey || clientKey !== API_KEY) {
    console.warn("⛔ Accès refusé : clé API invalide ou absente");
    return res.status(401).json({ error: "Clé API invalide" });
  }
  next();
});



// Route proxy to Strapi
app.get("/api/data-acts", async (req, res) => {
  try {
    const response = await axios.get(`${process.env.STRAPI_API_URL}/data-acts`, {
      headers: {
        Authorization: `Bearer ${process.env.STRAPI_TOKEN}`,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erreur lors de l'appel à Strapi :", error.message);
    res.status(500).json({ error: "Erreur lors de l'appel à Strapi" });
  }
});

const httpsOptions = {
  key: fs.readFileSync(__dirname + "/certs/key.pem"),
  cert: fs.readFileSync(__dirname + "/certs/cert.pem")
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`🔐 Proxy sécurisé actif sur : https://localhost:${PORT}`);
});

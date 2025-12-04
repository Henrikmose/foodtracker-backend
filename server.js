import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import "dotenv/config";

const app = express();

// CORS: allow your GitHub Pages + local testing
app.use(
  cors({
    origin: [
      "https://henrikmose.github.io",
      "http://localhost:3000",
      "http://localhost:5500"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// -----------------------------
// ENVIRONMENT VARIABLES
// -----------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = "gpt-4o-mini"; // safe small model; change if desired

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

// Simple health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

// -----------------------------
// OpenAI Proxy Route (GPT)
// -----------------------------
app.post("/api/ai", async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY");
      return res
        .status(500)
        .json({ error: "Server is missing OPENAI_API_KEY. Check Render env." });
    }

    const { messages, max_tokens = 800, temperature = 0.7 } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens,
        temperature
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return res.status(500).json({
        error: "OpenAI request failed",
        status: response.status,
        details: errorText
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("OpenAI /api/ai route error:", error);
    return res.status(500).json({ error: "OpenAI request failed (exception)" });
  }
});

// -----------------------------
// Nutritionix SEARCH Route
// -----------------------------
app.post("/api/nutritionix/search", async (req, res) => {
  try {
    if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_APP_KEY) {
      console.error("Missing Nutritionix keys");
      return res.status(500).json({
        error: "Server missing Nutritionix credentials"
      });
    }

    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Missing query" });
    }

    const result = await fetch(
      "https://trackapi.nutritionix.com/v2/natural/nutrients",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-id": NUTRITIONIX_APP_ID,
          "x-app-key": NUTRITIONIX_APP_KEY
        },
        body: JSON.stringify({ query })
      }
    );

    if (!result.ok) {
      const errorText = await result.text();
      console.error("Nutritionix search error:", result.status, errorText);
      return res
        .status(500)
        .json({ error: "Nutritionix search failed", details: errorText });
    }

    const data = await result.json();
    return res.json(data);
  } catch (error) {
    console.error("Nutritionix Search Exception:", error);
    return res
      .status(500)
      .json({ error: "Nutritionix search failed (exception)" });
  }
});

// -----------------------------
// Nutritionix BARCODE Lookup
// -----------------------------
app.get("/api/nutritionix/barcode/:upc", async (req, res) => {
  try {
    if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_APP_KEY) {
      console.error("Missing Nutritionix keys");
      return res.status(500).json({
        error: "Server missing Nutritionix credentials"
      });
    }

    const upc = req.params.upc;

    const result = await fetch(
      `https://trackapi.nutritionix.com/v2/search/item?upc=${encodeURIComponent(
        upc
      )}`,
      {
        method: "GET",
        headers: {
          "x-app-id": NUTRITIONIX_APP_ID,
          "x-app-key": NUTRITIONIX_APP_KEY
        }
      }
    );

    if (!result.ok) {
      const errorText = await result.text();
      console.error("Nutritionix barcode error:", result.status, errorText);
      return res
        .status(500)
        .json({ error: "Nutritionix barcode lookup failed", details: errorText });
    }

    const data = await result.json();
    return res.json(data);
  } catch (error) {
    console.error("Nutritionix Barcode Exception:", error);
    return res.status(500).json({
      error: "Nutritionix barcode lookup failed (exception)"
    });
  }
});

// -----------------------------
// Start server
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

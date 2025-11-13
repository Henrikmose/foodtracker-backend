import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------
// ENVIRONMENT VARIABLES
// -----------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = "gpt-4o-mini"; // safe default model name; change later if needed

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

// -----------------------------
// OpenAI Proxy Route (GPT-5)
// -----------------------------
app.post("/api/ai", async (req, res) => {
  try {
    const { messages, max_tokens = 800, temperature = 0.7 } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens,
        temperature
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: "OpenAI request failed." });
  }
});

// -----------------------------
// Nutritionix SEARCH Route
// -----------------------------
app.post("/api/nutritionix/search", async (req, res) => {
  try {
    const { query } = req.body;

    const result = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-id": NUTRITIONIX_APP_ID,
        "x-app-key": NUTRITIONIX_APP_KEY
      },
      body: JSON.stringify({ query })
    });

    const data = await result.json();
    res.json(data);
  } catch (error) {
    console.error("Nutritionix Search Error:", error);
    res.status(500).json({ error: "Nutritionix search failed." });
  }
});

// -----------------------------
// Nutritionix BARCODE Lookup
// -----------------------------
app.get("/api/nutritionix/barcode/:upc", async (req, res) => {
  try {
    const upc = req.params.upc;

    const result = await fetch(
      `https://trackapi.nutritionix.com/v2/search/item?upc=${upc}`,
      {
        method: "GET",
        headers: {
          "x-app-id": NUTRITIONIX_APP_ID,
          "x-app-key": NUTRITIONIX_APP_KEY
        }
      }
    );

    const data = await result.json();
    res.json(data);
  } catch (error) {
    console.error("Nutritionix Barcode Error:", error);
    res.status(500).json({ error: "Nutritionix barcode lookup failed." });
  }
});

// -----------------------------
app.get("/", (req, res) => {
  res.send("Backend is running ✔");
});
// -----------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const TOKEN = process.env.ULTRAMSG_TOKEN;
const INSTANCE_ID = process.env.INSTANCE_ID;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ULTRAMSG_URL = `https://api.ultramsg.com/${INSTANCE_ID}/messages/chat`;

app.post("/webhook", async (req, res) => {
  const message = req.body?.data?.body;
  const sender = req.body?.data?.from;

  if (!message || !sender) return res.sendStatus(200);

  try {
    // 1. Crea nuova thread
    const threadRes = await axios.post(
      "https://api.openai.com/v1/threads",
      {},
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    const threadId = threadRes.data.id;

    // 2. Aggiungi messaggio dell'utente
    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { role: "user", content: message },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    // 3. Avvia la run dell'assistente
    const runRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    const runId = runRes.data.id;

    // 4. Aspetta la risposta
    let runStatus = "queued";
    while (runStatus !== "completed" && runStatus !== "failed") {
      await new Promise(r => setTimeout(r, 1000));
      const statusRes = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );
      runStatus = statusRes.data.status;
    }

    // 5. Prendi risposta
    const messagesRes = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    const reply = messagesRes.data.data.find(m => m.role === "assistant")?.content?.[0]?.text?.value;

    // 6. Invia via WhatsApp
    if (reply) {
      await axios.post(ULTRAMSG_URL, {
        token: TOKEN,
        to: sender,
        body: reply
      });
      console.log("✅ Risposta inviata:", reply);
    } else {
      console.warn("⚠ Nessuna risposta trovata.");
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Errore:", error.message);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => {
  res.send("StudioArea bot collegato ad Assistant OpenAI");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot attivo sulla porta ${PORT}`);
});

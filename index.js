const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// Variabili d'ambiente
const TOKEN = process.env.ULTRAMSG_TOKEN;
const INSTANCE_ID = process.env.INSTANCE_ID;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ULTRAMSG_URL = `https://api.ultramsg.com/${INSTANCE_ID}/messages/chat`;

app.post("/webhook", async (req, res) => {
  console.log("📩 Webhook ricevuto:", JSON.stringify(req.body, null, 2));

const message = req.body?.dati?.body;
const sender = req.body?.dati?.from;


  console.log("✅ Messaggio ricevuto:", message, "da", sender);

  if (!message || !sender) return res.sendStatus(200);

  try {
    console.log("🚀 Inizio gestione OpenAI...");

    // 1. Crea una nuova thread OpenAI
    const threadRes = await axios.post(
      "https://api.openai.com/v1/threads",
      {},
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    const threadId = threadRes.data.id;
    console.log("📎 Thread ID:", threadId);

    // 2. Aggiunge il messaggio dell'utente
    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { role: "user", content: message },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    // 3. Avvia la run
    const runRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    const runId = runRes.data.id;
    console.log("🏃‍♂️ Run ID:", runId);

    // 4. Attendi completamento run
    let status = "queued";
    while (status !== "completed" && status !== "failed") {
      await new Promise(r => setTimeout(r, 1000));
      const resStatus = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );
      status = resStatus.data.status;
      console.log("⌛ Stato run:", status);
    }

    // 5. Recupera la risposta dell'assistente
    const messagesRes = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    const reply = messagesRes.data.data.find(m => m.role === "assistant")?.content?.[0]?.text?.value;

    console.log("💬 Risposta ricevuta da OpenAI:", reply);

    // 6. Invia la risposta su WhatsApp
    if (reply) {
      console.log("📤 Invio risposta a:", sender);
      await axios.post(ULTRAMSG_URL, {
        token: TOKEN,
        to: sender,
        body: reply
      });
      console.log("✅ Risposta inviata!");
    } else {
      console.warn("⚠️ Nessuna risposta trovata.");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Errore:", error.message);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => {
  res.send("🤖 StudioArea bot attivo e collegato a OpenAI");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot in ascolto sulla porta ${PORT}`);
});

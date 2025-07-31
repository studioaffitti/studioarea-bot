const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "f99pzn1t922xhemv";
const INSTANCE_ID = "136108"; // es: 136108
const ULTRAMSG_URL = `https://api.ultramsg.com/${INSTANCE_ID}/messages/chat`;

app.post("/webhook", async (req, res) => {
  const message = req.body?.data?.body;
  const sender = req.body?.data?.from;

  console.log("Messaggio ricevuto:", message);

  if (sender && message) {
    // Rispondi al messaggio
    await axios.post(ULTRAMSG_URL, {
      token: TOKEN,
      to: sender,
      body: "Ciao! Sono l’assistente virtuale StudioArea. Cerchi un immobile in affitto o in vendita? Oppure vuoi vendere casa?"
    });
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("StudioArea bot attivo");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot in ascolto sulla porta ${PORT}`);
});


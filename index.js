app.post("/webhook", async (req, res) => {
  console.log("📩 Webhook ricevuto:", JSON.stringify(req.body, null, 2));

  // PROVA tutte le strutture conosciute
  const message = req.body?.data?.body || req.body?.body;
  const sender = req.body?.data?.from || req.body?.from;

  if (!message || !sender) {
    console.warn("⚠️ Messaggio o sender mancanti. req.body ricevuto:", JSON.stringify(req.body, null, 2));
    return res.sendStatus(200);
  }

  console.log("✅ Messaggio ricevuto:", message, "da", sender);

  try {
    // --- OpenAI logic ---
    const threadRes = await axios.post(
      "https://api.openai.com/v1/threads",
      {},
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    const threadId = threadRes.data.id;

    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { role: "user", content: message },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    const runRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    const runId = runRes.data.id;

    let status = "queued";
    while (status !== "completed" && status !== "failed") {
      await new Promise((r) => setTimeout(r, 1000));
      const resStatus = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );
      status = resStatus.data.status;
    }

    const messagesRes = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    const reply = messagesRes.data.data.find(m => m.role === "assistant")?.content?.[0]?.text?.value;

    if (reply) {
      await axios.post(ULTRAMSG_URL, {
        token: TOKEN,
        to: sender,
        body: reply,
      });
      console.log("✅ Risposta inviata:", reply);
    } else {
      console.warn("⚠️ Nessuna risposta trovata.");
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Errore:", error.message, error.response?.data);
    res.sendStatus(500);
  }
});

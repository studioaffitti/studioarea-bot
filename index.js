const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
    const message = req.body?.body;
    const sender = req.body?.from;
    console.log("Messaggio ricevuto:", message);

    // Risposta fissa
    res.json({
        to: sender,
        body: "Ciao! Sono l’assistente virtuale StudioArea. Cerchi un immobile in affitto o in vendita? Oppure vuoi vendere casa?"
    });
});

app.get('/', (req, res) => {
    res.send('StudioArea bot attivo');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot in ascolto sulla porta ${PORT}`);
});

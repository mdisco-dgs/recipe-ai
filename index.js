import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const allowedOrigins = [
  'http://localhost:3000',
  'https://tuo-frontend.vercel.app', // o il tuo vero dominio
];

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// ✅ CORS middleware globale (all'inizio, UNA SOLA VOLTA)
app.use(cors({
  origin: function (origin, callback) {
    // Permetti anche richieste senza origin (es: curl, app native)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// ✅ TUTTO il resto dopo
app.post('/generate-recipe', async (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: 'Inserisci almeno un ingrediente.' });
  }

  const prompt = `Suggerisci almeno 3 ricette creative e gustose che utilizzano questi ingredienti: ${ingredients.join(', ')}. 
Per ciascuna ricetta, includi: 
- Titolo
- Elenco degli ingredienti
- Istruzioni

Formatta ogni ricetta iniziando con "Ricetta 1:", "Ricetta 2:", ecc. e rispondi in italiano`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    console.log('Risposta Groq:', data);

    if (data.choices && data.choices.length > 0) {
      const rawText = data.choices[0].message.content.trim();
      const recipes = rawText.split(/(?=Ricetta \d+:)/g).map(r => r.trim()).filter(Boolean);
      res.json({ recipes });
    } else {
      res.status(500).json({ error: 'Errore nella risposta di Groq.' });
    }
  } catch (err) {
    console.error('Errore Groq:', err);
    res.status(500).json({ error: 'Errore nella generazione della ricetta.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server in ascolto sulla porta ${PORT}`);
});

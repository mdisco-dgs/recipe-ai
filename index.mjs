import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const allowedOrigins = [
  'http://localhost:3000',
  'https://tuo-frontend.vercel.app', // frontend autorizzati
];

const app = express();
const PORT = process.env.PORT || 3001;

console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? '***' : 'NON TROVATA');

// Middleware globali
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // richieste senza origin (curl, app native)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json()); // <--- importante per parsare il body JSON

app.post('/generate-recipe', async (req, res) => {
  const { ingredients } = req.body;
  console.log('req.body:', req.body);

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

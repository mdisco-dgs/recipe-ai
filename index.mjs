import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const allowedOrigins = [
  'http://localhost:3000',
  'https://tuo-frontend.vercel.app', // cambia con il tuo dominio frontend in produzione
];

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🔑 GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'TROVATA' : 'NON TROVATA');

// Middleware CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json()); // Per leggere JSON nel body

app.post('/generate-recipe', async (req, res) => {
  const { ingredients } = req.body;
  console.log('📥 Richiesta con ingredienti:', ingredients);

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'Inserisci almeno un ingrediente valido.' });
  }

  const prompt = `
Suggerisci 3 ricette creative e gustose che utilizzano questi ingredienti: ${ingredients.join(', ')}.
Per ciascuna ricetta includi:
- Titolo (come chiave dell'oggetto)
- URL foto
- Ingredienti (array)
- Istruzioni (array)
Rispondi **solo** con un oggetto JSON, senza testo introduttivo né blocchi markdown.
`;

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
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    console.log('🧠 Risposta Groq ricevuta');

    if (data.choices && data.choices.length > 0) {
      let rawText = data.choices[0].message.content.trim();

      // Rimuove blocchi markdown ```json ... ```
      rawText = rawText.replace(/^```json|```$/g, "").trim();

      try {
        const parsed = JSON.parse(rawText); // Oggetto con chiavi "Ricetta 1: Titolo"

        // Trasforma in array strutturato
        const recipesArray = Object.entries(parsed).map(([title, content]) => ({
          title: title.replace(/^Ricetta\s*\d+:\s*/i, "").trim(),
          foto: content.foto,
          ingredienti: content.ingredienti,
          istruzioni: content.istruzioni,
        }));

        return res.json({ recipes: recipesArray });
      } catch (parseError) {
        console.error("❌ Errore nel parsing JSON:", parseError);
        console.log("🔎 Contenuto ricevuto:\n", rawText);
        return res.status(500).json({ error: 'Formato JSON non valido nella risposta del modello.' });
      }
    } else {
      return res.status(500).json({ error: 'Nessuna scelta valida nella risposta del modello.' });
    }
  } catch (err) {
    console.error('❌ Errore durante la richiesta a Groq:', err);
    return res.status(500).json({ error: 'Errore durante la generazione della ricetta.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server in ascolto sulla porta ${PORT}`);
});

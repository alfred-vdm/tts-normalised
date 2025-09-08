// /api/tts-normalised.js  (Vercel Serverless Function)

export default async function handler(req, res) {
  // CORS so Webflow can call it
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Read JSON body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyRaw = Buffer.concat(chunks).toString('utf8');
    const { text } = JSON.parse(bodyRaw || '{}');

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing "text" string' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID; // SAME voice as your agent
    if (!apiKey || !voiceId) {
      return res.status(500).json({ error: 'Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID' });
    }

    const ttsResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2', // or match your agent exactly
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!ttsResp.ok) {
      const errorText = await ttsResp.text();
      return res.status(500).json({ error: 'TTS request failed', detail: errorText });
    }

    const arrayBuffer = await ttsResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (e) {
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}

const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Output a valid JSON object with {"hello": "world"}',
      config: {
        responseMimeType: 'application/json'
      }
    });
    console.log(response.text);
  } catch (err) {
    console.error(err);
  }
}
run();

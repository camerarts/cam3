import { GoogleGenAI } from "@google/genai";

// This service is prepared for future enhancements where Gemini generates
// descriptions or tags for the uploaded images automatically.

const apiKey = process.env.API_KEY || ''; 
// Note: In a real app, never expose keys in client code if not strictly proxied or intended. 
// For this demo, we assume the environment is set up correctly.

export const generateImageCaption = async (base64Image: string): Promise<string> => {
  if (!apiKey) {
    console.warn("No API Key found for Gemini");
    return "AI Description unavailable (No API Key)";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg', 
            },
          },
          {
            text: 'Generate a short, poetic, high-end photography caption for this image. Max 20 words.',
          },
        ],
      },
    });
    return response.text || "Untitled Masterpiece";
  } catch (error) {
    console.error("Gemini generation error:", error);
    return "Untitled Masterpiece";
  }
};
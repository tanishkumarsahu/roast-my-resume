import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const { resumeText, chatHistory, message } = await request.json();

    if (!resumeText) {
      return NextResponse.json({ error: 'Missing resume text context!' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Missing user message!' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY is not configured on the server. Please add your Gemini API Key to your environment variables or .env.local file.'
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Format chat history for Gemini context
    let historyPrompt = '';
    if (chatHistory && chatHistory.length > 0) {
      historyPrompt = chatHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Roaster'}: ${msg.content}`).join('\n');
    }

    const prompt = `You are a savage, sarcastic, and hilarious Resume Roaster. The user has uploaded their resume and you have already roasted it. Now, they are chatting with you. You must maintain your spicy, witty, and highly opinionated roaster persona, while accurately answering questions based on their resume.

Here is the resume context:
---
${resumeText}
---

Conversation history so far:
${historyPrompt}

User says: "${message}"

Respond to the user with a spicy, funny, and direct comment (1-3 sentences maximum). Keep your response relatively short, extremely witty, and firmly grounded in the facts of their resume (or lack thereof). Do not use markdown formatting like headings or bold bullet points. Just give a natural, sarcastic, conversational reply.`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();

    return NextResponse.json({ reply: text.trim() });

  } catch (error) {
    console.error('Server error in /api/chat:', error);
    return NextResponse.json({ error: error.message || 'Internal server error occurred.' }, { status: 500 });
  }
}

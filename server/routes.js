import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { Configuration, OpenAIApi } from 'openai';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const router = express.Router();

router.post('/openai', async (req, res) => {
    console.log('Received request for /api/openai');
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const openai = new OpenAIApi(configuration);  
    const prompt = req.body.prompt;
    try {
      const response = await openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt: prompt,
        temperature: 0.7,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      console.log('OpenAI response:', response.data.choices[0].text.trim());
      res.status(200).send({ response: response.data.choices[0].text.trim() });
    } catch (error) {
      console.error('Error with OpenAI request:', error);
      res.status(500).send({ error: error.message || 'Something went wrong with the OpenAI request' });
    }
  });
  export default router;
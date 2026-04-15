require('dotenv').config();
import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY is required');
}

if (!process.env.PINECONE_INDEX) {
  throw new Error('PINECONE_INDEX is required');
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.Index(process.env.PINECONE_INDEX);

export { pinecone, index };

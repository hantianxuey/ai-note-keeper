import { Pinecone } from '@pinecone-database/pinecone';

let pineconeInstance: Pinecone | null = null;
let indexInstance: any = null;

export function getPinecone() {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is required. Please set it in your .env file or Settings page.');
  }

  if (!process.env.PINECONE_INDEX) {
    throw new Error('PINECONE_INDEX is required. Please set it in your .env file.');
  }

  if (!pineconeInstance) {
    pineconeInstance = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    indexInstance = pineconeInstance.Index(process.env.PINECONE_INDEX);
  }

  return { pinecone: pineconeInstance, index: indexInstance };
}

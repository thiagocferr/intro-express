import { MongoClient } from 'mongodb';

const { DB_HOST, DB_PORT, DB_NAME } = process.env;

export async function setupDB() {
  try {
    const mongoURL = `mongodb://${DB_HOST}:${DB_PORT}`;
    const conn = await MongoClient.connect(mongoURL);

    const isTest = process.env.NODE_ENV === 'test';

    const db = conn.db(`${DB_NAME}${isTest ? '_test' : ''}`);

    return db;
  } catch (error) {
    console.log(error);
  }
}

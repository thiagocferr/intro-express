import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import { setupDB } from './db';
import { defineProjectsRouter } from './router/projects'

export const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.disable('x-powered-by');

export async function bootstrap() {
  const db = await setupDB();

  const handler = (req, res, next) => {
    res.json({ message: 'hello world' });
  };
  app.get('/', handler);

  const projectsRouter = await defineProjectsRouter(db)
  app.use('/projects', projectsRouter);

  return db;
}

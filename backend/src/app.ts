import express from 'express';
import pool from './config/database';
import cors from 'cors';
import dotenv from 'dotenv';
import issueRoutes from './routes/index';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', issueRoutes);

export default app;
import express from 'express';
import pool from './config/database';
import cors from 'cors';
import dotenv from 'dotenv';
import issueRoutes from './routes/index';

dotenv.config();
const app = express();

app.use(cors()); // Permitir requisições do frontend
app.use(express.json()); // Permitir envio de JSON

app.use('/api', issueRoutes); // Agora está alinhado com `server.ts`

// 🔹 Adicionar rota raiz para evitar "Cannot GET /"
app.get('/', (_req, res) => {
  res.send('🚀 Backend Ticket Hub está rodando!');
});

export default app;
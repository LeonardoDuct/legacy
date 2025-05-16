import express, { Request, Response, Router } from 'express';
import pool from '../config/database';

const router: Router = express.Router();

router.get('/', (_req, res) => {
  res.send('Backend legacy está rodando!');
});

router.get('/issues', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.nome AS projeto_principal,
        COUNT(*) FILTER (WHERE i.status = 'opened') AS abertas,
        COUNT(*) FILTER (WHERE i.status = 'opened' AND (i.prazo IS NULL OR i.prazo >= NOW())) AS abertas_dentro_prazo,
        COUNT(*) FILTER (WHERE i.status = 'opened' AND i.prazo < NOW()) AS abertas_com_atraso,
        COUNT(*) FILTER (WHERE i.status = 'closed') AS fechadas,
        COUNT(*) FILTER (WHERE i.status = 'closed' AND i.data_fechamento <= COALESCE(i.prazo, i.data_fechamento)) AS fechadas_dentro_prazo,
        COUNT(*) FILTER (WHERE i.status = 'closed' AND i.data_fechamento > COALESCE(i.prazo, i.data_fechamento)) AS fechadas_com_atraso
      FROM issues i
      JOIN projeto p ON i.id_projeto = p.id
      JOIN repositorio r ON p.id_repositorio = r.id
      GROUP BY r.nome
      ORDER BY r.nome;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao buscar issues' });
  }
});

router.get('/issues/detalhes/:projetoPrincipal', async (req: Request, res: Response) => {
  try {
    const projetoPrincipal = req.params.projetoPrincipal;

    const result = await pool.query(`
     SELECT 
    i.numero_is AS codigo_issue,
    r.nome AS projeto_principal,
    p.nome AS repositorio,
    i.sigla_cliente AS cliente,
    i.labels,
    COALESCE(
        (
            SELECT l
            FROM unnest(i.labels) AS l
            WHERE l ~ '[A-Za-z]'
            LIMIT 1
        ),
        'Labels não definidas'
    ) AS status,
    i.prazo,
    COALESCE(NULLIF(i.responsavel, ''), 'Indefinido') AS responsavel,
    NULL AS prioridade,
    NULL AS score_total,
    i.link AS link 
FROM issues i
JOIN projeto p ON i.id_projeto = p.id
JOIN repositorio r ON p.id_repositorio = r.id
WHERE i.status = 'opened'
AND r.nome = $1
ORDER BY i.prazo ASC NULLS LAST;


    `, [projetoPrincipal]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao buscar issues' });
  }
});

router.get('/issues/filtrar', async (req: Request, res: Response) => {
  try {
    const { dataInicio, dataFim } = req.query; // 🔹 Captura os parâmetros da URL

    let query = `
      SELECT * FROM issues
    `;

    if (dataInicio && dataFim) {
      query += ` WHERE data_abertura BETWEEN '${dataInicio} 00:00:00' AND '${dataFim} 23:59:59'`;
    }

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar issues filtradas:', error);
    res.status(500).json({ message: 'Erro interno ao buscar issues filtradas', error });
  }
});

export default router;
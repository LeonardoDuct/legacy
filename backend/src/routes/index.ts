import express, { Request, Response, Router } from 'express';
import pool from '../config/database';

const router: Router = express.Router();

// 🔹 Rota raiz para evitar erro "Cannot GET /"
router.get('/', (_req, res) => {
  res.send('🚀 Backend Ticket Hub está rodando!');
});

// 🔹 Buscar todas as issues com dados organizados por projeto principal
router.get('/issues', async (_req: Request, res: Response) => {
  try {
    console.log('🔍 Executando consulta SQL...');
    const result = await pool.query(`
     SELECT *
FROM (
  SELECT 
    CASE 
      WHEN i.id_projeto IN (1, 2, 119, 54, 79, 101, 103, 36, 26, 61, 86, 80, 25, 58, 65, 66) THEN 'Desenvolvimento'
      WHEN i.id_projeto IN (109) THEN 'Sustentação'
      WHEN i.id_projeto IN (262, 118, 107, 110) THEN 'QA'
      WHEN i.id_projeto IN (108, 123, 124) THEN 'Projetos'
      WHEN i.id_projeto IN (32, 104, 106, 111, 113) THEN 'Processos'
      WHEN i.id_projeto IN (328, 130, 129) THEN 'Produtos'
      WHEN i.id_projeto IN (125) THEN 'RNC'
      ELSE 'Outro'
    END AS projeto_principal,
    COUNT(*) FILTER (WHERE i.status = 'opened') AS abertas,
    COUNT(*) FILTER (WHERE i.status = 'closed') AS fechadas,
    COUNT(*) FILTER (WHERE i.status = 'closed' AND i.data_fechamento > i.prazo) AS fechadas_com_atraso,
    COUNT(*) FILTER (WHERE i.status = 'opened' AND i.prazo < NOW()) AS abertas_com_atraso
  FROM issues i
  GROUP BY projeto_principal
) AS sub
ORDER BY CASE sub.projeto_principal
  WHEN 'Sustentação' THEN 1
  WHEN 'Processos' THEN 2
  WHEN 'QA' THEN 3
  WHEN 'Projetos' THEN 4
  WHEN 'Produtos' THEN 5
  WHEN 'Desenvolvimento' THEN 6
  WHEN 'RNC' THEN 7
  ELSE 8
END;

    `);

    console.log('✅ Resultado da query:', result.rows); // Log para debug

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro interno ao buscar issues:', error);
    res.status(500).json({ message: 'Erro interno ao buscar issues' });
  }
});

router.get('/issues/detalhes/:projetoPrincipal', async (req: Request, res: Response) => {
    try {
      const projetoPrincipal = req.params.projetoPrincipal; // 🔹 Obtém o nome do projeto selecionado
  
      const result = await pool.query(`
        SELECT 
            i.numero_is AS codigo_issue,
            p.nome AS repositorio,
            i.sigla_cliente AS cliente,
            i.labels AS status,
            i.prazo AS prazo,
            i.responsavel AS responsavel,
            NULL AS prioridade, 
            NULL AS score_total 
        FROM issues i
        JOIN projeto p ON i.id_projeto = p.id
        WHERE i.status = 'opened'
        AND i.id_projeto IN (
            SELECT id FROM projeto WHERE 
                CASE 
                    WHEN id IN (1, 2, 119, 54, 79, 101, 103, 36, 26, 61, 86, 80, 25, 58, 65, 66) THEN 'Desenvolvimento'
                    WHEN id IN (109) THEN 'Sustentação'
                    WHEN id IN (262, 118, 107, 110) THEN 'QA'
                    WHEN id IN (108, 123, 124) THEN 'Projetos'
                    WHEN id IN (32, 104, 106, 111, 113) THEN 'Processos'
                    WHEN id IN (328, 130, 129) THEN 'Produtos'
                    WHEN id IN (125) THEN 'RNC'
                    ELSE 'Outro'
                END = $1
        )
        ORDER BY i.prazo ASC;
      `, [projetoPrincipal]);
  
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Erro ao buscar detalhes das issues:', error);
      res.status(500).json({ message: 'Erro interno ao buscar issues' });
    }
  });

// 🔹 Buscar uma issue específica pelo ID
router.get('/issues/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10); // Converte para número corretamente
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const result = await pool.query('SELECT * FROM issues WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Issue não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao buscar issue por ID:', error);
    res.status(500).json({ message: 'Erro interno ao buscar issue' });
  }
});

export default router;
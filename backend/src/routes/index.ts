import express, { Request, Response, Router } from 'express';
import pool from '../config/database';

const router = Router();

router.get('/', (_req, res) => {
  res.send('Backend legacy está rodando!');
});

router.get('/issues', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
          projeto_principal,
          COALESCE(abertas, 0) AS abertas,
          COALESCE(abertas_dentro_prazo, 0) AS abertas_dentro_prazo,
          COALESCE(abertas_com_atraso, 0) AS abertas_com_atraso,
          COALESCE(fechadas, 0) AS fechadas,
          COALESCE(fechadas_dentro_prazo, 0) AS fechadas_dentro_prazo,
          COALESCE(fechadas_com_atraso, 0) AS fechadas_com_atraso
      FROM (
          SELECT
              CASE
                  WHEN p.id IN (109) THEN 'Sustentação'
                  WHEN p.id IN (113, 111, 106, 104, 73, 32) THEN 'Processos'
                  WHEN p.id IN (133, 110, 107) THEN 'QA'
                  WHEN p.id IN (108) THEN 'Projetos'
                  WHEN p.id IN (130, 129) AND r.id = 328 THEN 'Produtos'
                  WHEN r.id = 3 THEN 'Desenvolvimento'
                  WHEN p.id IN (125) THEN 'RNC'
                  WHEN p.id IN (44) THEN 'CMO'
              END AS projeto_principal,  -- 🔹 Mantendo "projeto_principal" como nome da coluna
              COUNT(*) FILTER (WHERE i.status = 'opened') AS abertas,
              COUNT(*) FILTER (WHERE i.status = 'opened' AND (i.prazo IS NULL OR i.prazo >= NOW())) AS abertas_dentro_prazo,
              COUNT(*) FILTER (WHERE i.status = 'opened' AND i.prazo < NOW()) AS abertas_com_atraso,
              COUNT(*) FILTER (WHERE i.status = 'closed') AS fechadas,
              COUNT(*) FILTER (WHERE i.status = 'closed' AND i.data_fechamento <= COALESCE(i.prazo, i.data_fechamento)) AS fechadas_dentro_prazo,
              COUNT(*) FILTER (WHERE i.status = 'closed' AND i.data_fechamento > COALESCE(i.prazo, i.data_fechamento)) AS fechadas_com_atraso
          FROM issues i
          JOIN projeto p ON i.id_projeto = p.id
          JOIN repositorio r ON p.id_repositorio = r.id
          GROUP BY projeto_principal
      ) subquery
      WHERE projeto_principal IS NOT NULL
      ORDER BY 
          CASE projeto_principal
              WHEN 'Sustentação' THEN 1
              WHEN 'Processos' THEN 2
              WHEN 'QA' THEN 3
              WHEN 'Projetos' THEN 4
              WHEN 'Produtos' THEN 5
              WHEN 'Desenvolvimento' THEN 6
              WHEN 'RNC' THEN 7
              WHEN 'CMO' THEN 8
          END;
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

router.get('/categorias', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
    c.categoria AS nome_categoria,
    c.peso,
    -- 🔹 Cliente: Agora agrupamos todas as siglas, descrições e notas em uma única linha
    COALESCE(
        (SELECT STRING_AGG(cl.sigla_cliente, E'\n') FROM cliente cl),
        'Nenhuma sigla encontrada'
    ) AS classificacao_cliente,
    COALESCE(
        (SELECT STRING_AGG(cl.descricao, E'\n') FROM cliente cl),
        'Nenhuma descrição encontrada'
    ) AS descricao_cliente,
    COALESCE(
        (SELECT STRING_AGG(cl.nota::TEXT, E'\n') FROM cliente cl),
        'Sem nota'
    ) AS score_cliente,
    -- 🔹 Prazo (mantém a lógica)
    COALESCE(sp.classificacao, 'Sem classificação') AS classificacao_prazo,
    COALESCE(sp.dias::TEXT, 'Sem descrição') AS descricao_prazo,
    COALESCE(sp.nota::TEXT, 'Sem nota') AS score_prazo,
    -- 🔹 Impacto, Urgência e Complexidade agrupados corretamente
    COALESCE(
        (SELECT STRING_AGG(l.label, E'\n') FROM labels l WHERE l.label LIKE 'Impacto /%'),
        'Nenhum impacto definido'
    ) AS classificacao_impacto,
    COALESCE(
        (SELECT STRING_AGG(l.descricao, E'\n') FROM labels l WHERE l.label LIKE 'Impacto /%'),
        'Nenhuma descrição'
    ) AS descricao_impacto,
    COALESCE(
        (SELECT STRING_AGG(l.nota::TEXT, E'\n') FROM labels l WHERE l.label LIKE 'Impacto /%'),
        'Sem nota'
    ) AS score_impacto,
    -- 🔹 Urgência agrupada
    COALESCE(
        (SELECT STRING_AGG(u.label, E'\n') FROM labels u WHERE u.label LIKE 'Urgência /%'),
        'Nenhuma urgência definida'
    ) AS classificacao_urgencia,
    COALESCE(
        (SELECT STRING_AGG(u.descricao, E'\n') FROM labels u WHERE u.label LIKE 'Urgência /%'),
        'Nenhuma descrição'
    ) AS descricao_urgencia,
    COALESCE(
        (SELECT STRING_AGG(u.nota::TEXT, E'\n') FROM labels u WHERE u.label LIKE 'Urgência /%'),
        'Sem nota'
    ) AS score_urgencia,
    -- 🔹 Complexidade agrupada
    COALESCE(
        (SELECT STRING_AGG(cmp.label, E'\n') FROM labels cmp WHERE cmp.label LIKE 'Complexidade /%'),
        'Nenhuma complexidade definida'
    ) AS classificacao_complexidade,
    COALESCE(
        (SELECT STRING_AGG(cmp.descricao, E'\n') FROM labels cmp WHERE cmp.label LIKE 'Complexidade /%'),
        'Nenhuma descrição'
    ) AS descricao_complexidade,
    COALESCE(
        (SELECT STRING_AGG(cmp.nota::TEXT, E'\n') FROM labels cmp WHERE cmp.label LIKE 'Complexidade /%'),
        'Sem nota'
    ) AS score_complexidade
FROM categorias c
LEFT JOIN score_prazos sp ON c.categoria = 'Prazo'
ORDER BY c.peso DESC;
    `);

    res.json(result.rows); // 🔹 Retorna os dados como JSON
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ message: 'Erro interno ao buscar categorias' });
  }
});

interface ClassificacaoParams {
  categoria: string;
  classificacao: string;
}

interface ClassificacaoBody {
  descricao?: string;
  score?: number | string;
}

router.put(
  '/classificacao/:categoria/:classificacao',
  async (req: Request<ClassificacaoParams, any, ClassificacaoBody>, res: Response): Promise<void> => {
    try {
      // Decodifica os parâmetros da URL
      const categoria = decodeURIComponent(req.params.categoria).trim();
      const classificacao = decodeURIComponent(req.params.classificacao).trim().replace(/\s*\/\s*/g, ' ');

      // Recupera os dados do corpo da requisição
      const { descricao, score } = req.body;

      // Converte o score para número corretamente
      const scoreAsNumber = score !== undefined ? parseFloat(String(score)) : undefined;

      // Validações
      if (score !== undefined && (scoreAsNumber === undefined || isNaN(scoreAsNumber))) {
        res.status(400).json({ message: 'O campo score deve ser um número válido.' });
        return;
      }

      if (descricao === undefined && scoreAsNumber === undefined) {
        res.status(400).json({ message: 'Envie ao menos uma propriedade para atualizar (descricao ou score).' });
        return;
      }

      // Configuração da query
      let query = '';
      let params: any[] = [];
      if (['Impacto', 'Urgência', 'Complexidade'].includes(categoria)) {
        const labelCompleta = `${categoria} / ${classificacao}`.trim();

        if (descricao !== undefined && scoreAsNumber !== undefined) {
          query = `
            UPDATE labels
            SET descricao = $1, nota = CAST($2 AS double precision)
            WHERE label = $3
            RETURNING *;
          `;
          params = [descricao, scoreAsNumber, labelCompleta];
        } else if (descricao !== undefined) {
          query = `
            UPDATE labels
            SET descricao = $1
            WHERE label = $2
            RETURNING *;
          `;
          params = [descricao, labelCompleta];
        } else {
          query = `
            UPDATE labels
            SET nota = CAST($1 AS double precision)
            WHERE label = $2
            RETURNING *;
          `;
          params = [scoreAsNumber, labelCompleta];
        }
      } else {
        res.status(400).json({ message: 'Categoria inválida' });
        return;
      }

      // Executa a query
      const result = await pool.query(query, params);

      if (result.rows.length > 0) {
        res.json(result.rows[0]); // Retorna o resultado
      } else {
        res.status(404).json({ message: 'Classificação não encontrada' });
      }
    } catch (error) {
      console.error('Erro ao atualizar classificação:', error);
      res.status(500).json({ message: 'Erro interno ao atualizar classificação' });
    }
  }
);


router.put('/categorias/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { titulo, porcentagem } = req.body;

  try {
    const result = await pool.query(
      `UPDATE categorias SET categoria = $1, peso = $2 WHERE id = $3 RETURNING *;`,
      [titulo, porcentagem, id]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'Categoria não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ message: 'Erro interno ao atualizar categoria' });
  }
});

router.delete('/categorias/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM categorias WHERE id = $1 RETURNING *;`, [id]);

    if (result.rows.length > 0) {
      res.json({ message: 'Categoria excluída com sucesso' });
    } else {
      res.status(404).json({ message: 'Categoria não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ message: 'Erro interno ao excluir categoria' });
  }
});



router.delete('/classificacao/:categoria/:classificacao', async (req: Request, res: Response) => {
  const { categoria, classificacao } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM classificacoes WHERE categoria = $1 AND classificacao = $2 RETURNING *;`,
      [categoria, classificacao]
    );

    if (result.rows.length > 0) {
      res.json({ message: 'Classificação excluída com sucesso' });
    } else {
      res.status(404).json({ message: 'Classificação não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao excluir classificação:', error);
    res.status(500).json({ message: 'Erro interno ao excluir classificação' });
  }
});

export default router;
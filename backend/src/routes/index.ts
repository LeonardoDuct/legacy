import express, { Request, Response, Router } from 'express';
import pool from '../config/database';

const router = Router();

interface Issue {
  codigo_issue: number;
  projeto_principal: string;
  repositorio: string;
  cliente: string;
  labels: string[] | null;
  status: string;
  prazo: string | null;
  responsavel: string;
  link: string;
  score_total?: number;
  prioridade?: number; 
}

interface Cliente {
  sigla_cliente: string;
  nota: string;
}

interface Label {
  label: string;
  nota: string;
}

interface ClassificacaoParams {
  categoria: string;
  classificacao: string;
}

interface ClassificacaoBody {
  descricao?: string;
  score?: number | string;
}


function getQueryStringParam(param: any): string | undefined {
  if (typeof param === 'string') return param;
  if (Array.isArray(param)) return param[0];
  return undefined;
}

router.get('/', (_req, res) => {
  res.send('Backend legacy está rodando!');
});

/* --------------------- Issues: Dashboard/Resumo Geral --------------------- */
router.get('/issues', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      WITH grupos AS (
          SELECT 'Sustentação' AS projeto_principal, 1 AS ordem UNION ALL
          SELECT 'Processos', 2 UNION ALL
          SELECT 'QA', 3 UNION ALL
          SELECT 'Projetos', 4 UNION ALL
          SELECT 'Produtos', 5 UNION ALL
          SELECT 'Desenvolvimento', 6 UNION ALL
          SELECT 'RNC', 7 UNION ALL
          SELECT 'CMO', 8
      ),
      resumo AS (
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
              END AS projeto_principal,
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
      )
      SELECT
          g.projeto_principal,
          COALESCE(r.abertas, 0) AS abertas,
          COALESCE(r.abertas_dentro_prazo, 0) AS abertas_dentro_prazo,
          COALESCE(r.abertas_com_atraso, 0) AS abertas_com_atraso,
          COALESCE(r.fechadas, 0) AS fechadas,
          COALESCE(r.fechadas_dentro_prazo, 0) AS fechadas_dentro_prazo,
          COALESCE(r.fechadas_com_atraso, 0) AS fechadas_com_atraso
      FROM grupos g
      LEFT JOIN resumo r ON g.projeto_principal = r.projeto_principal
      ORDER BY g.ordem;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao buscar issues' });
  }
});

/* ---------------------- Issues: Detalhes por Projeto ---------------------- */
router.get('/issues/detalhes/:projetoPrincipal', async (req: Request, res: Response) => {
  try {
    const projetoPrincipal = req.params.projetoPrincipal;
    const dataInicio = getQueryStringParam(req.query.dataInicio);
    const dataFim = getQueryStringParam(req.query.dataFim);

    let filtroData = '';
    const valores: (string | undefined)[] = [projetoPrincipal];

    if (dataInicio && dataFim) {
      filtroData = 'AND i.data_abertura BETWEEN $2 AND $3';
      valores.push(dataInicio, dataFim);
    } else if (dataInicio) {
      filtroData = 'AND i.data_abertura >= $2';
      valores.push(dataInicio);
    } else if (dataFim) {
      filtroData = 'AND i.data_abertura <= $2';
      valores.push(dataFim);
    }

    // Consulta principal das issues
    const sql = `
      SELECT
        i.numero_is AS codigo_issue,
        CASE
          WHEN p.id IN (109) THEN 'Sustentação'
          WHEN p.id IN (113, 111, 106, 104, 73, 32) THEN 'Processos'
          WHEN p.id IN (110, 107) THEN 'QA'
          WHEN p.id IN (108, 123) THEN 'Projetos'
          WHEN p.id IN (130, 129) AND r.id = 328 THEN 'Produtos'
          WHEN r.id = 3 THEN 'Desenvolvimento'
          WHEN p.id IN (125) THEN 'RNC'
          WHEN p.id IN (44) THEN 'CMO'
        END AS projeto_principal,
        p.nome AS repositorio,
        i.sigla_cliente AS cliente,
        i.labels,
        COALESCE(
          (
            SELECT lbl
            FROM unnest(i.labels) AS lbl
            WHERE 
              (
                (p.id IN (109) AND lbl IN (
                  'Status / Não Iniciado', 'Status / Iniciado', 'Status / Liberado', 'Status / Pendente', 'Status / Stand By'
                ))
                OR
                (p.id IN (113, 111, 106, 104, 73, 32) AND lbl IN (
                  'Status / Fila', 'Status / Andamento', 'Status / Ajuste', 'Status / Validação', 'Status / Aguardando', 'Status / Pendente'
                ))
                OR
                (p.id IN (133, 110, 107) AND lbl IN (
                  'Status / Não Iniciado', 'Status / Iniciado', 'Status / Liberado', 'Status / Pendente', 'Status / Stand By'
                ))
                OR
                (p.id IN (108) AND lbl IN (
                  'Status / Acompanhamento', 'Status / Em Andamento', 'Status / Aguardando', 'Status / Stand By', 'Status / Pendencia'
                ))
                OR
                (p.id IN (130, 129) AND r.id = 328 AND lbl IN (
                  'Status / Acompanhamento', 'Status / Em Andamento', 'Status / Aguardando', 'Status / Stand By', 'Status / Pendencia'
                ))
                OR
                (r.id = 3 AND lbl IN (
                  'Status / Andamento', 'Status / Aguardando', 'Status / Pendente', 'Status / Stand By'
                ))
                OR
                (p.id IN (125) AND lbl IN (
                  'Status / ...'
                ))
                OR
                (p.id IN (44) AND lbl IN (
                  'Status / ...'
                ))
              )
            LIMIT 1
          ),
          'Status não definido'
        ) AS status,
        i.prazo,
        COALESCE(NULLIF(i.responsavel, ''), 'Indefinido') AS responsavel,
        i.link AS link 
      FROM issues i
      JOIN projeto p ON i.id_projeto = p.id
      JOIN repositorio r ON p.id_repositorio = r.id
      WHERE i.status = 'opened'
        AND (
          CASE
            WHEN p.id IN (109) THEN 'Sustentação'
            WHEN p.id IN (113, 111, 106, 104, 73, 32) THEN 'Processos'
            WHEN p.id IN (133, 110, 107) THEN 'QA'
            WHEN p.id IN (108) THEN 'Projetos'
            WHEN p.id IN (130, 129) AND r.id = 328 THEN 'Produtos'
            WHEN r.id = 3 THEN 'Desenvolvimento'
            WHEN p.id IN (125) THEN 'RNC'
            WHEN p.id IN (44) THEN 'CMO'
          END
        ) = $1
        ${filtroData}
      ORDER BY i.prazo ASC NULLS LAST;
    `;

    const issuesResult = await pool.query(sql, valores);
    const issues: Issue[] = issuesResult.rows;

    // Busca clientes para score_cliente
    const clientesResult = await pool.query('SELECT sigla_cliente, nota FROM cliente');
    const clientes: Cliente[] = clientesResult.rows;
    const clientesMap: { [sigla: string]: number } = {};
    clientes.forEach((c: Cliente) => { clientesMap[c.sigla_cliente] = parseFloat(c.nota); });

    // Busca labels de categoria (impacto, urgencia, complexidade)
    const labelsResult = await pool.query('SELECT label, nota FROM labels');
    const labelsArr: Label[] = labelsResult.rows;
    const labelsMap: { [key: string]: number } = {};
    labelsArr.forEach((l: Label) => { labelsMap[l.label] = parseFloat(l.nota); });

    // Busca categorias e pesos
    // Exemplo: SELECT categoria, peso FROM categorias
    const categoriasResult = await pool.query('SELECT categoria, peso FROM categorias');
    const categoriasArr: { categoria: string; peso: number }[] = categoriasResult.rows;
    // Monta um MAP para peso de cada categoria
    const categoriaPesoMap: { [cat: string]: number } = {};
    categoriasArr.forEach(row => { categoriaPesoMap[row.categoria] = row.peso; });

    // Função utilitária para extrair classificação de label ("Impacto / Alto" => "Alto")
    function extrairClassificacao(labels: string[] | null, chave: string) {
      if (!labels) return '';
      const found = labels.find(l => l.startsWith(chave + ' / '));
      return found ? found.replace(`${chave} / `, "") : '';
    }

    // Monta resultado com score_total, score_breakdown e prioridade
    const issuesComScore = issues.map((issue: Issue) => {
      const labels = issue.labels || [];

      // CLIENTE
      const classificacaoCliente = issue.cliente || '';
      const scoreCliente = clientesMap[classificacaoCliente] || 0;
      const pesoCliente = categoriaPesoMap['Cliente'] ?? 30;

      // PRAZO
      const classificacaoPrazo = issue.prazo || '';
      let scorePrazo = 0;
      if (issue.prazo) {
        const prazoDate = new Date(issue.prazo);
        const hoje = new Date();
        const diasAtraso = Math.ceil((hoje.getTime() - prazoDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diasAtraso > 0) {
          if (diasAtraso <= 10) scorePrazo = diasAtraso * 1;
          else if (diasAtraso <= 20) scorePrazo = 10 + (diasAtraso - 10) * 2;
          else if (diasAtraso <= 30) scorePrazo = 30 + (diasAtraso - 20) * 3;
          else scorePrazo = 60 + (diasAtraso - 30) * 5;
        }
      }
      const pesoPrazo = categoriaPesoMap['Prazo'] ?? 30;

      // URGÊNCIA
      const classificacaoUrgencia = extrairClassificacao(labels, 'Urgência');
      const labelUrgencia = classificacaoUrgencia ? `Urgência / ${classificacaoUrgencia}` : '';
      const scoreUrgencia = labelUrgencia && labelsMap[labelUrgencia] !== undefined ? labelsMap[labelUrgencia] : 0;
      const pesoUrgencia = categoriaPesoMap['Urgência'] ?? 20;

      // COMPLEXIDADE
      const classificacaoComplexidade = extrairClassificacao(labels, 'Complexidade');
      const labelComplexidade = classificacaoComplexidade ? `Complexidade / ${classificacaoComplexidade}` : '';
      const scoreComplexidade = labelComplexidade && labelsMap[labelComplexidade] !== undefined ? labelsMap[labelComplexidade] : 0;
      const pesoComplexidade = categoriaPesoMap['Complexidade'] ?? 15;

      // IMPACTO
      const classificacaoImpacto = extrairClassificacao(labels, 'Impacto');
      const labelImpacto = classificacaoImpacto ? `Impacto / ${classificacaoImpacto}` : '';
      const scoreImpacto = labelImpacto && labelsMap[labelImpacto] !== undefined ? labelsMap[labelImpacto] : 0;
      const pesoImpacto = categoriaPesoMap['Impacto'] ?? 5;

      // Monta o breakdown dinâmico, SEM nenhum dado fixo
      const breakdown = [
        {
          categoria: 'Cliente',
          peso: pesoCliente,
          classificacao: classificacaoCliente,
          score: scoreCliente,
          subTotal: Math.round(scoreCliente * pesoCliente / 100 * 100) / 100
        },
        {
          categoria: 'Prazo',
          peso: pesoPrazo,
          classificacao: classificacaoPrazo,
          score: scorePrazo,
          subTotal: Math.round(scorePrazo * pesoPrazo / 100 * 100) / 100
        },
        {
          categoria: 'Urgência',
          peso: pesoUrgencia,
          classificacao: classificacaoUrgencia,
          score: scoreUrgencia,
          subTotal: Math.round(scoreUrgencia * pesoUrgencia / 100 * 100) / 100
        },
        {
          categoria: 'Complexidade',
          peso: pesoComplexidade,
          classificacao: classificacaoComplexidade,
          score: scoreComplexidade,
          subTotal: Math.round(scoreComplexidade * pesoComplexidade / 100 * 100) / 100
        },
        {
          categoria: 'Impacto',
          peso: pesoImpacto,
          classificacao: classificacaoImpacto,
          score: scoreImpacto,
          subTotal: Math.round(scoreImpacto * pesoImpacto / 100 * 100) / 100
        }
      ];

      const score_total = breakdown.reduce((sum, cat) => sum + cat.subTotal, 0);

      return {
        ...issue,
        score_total,
        score_breakdown: breakdown
      };
    });

    // Ordena por maior score_total
    issuesComScore.sort((a, b) => b.score_total - a.score_total);

    // Atribui prioridade única e inteira
    issuesComScore.forEach((issue, idx) => {
      issue.prioridade = idx + 1; // prioridade 1 = mais alta
    });

    res.json(issuesComScore);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro interno ao buscar issues' });
  }
});

/* --------------------- Issues: Dashboard/Resumo Filtrado --------------------- */
router.get('/issues/filtrar', async (req: Request, res: Response) => {
  try {
    const { dataInicio, dataFim } = req.query;

    let filtroDatas = '';
    let params: any[] = [];
    if (dataInicio && dataFim) {
      filtroDatas = `AND i.data_abertura BETWEEN $1 AND $2`;
      params = [`${dataInicio} 00:00:00`, `${dataFim} 23:59:59`];
    }

    const result = await pool.query(`
      WITH grupos AS (
          SELECT 'Sustentação' AS projeto_principal, 1 AS ordem UNION ALL
          SELECT 'Processos', 2 UNION ALL
          SELECT 'QA', 3 UNION ALL
          SELECT 'Projetos', 4 UNION ALL
          SELECT 'Produtos', 5 UNION ALL
          SELECT 'Desenvolvimento', 6 UNION ALL
          SELECT 'RNC', 7 UNION ALL
          SELECT 'CMO', 8
      ),
      resumo AS (
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
              END AS projeto_principal,
              COUNT(*) FILTER (WHERE i.status = 'opened') AS abertas,
              COUNT(*) FILTER (WHERE i.status = 'opened' AND (i.prazo IS NULL OR i.prazo >= NOW())) AS abertas_dentro_prazo,
              COUNT(*) FILTER (WHERE i.status = 'opened' AND i.prazo < NOW()) AS abertas_com_atraso,
              COUNT(*) FILTER (WHERE i.status = 'closed') AS fechadas,
              COUNT(*) FILTER (WHERE i.status = 'closed' AND i.data_fechamento <= COALESCE(i.prazo, i.data_fechamento)) AS fechadas_dentro_prazo,
              COUNT(*) FILTER (WHERE i.status = 'closed' AND i.data_fechamento > COALESCE(i.prazo, i.data_fechamento)) AS fechadas_com_atraso
          FROM issues i
          JOIN projeto p ON i.id_projeto = p.id
          JOIN repositorio r ON p.id_repositorio = r.id
          WHERE 1=1
          ${filtroDatas} -- aqui entra o seu filtro de datas, se houver
          GROUP BY projeto_principal
      )
      SELECT
          g.projeto_principal,
          COALESCE(r.abertas, 0) AS abertas,
          COALESCE(r.abertas_dentro_prazo, 0) AS abertas_dentro_prazo,
          COALESCE(r.abertas_com_atraso, 0) AS abertas_com_atraso,
          COALESCE(r.fechadas, 0) AS fechadas,
          COALESCE(r.fechadas_dentro_prazo, 0) AS fechadas_dentro_prazo,
          COALESCE(r.fechadas_com_atraso, 0) AS fechadas_com_atraso
      FROM grupos g
      LEFT JOIN resumo r ON g.projeto_principal = r.projeto_principal
      ORDER BY g.ordem;
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar issues filtradas:', error);
    res.status(500).json({ message: 'Erro interno ao buscar issues filtradas', error });
  }
});

/* ---------------------- Categorias: Dashboard e Admin ---------------------- */
router.get('/categorias', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.categoria AS nome_categoria,
        c.peso,
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
        COALESCE(sp.classificacao, 'Sem classificação') AS classificacao_prazo,
        COALESCE(sp.dias::TEXT, 'Sem descrição') AS descricao_prazo,
        COALESCE(sp.nota::TEXT, 'Sem nota') AS score_prazo,
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

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ message: 'Erro interno ao buscar categorias' });
  }
});

/* ---------------------- Atualizar Classificações (PUT) ---------------------- */
router.put(
  '/classificacao/:categoria/:classificacao',
  async (req: Request<ClassificacaoParams, any, ClassificacaoBody>, res: Response): Promise<void> => {
    try {
      const categoria = decodeURIComponent(req.params.categoria).trim();
      const classificacao = decodeURIComponent(req.params.classificacao).trim().replace(/\s*\/\s*/g, ' ');

      const { descricao, score } = req.body;
      const scoreAsNumber = score !== undefined ? parseFloat(String(score)) : undefined;

      if (score !== undefined && (scoreAsNumber === undefined || isNaN(scoreAsNumber))) {
        res.status(400).json({ message: 'O campo score deve ser um número válido.' });
        return;
      }

      if (descricao === undefined && scoreAsNumber === undefined) {
        res.status(400).json({ message: 'Envie ao menos uma propriedade para atualizar (descricao ou score).' });
        return;
      }

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

      const result = await pool.query(query, params);

      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ message: 'Classificação não encontrada' });
      }
    } catch (error) {
      console.error('Erro ao atualizar classificação:', error);
      res.status(500).json({ message: 'Erro interno ao atualizar classificação' });
    }
  }
);

/* ------------------ Atualizar Categoria (PUT) ------------------ */
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

/* ---------------------- Deletar Categoria (DELETE) ---------------------- */
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

/* ---------------------- Deletar Classificação (DELETE) ---------------------- */
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
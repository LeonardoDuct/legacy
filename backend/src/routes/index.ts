import express, { Request, Response, Router } from 'express';
import pool from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middlewares/authMiddleware';

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

interface UsuarioBody {
  nome: string;
  email: string;
  senha: string;
  admin: boolean;
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

interface CategoriaParams {
  nome_categoria: string;
}

interface CategoriaBody {
  titulo: string;
  porcentagem: number;
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
                  WHEN p.id IN (113, 111, 106, 104, 32) THEN 'Processos'
                  WHEN p.id IN (110, 107) THEN 'QA'
                  WHEN p.id IN (108, 123, 124) THEN 'Projetos'
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
        i.id AS id_issue,
        i.numero_is AS codigo_issue,
        CASE
          WHEN p.id IN (109) THEN 'Sustentação'
          WHEN p.id IN (113, 111, 106, 104, 32) THEN 'Processos'
          WHEN p.id IN (110, 107) THEN 'QA'
          WHEN p.id IN (108, 123, 124) THEN 'Projetos'
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
    WHERE lbl LIKE 'Status /%'
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
            WHEN p.id IN (113, 111, 106, 104, 32) THEN 'Processos'
            WHEN p.id IN (110, 107) THEN 'QA'
            WHEN p.id IN (108, 123, 124) THEN 'Projetos'
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
    const categoriasResult = await pool.query('SELECT categoria, peso FROM categorias');
    const categoriasArr: { categoria: string; peso: number }[] = categoriasResult.rows;
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
        // Zera horas para evitar arredondamento de dias
        prazoDate.setHours(0, 0, 0, 0);
        hoje.setHours(0, 0, 0, 0);
        const diasAtraso = Math.floor((hoje.getTime() - prazoDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diasAtraso > 0) {
          if (diasAtraso <= 10) scorePrazo = diasAtraso * 1;
          else if (diasAtraso <= 20) scorePrazo = 10 + (diasAtraso - 10) * 2;
          else if (diasAtraso <= 30) scorePrazo = 30 + (diasAtraso - 20) * 3;
          else scorePrazo = 60 + (diasAtraso - 30) * 5;
        }
      }
      const pesoPrazo = categoriaPesoMap['Prazo'] ?? 0;

      // URGÊNCIA
      const classificacaoUrgencia = extrairClassificacao(labels, 'Urgência');
      const labelUrgencia = classificacaoUrgencia ? `Urgência / ${classificacaoUrgencia}` : '';
      const scoreUrgencia = labelUrgencia && labelsMap[labelUrgencia] !== undefined ? labelsMap[labelUrgencia] : 0;
      const pesoUrgencia = categoriaPesoMap['Urgência'] ?? 0;

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
          subTotal: Number((scoreCliente * pesoCliente / 100).toFixed(2))
        },
        {
          categoria: 'Prazo',
          peso: pesoPrazo,
          classificacao: classificacaoPrazo,
          score: scorePrazo,
          subTotal: Number((scorePrazo * pesoPrazo / 100).toFixed(2))
        },
        {
          categoria: 'Urgência',
          peso: pesoUrgencia,
          classificacao: classificacaoUrgencia,
          score: scoreUrgencia,
          subTotal: Number((scoreUrgencia * pesoUrgencia / 100).toFixed(2))
        },
        {
          categoria: 'Complexidade',
          peso: pesoComplexidade,
          classificacao: classificacaoComplexidade,
          score: scoreComplexidade,
          subTotal: Number((scoreComplexidade * pesoComplexidade / 100).toFixed(2))
        },
        {
          categoria: 'Impacto',
          peso: pesoImpacto,
          classificacao: classificacaoImpacto,
          score: scoreImpacto,
          subTotal: Number((scoreImpacto * pesoImpacto / 100).toFixed(2))
        }
      ];

      const score_total = Number(breakdown.reduce((sum, cat) => sum + cat.subTotal, 0).toFixed(2));

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
                  WHEN p.id IN (113, 111, 106, 104, 32) THEN 'Processos'
                  WHEN p.id IN (110, 107) THEN 'QA'
                  WHEN p.id IN (108, 123, 124) THEN 'Projetos'
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
          (SELECT STRING_AGG(
            cl.sigla_cliente || '|' || COALESCE(cl.descricao, '') || '|' || COALESCE(cl.nota::TEXT, ''),
            E'\n'
          ) FROM cliente cl),
          ''
        ) AS classificacao_cliente,

        COALESCE(
          (SELECT STRING_AGG(sp.classificacao, E'\n') FROM score_prazos sp),
          'Sem classificação'
        ) AS classificacao_prazo,
        COALESCE(
          (SELECT STRING_AGG(sp.dias::TEXT, E'\n') FROM score_prazos sp),
          'Sem descrição'
        ) AS descricao_prazo,
        COALESCE(
          (SELECT STRING_AGG(sp.nota::TEXT, E'\n') FROM score_prazos sp),
          'Sem nota'
        ) AS score_prazo,

        -- Impacto, Urgência, Complexidade seguem igual
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
      ORDER BY c.peso DESC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ message: 'Erro interno ao buscar categorias' });
  }
});

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
          query = `UPDATE labels SET descricao = $1, nota = CAST($2 AS double precision) WHERE label = $3 RETURNING *;`;
          params = [descricao, scoreAsNumber, labelCompleta];
        } else if (descricao !== undefined) {
          query = `UPDATE labels SET descricao = $1 WHERE label = $2 RETURNING *;`;
          params = [descricao, labelCompleta];
        } else {
          query = `UPDATE labels SET nota = CAST($1 AS double precision) WHERE label = $2 RETURNING *;`;
          params = [scoreAsNumber, labelCompleta];
        }
      } else if (categoria === 'Cliente') {
        // Atualiza cliente
        if (classificacao === undefined) {
          res.status(400).json({ message: 'Sigla do cliente obrigatória.' });
          return;
        }
        const sets: string[] = [];
        const updateValues: any[] = [];
        if (descricao !== undefined) {
          sets.push('descricao = $' + (updateValues.length + 1));
          updateValues.push(descricao);
        }
        if (scoreAsNumber !== undefined) {
          sets.push('nota = CAST($' + (updateValues.length + 1) + ' AS double precision)');
          updateValues.push(scoreAsNumber);
        }
        if (sets.length === 0) {
          res.status(400).json({ message: 'Nada para atualizar.' });
          return;
        }
        query = `UPDATE cliente SET ${sets.join(', ')} WHERE sigla_cliente = $${updateValues.length + 1} RETURNING *;`;
        params = [...updateValues, classificacao];
      } else if (categoria === 'Prazo') {
        // Atualiza score_prazos
        if (classificacao === undefined) {
          res.status(400).json({ message: 'Classificação do prazo obrigatória.' });
          return;
        }
        const sets: string[] = [];
        const updateValues: any[] = [];
        if (descricao !== undefined) {
          sets.push('dias = $' + (updateValues.length + 1));
          updateValues.push(descricao);
        }
        if (scoreAsNumber !== undefined) {
          sets.push('nota = CAST($' + (updateValues.length + 1) + ' AS double precision)');
          updateValues.push(scoreAsNumber);
        }
        if (sets.length === 0) {
          res.status(400).json({ message: 'Nada para atualizar.' });
          return;
        }
        query = `UPDATE score_prazos SET ${sets.join(', ')} WHERE classificacao = $${updateValues.length + 1} RETURNING *;`;
        params = [...updateValues, classificacao];
      } else {
        res.status(400).json({ message: 'Categoria inválida.' });
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
router.put(
  '/categorias/:nome_categoria',
  async (req: Request<CategoriaParams, any, CategoriaBody>, res: Response) => {
    const nome_categoria = decodeURIComponent(req.params.nome_categoria);
    const { titulo, porcentagem } = req.body;

    try {
      const result = await pool.query(
        `UPDATE categorias SET categoria = $1, peso = $2 WHERE categoria ILIKE $3 RETURNING *;`,
        [titulo, porcentagem, nome_categoria]
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
  }
);

router.post(
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
        res.status(400).json({ message: 'Envie ao menos uma propriedade para criar (descricao ou score).' });
        return;
      }

      let query = '';
      let params: any[] = [];

      if (['Impacto', 'Urgência', 'Complexidade'].includes(categoria)) {
        // Mantém lógica antiga
        const labelCompleta = `${categoria} / ${classificacao}`.trim();
        if (descricao !== undefined && scoreAsNumber !== undefined) {
          query = `INSERT INTO labels (label, descricao, nota) VALUES ($1, $2, CAST($3 AS double precision)) RETURNING *;`;
          params = [labelCompleta, descricao, scoreAsNumber];
        } else if (descricao !== undefined) {
          query = `INSERT INTO labels (label, descricao) VALUES ($1, $2) RETURNING *;`;
          params = [labelCompleta, descricao];
        } else {
          query = `INSERT INTO labels (label, nota) VALUES ($1, CAST($2 AS double precision)) RETURNING *;`;
          params = [labelCompleta, scoreAsNumber];
        }
      } else if (categoria === 'Cliente') {
        // Insere em cliente (sigla_cliente, descricao, nota)
        if (classificacao === undefined) {
          res.status(400).json({ message: 'Sigla do cliente obrigatória.' });
          return;
        }
        if (descricao === undefined) {
          res.status(400).json({ message: 'Descrição obrigatória para cliente.' });
          return;
        }
        query = `INSERT INTO cliente (sigla_cliente, descricao, nota) VALUES ($1, $2, CAST($3 AS double precision)) RETURNING *;`;
        params = [classificacao, descricao, scoreAsNumber ?? null];
      } else if (categoria === 'Prazo') {
        // Insere em score_prazos (classificacao, dias, nota)
        if (classificacao === undefined) {
          res.status(400).json({ message: 'Classificação do prazo obrigatória.' });
          return;
        }
        if (descricao === undefined) {
          res.status(400).json({ message: 'Quantidade de dias obrigatória em prazo.' });
          return;
        }
        query = `INSERT INTO score_prazos (classificacao, dias, nota) VALUES ($1, $2, CAST($3 AS double precision)) RETURNING *;`;
        params = [classificacao, descricao, scoreAsNumber ?? null];
      } else {
        res.status(400).json({ message: 'Categoria inválida.' });
        return;
      }

      const result = await pool.query(query, params);
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(409).json({ message: 'Já existe uma classificação com esse nome.' });
      } else {
        console.error('Erro ao criar classificação:', error);
        res.status(500).json({ message: 'Erro interno ao criar classificação' });
      }
    }
  }
);

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
    let result;
    if (categoria === 'Prazo') {
      // Para Prazo, classificacao é a string, mas pode precisar identificar pelo id ou outro campo
      result = await pool.query(
        `DELETE FROM score_prazos WHERE classificacao = $1 RETURNING *;`,
        [classificacao]
      );
    } else if (categoria === 'Cliente') {
      result = await pool.query(
        `DELETE FROM cliente WHERE sigla_cliente = $1 RETURNING *;`,
        [classificacao]
      );
    } else if (categoria === 'Impacto' || categoria === 'Urgência' || categoria === 'Complexidade') {
      // Labels são tipo "Impacto / AlgumaCoisa"
      result = await pool.query(
        `DELETE FROM labels WHERE label = $1 RETURNING *;`,
        [`${categoria} / ${classificacao}`]
      );
    } else {
      // Fallback para outras (ou mantenha sua tabela classificacoes caso use)
      result = await pool.query(
        `DELETE FROM classificacoes WHERE categoria = $1 AND classificacao = $2 RETURNING *;`,
        [categoria, classificacao]
      );
    }

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

router.post('/categorias', async (req: Request, res: Response) => {
  const { titulo, porcentagem } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO categorias (categoria, peso) VALUES ($1, $2) RETURNING *;`,
      [titulo, porcentagem]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ message: 'Erro interno ao criar categoria' });
  }
});

router.post(
  '/usuarios',
  async (req: Request<{}, {}, UsuarioBody>, res: Response): Promise<void> => {
    const { nome, email, senha, admin } = req.body;

    try {
      // Verifica se o email já está cadastrado
      const existente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      if (existente.rows.length > 0) {
        res.status(400).json({ mensagem: 'Email já cadastrado' });
        return;
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 10);

      // Inserção no banco, incluindo campo admin
      await pool.query(
        'INSERT INTO usuarios (nome, email, senha_hash, admin) VALUES ($1, $2, $3, $4)',
        [nome, email, senhaHash, !!admin] // garante boolean
      );

      res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
    } catch (erro) {
      console.error('Erro ao cadastrar usuário:', erro);
      res.status(500).json({ mensagem: 'Erro interno' });
    }
  }
);

router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, admin } = req.body;

  try {
    // Atualizar no banco (sem alterar senha)
    await pool.query(
      'UPDATE usuarios SET nome = $1, email = $2, admin = $3 WHERE id = $4',
      [nome, email, admin, id]
    );
    res.status(200).json({ mensagem: 'Usuário atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar usuário:', erro);
    res.status(500).json({ mensagem: 'Erro interno' });
  }
});


router.post(
  '/login',
  async (req: Request, res: Response): Promise<void> => {
    const { email, senha } = req.body;

    if (!email || !senha) {
      res.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
      return;
    }

    try {
      // Busca o usuário pelo email
      const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      const usuario = result.rows[0];

      if (!usuario) {
        res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });
        return;
      }

      // Compara a senha enviada com o hash salvo
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
      if (!senhaCorreta) {
        res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });
        return;
      }

      // Gera o token
      const token = jwt.sign(
        {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          admin: usuario.admin,
        },
        process.env.JWT_SECRET || 'sua_chave_secreta',
        { expiresIn: '8h' }
      );

      // Se precisa trocar a senha, sinaliza no retorno
      const precisaTrocarSenha = usuario.troca_senha;

      res.json({
        token,
        trocaSenha: precisaTrocarSenha, // ← aqui você informa ao frontend
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          admin: usuario.admin,
        }
      });
    } catch (erro) {
      console.error('Erro ao realizar login:', erro);
      res.status(500).json({ mensagem: 'Erro interno ao realizar login.' });
    }
  }
);

router.post('/usuarios/:id/alterar-senha', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { novaSenha } = req.body;
  const usuarioAutenticado = (req as any).user;

  if (!novaSenha) {
    res.status(400).json({ mensagem: 'Nova senha é obrigatória.' });
    return;
  }

  // Validação de autorização
  if (usuarioAutenticado.id !== Number(id)) {
    res.status(403).json({ mensagem: 'Você não tem permissão para alterar esta senha.' });
    return;
  }

  try {
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await pool.query(
      'UPDATE usuarios SET senha_hash = $1, troca_senha = false WHERE id = $2',
      [senhaHash, id]
    );

    res.status(200).json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (erro) {
    console.error('Erro ao alterar senha:', erro);
    res.status(500).json({ mensagem: 'Erro ao alterar senha.' });
  }
});


router.get('/usuarios', async (req: Request, res: Response) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nome, email, admin, criado_em FROM usuarios ORDER BY id DESC'
    );    
    res.json(resultado.rows);
  } catch (erro: any) {
    console.error('Erro ao buscar usuários:', erro.message || erro);
    res.status(500).json({ mensagem: 'Erro ao buscar usuários', erro: erro.message || erro });
  }
});

router.get('/issues/:id/sucessoras', async (req: Request, res: Response): Promise<void> => {
  let { id } = req.params;

  try {
    const idQuery = `SELECT id FROM issues WHERE numero_is = $1`;
    const idResult = await pool.query(idQuery, [id]);

    if (idResult.rows.length > 0) {
      id = idResult.rows[0].id;
    }

    const origemQuery = `
      SELECT i.*, p.nome AS repositorio, r.id AS repositorio_id
      FROM issues i
      JOIN projeto p ON i.id_projeto = p.id
      JOIN repositorio r ON p.id_repositorio = r.id
      WHERE i.id = $1
    `;
    const origemResult = await pool.query(origemQuery, [id]);
    if (origemResult.rows.length === 0) {
      res.status(404).json({ error: 'Issue de origem não encontrada' });
      return;
    }
    const origem = origemResult.rows[0];

    const relacionadasQuery = `SELECT id_is_destino FROM issues_relacionadas WHERE id_is_origem = $1`;
    const relacionadasResult = await pool.query(relacionadasQuery, [id]);
    const destinos = relacionadasResult.rows.map(row => row.id_is_destino);

    if (destinos.length === 0) {
      res.json({
        tituloOrigem: origem.titulo,
        numeroIsOrigem: origem.numero_is,
        repositorioOrigem: origem.repositorio, // ✅ Alteração aqui
        sucessoras: [],
      });
      return;
    }

    const sql = `
      SELECT
        i.id AS id_issue,
        i.numero_is AS codigo_issue,
        i.titulo,
        i.numero_is,
        CASE
          WHEN p.id IN (109) THEN 'Sustentação'
          WHEN p.id IN (113, 111, 106, 104, 32) THEN 'Processos'
          WHEN p.id IN (110, 107) THEN 'QA'
          WHEN p.id IN (108, 123, 124) THEN 'Projetos'
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
            WHERE lbl LIKE 'Status /%'
            LIMIT 1
          ),
          'Status não definido'
        ) AS status,
        i.prazo,
        COALESCE(NULLIF(i.responsavel, ''), 'Indefinido') AS responsavel,
        i.link AS link,
        i.status AS status,
        i.data_fechamento
      FROM issues i
      JOIN projeto p ON i.id_projeto = p.id
      JOIN repositorio r ON p.id_repositorio = r.id
        AND i.id = ANY($1)
      ORDER BY i.prazo ASC NULLS LAST;
    `;

    const issuesResult = await pool.query(sql, [destinos]);
    const issues = issuesResult.rows;

    const clientesResult = await pool.query('SELECT sigla_cliente, nota FROM cliente');
    const clientes = clientesResult.rows;
    const clientesMap: { [sigla: string]: number } = {};
    clientes.forEach((c: any) => { clientesMap[c.sigla_cliente] = parseFloat(c.nota); });

    const labelsResult = await pool.query('SELECT label, nota FROM labels');
    const labelsArr = labelsResult.rows;
    const labelsMap: { [key: string]: number } = {};
    labelsArr.forEach((l: any) => { labelsMap[l.label] = parseFloat(l.nota); });

    const categoriasResult = await pool.query('SELECT categoria, peso FROM categorias');
    const categoriasArr = categoriasResult.rows;
    const categoriaPesoMap: { [cat: string]: number } = {};
    categoriasArr.forEach((row: any) => { categoriaPesoMap[row.categoria] = row.peso; });

    function extrairClassificacao(labels: string[] | null, chave: string) {
      if (!labels) return '';
      const found = labels.find(l => l.startsWith(chave + ' / '));
      return found ? found.replace(`${chave} / `, "") : '';
    }

    function calcularScore(issue: any, clientesMap: {[sigla:string]:number}, categoriaPesoMap: {[cat:string]:number}) {
      const labels = issue.labels || [];

      const classificacaoCliente = issue.cliente || '';
      const scoreCliente = clientesMap[classificacaoCliente] || 0;
      const pesoCliente = categoriaPesoMap['Cliente'] ?? 30;

      let scorePrazo = 0;
      if (issue.prazo) {
        const prazoDate = new Date(issue.prazo);
        const hoje = new Date();
        prazoDate.setHours(0,0,0,0);
        hoje.setHours(0,0,0,0);
        const diasAtraso = Math.floor((hoje.getTime() - prazoDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diasAtraso > 0) {
          if (diasAtraso <= 10) scorePrazo = diasAtraso * 1;
          else if (diasAtraso <= 20) scorePrazo = 10 + (diasAtraso - 10) * 2;
          else if (diasAtraso <= 30) scorePrazo = 30 + (diasAtraso - 20) * 3;
          else scorePrazo = 60 + (diasAtraso - 30) * 5;
        }
      }
      const pesoPrazo = categoriaPesoMap['Prazo'] ?? 30;

      // URGÊNCIA
      const classificacaoUrgencia = extrairClassificacao(labels, 'Urgencia');
      const labelUrgencia = classificacaoUrgencia ? `Urgencia / ${classificacaoUrgencia}` : '';
      const scoreUrgencia = labelUrgencia && labelsMap[labelUrgencia] !== undefined ? labelsMap[labelUrgencia] : 0;
      const pesoUrgencia = categoriaPesoMap['Urgencia'] ?? 20;

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

      const breakdown = [
        { categoria: 'Cliente', peso: pesoCliente, classificacao: classificacaoCliente, score: scoreCliente, subTotal: Number((scoreCliente * pesoCliente / 100).toFixed(2)) },
        { categoria: 'Prazo', peso: pesoPrazo, classificacao: issue.prazo || '', score: scorePrazo, subTotal: Number((scorePrazo * pesoPrazo / 100).toFixed(2)) },
        { categoria: 'Urgência', peso: pesoUrgencia, classificacao: classificacaoUrgencia, score: scoreUrgencia, subTotal: Number((scoreUrgencia * pesoUrgencia / 100).toFixed(2)) },
        { categoria: 'Complexidade', peso: pesoComplexidade, classificacao: classificacaoComplexidade, score: scoreComplexidade, subTotal: Number((scoreComplexidade * pesoComplexidade / 100).toFixed(2)) },
        { categoria: 'Impacto', peso: pesoImpacto, classificacao: classificacaoImpacto, score: scoreImpacto, subTotal: Number((scoreImpacto * pesoImpacto / 100).toFixed(2)) }
      ];

      const scoreTotal = breakdown.reduce((acc, cur) => acc + cur.subTotal, 0);

      return { score_total: Number(scoreTotal.toFixed(2)), score_breakdown: breakdown };
    }

    // 8. Formata issues com score e campo "conclusao" - ✅ Alteração aqui no tratamento de concluídas
    const issuesFormatadas = issues.map(issue => {
      let conclusao: string;

      if (issue.status === 'closed') {
        conclusao = issue.data_fechamento
          ? `Concluído em ${new Date(issue.data_fechamento).toLocaleDateString()}`
          : 'Data de fechamento não informada';
      } else {
        conclusao = issue.prazo
          ? `Expectativa de conclusão ${new Date(issue.prazo).toLocaleDateString()}`
          : 'Sem expectativa de conclusão';
      }

      const { score_total, score_breakdown } = calcularScore(issue, clientesMap, categoriaPesoMap);

      return {
        ...issue,
        conclusao,
        score_total,
        score_breakdown
      };
    });

    // 9. Ordena por score_total desc
    issuesFormatadas.sort((a, b) => b.score_total - a.score_total);

    // 10. Adiciona prioridade
    issuesFormatadas.forEach((issue, index) => {
      issue.prioridade = index + 1;
    });

    // 11. Retorna resultado final - ✅ Alteração aqui para incluir repositorioOrigem
    res.json({
      tituloOrigem: origem.titulo,
      numeroIsOrigem: origem.numero_is,
      repositorioOrigem: origem.repositorio,
      sucessoras: issuesFormatadas,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
import { Request, Response } from 'express';
import pool from '../config/database';
import { calcularScoreCompleto } from '../shared/utils/calcularScore';
import { handleError, handleNotFound } from '../shared/helpers/errorHandler';
import { Issue, Cliente, Label } from '@models/interfaces';

function getQueryStringParam(param: any): string | undefined {
    if (typeof param === 'string') return param;
    if (Array.isArray(param)) return param[0];
    return undefined;
}

export const status = (_req: Request, res: Response) => {
    res.send('Backend legacy está rodando!');
};

export const getIssues = async (_req: Request, res: Response) => {
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
          WHERE i.status_ativa = TRUE
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
        handleError(res, error, 'Erro interno ao buscar issues');
    }
};

export const getDetalhesProjeto = async (req: Request, res: Response) => {
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
        i.titulo AS titulo,
        i.data_abertura,
        i.autor,
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
      AND i.status_ativa = TRUE
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

        // Monta resultado com score_total, score_breakdown e prioridade usando o helper
        const issuesComScore = issues.map((issue: Issue) => {
            const { score_total, score_breakdown } = calcularScoreCompleto(
                issue,
                clientesMap,
                labelsMap,
                categoriaPesoMap
            );
            return {
                ...issue,
                score_total,
                score_breakdown
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
        handleError(res, error, 'Erro interno ao buscar issues');
    }
};

export const getResumoFiltrado = async (req: Request, res: Response) => {
    try {
        const { dataInicio, dataFim } = req.query;

        let filtroDatas = '';
        let params: any[] = [];
        if (dataInicio && dataFim) {
            filtroDatas = `
                AND (
                    (i.data_abertura BETWEEN $1 AND $2)
                    OR (i.data_fechamento BETWEEN $1 AND $2)
                )
            `;
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
          WHERE i.status_ativa = TRUE
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
        handleError(res, error, 'Erro interno ao buscar issues filtradas');
    }
};

export const getSucessoras = async (req: Request, res: Response) => {
    let { id } = req.params;

    try {
        // 1. Busca o ID completo da issue
        const idQuery = `SELECT id FROM issues WHERE numero_is = $1`;
        const idResult = await pool.query(idQuery, [id]);
        if (idResult.rows.length > 0) {
            id = idResult.rows[0].id;
        }

        // 2. Busca os dados da issue de origem
        const origemQuery = `
      SELECT 
        i.*, 
        p.nome AS repositorio, 
        r.id AS repositorio_id,
        i.sigla_cliente AS cliente
      FROM issues i
      JOIN projeto p ON i.id_projeto = p.id
      JOIN repositorio r ON p.id_repositorio = r.id
      WHERE i.id = $1
      AND i.status_ativa = TRUE
    `;
        const origemResult = await pool.query(origemQuery, [id]);
        if (origemResult.rows.length === 0) {
            handleNotFound(res, 'Issue de origem');
            return;
        }
        const origem = origemResult.rows[0];

        // 3. Busca dados para cálculo do score
        const [clientesResult, labelsResult, categoriasResult] = await Promise.all([
            pool.query('SELECT sigla_cliente, nota FROM cliente'),
            pool.query('SELECT label, nota FROM labels'),
            pool.query('SELECT categoria, peso FROM categorias')
        ]);

        // Mapeamento de dados
        const clientesMap: { [sigla: string]: number } = {};
        clientesResult.rows.forEach((c: any) => {
            clientesMap[c.sigla_cliente] = parseFloat(c.nota);
        });

        const labelsMap: { [key: string]: number } = {};
        labelsResult.rows.forEach((l: any) => { labelsMap[l.label] = parseFloat(l.nota); });

        const categoriaPesoMap: { [cat: string]: number } = {};
        categoriasResult.rows.forEach((row: any) => { categoriaPesoMap[row.categoria] = row.peso; });

        // 4. Usando a função utilitária para calcular score da origem
        const { score_total: scoreOrigemTotal, score_breakdown: origemBreakdown } =
            calcularScoreCompleto(origem, clientesMap, labelsMap, categoriaPesoMap);

        // 5. Busca as issues sucessoras
        const relacionadasQuery = `SELECT id_is_destino FROM issues_relacionadas WHERE id_is_origem = $1`;
        const relacionadasResult = await pool.query(relacionadasQuery, [id]);
        const destinos = relacionadasResult.rows.map(row => row.id_is_destino);

        let sucessoras = [];
        if (destinos.length > 0) {
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
            (SELECT lbl FROM unnest(i.labels) AS lbl WHERE lbl LIKE 'Status /%' LIMIT 1),
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
        WHERE i.id = ANY($1)
        AND i.status_ativa = TRUE
        ORDER BY i.prazo ASC NULLS LAST;
      `;

            const issuesResult = await pool.query(sql, [destinos]);
            sucessoras = issuesResult.rows.map(issue => {
                const { score_total, score_breakdown } = calcularScoreCompleto(issue, clientesMap, labelsMap, categoriaPesoMap);
                return {
                    ...issue,
                    score_total,
                    score_breakdown
                };
            });

            // Ordena por score_total decrescente
            sucessoras.sort((a, b) => b.score_total - a.score_total);

            // Adiciona prioridade
            sucessoras.forEach((issue, idx) => {
                issue.prioridade = idx + 1;
            });
        }

        // 6. Retorna o resultado completo
        res.json({
            tituloOrigem: origem.titulo,
            numeroIsOrigem: origem.numero_is,
            repositorioOrigem: origem.repositorio,
            scoreOrigemTotal,
            scoreOrigemBreakdown: origemBreakdown,
            sucessoras
        });
    } catch (error) {
        handleError(res, error, 'Erro interno no servidor');
    }
};

export const getRelatorioPorCliente = async (req: Request, res: Response) => {
    try {
        const { anoInicio, anoFim } = req.query;
        let filtroAnos = '';
        let params: any[] = [];

        // Filtro opcional por intervalo de anos
        if (anoInicio && anoFim) {
            filtroAnos = 'AND EXTRACT(YEAR FROM i.data_fechamento) BETWEEN $1 AND $2';
            params = [anoInicio, anoFim];
        }

        const sql = `
            SELECT
                i.sigla_cliente AS cliente,
                EXTRACT(YEAR FROM i.data_fechamento)::int AS ano,
                COUNT(*) AS fechadas
            FROM issues i
            WHERE i.status = 'closed'
              AND i.status_ativa = TRUE
              AND i.data_fechamento IS NOT NULL
              ${filtroAnos}
            GROUP BY i.sigla_cliente, EXTRACT(YEAR FROM i.data_fechamento)
            ORDER BY cliente, ano;
        `;

        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Erro ao buscar relatório por cliente e ano');
    }
};

export const getRelatorioIssuesFechadas = async (req: Request, res: Response) => {
    try {
        const projetoPrincipal = req.params.projetoPrincipal;
        const dataInicio = req.query.dataInicio as string | undefined;
        const dataFim = req.query.dataFim as string | undefined;

        let filtroData = '';
        const valores: (string | undefined)[] = [projetoPrincipal];

        if (dataInicio && dataFim) {
            filtroData = 'AND i.data_fechamento BETWEEN $2 AND $3';
            valores.push(dataInicio, dataFim);
        } else if (dataInicio) {
            filtroData = 'AND i.data_fechamento >= $2';
            valores.push(dataInicio);
        } else if (dataFim) {
            filtroData = 'AND i.data_fechamento <= $2';
            valores.push(dataFim);
        }

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
          i.sigla_cliente AS cliente,
          i.labels,
          i.data_fechamento,
          COALESCE(NULLIF(i.responsavel, ''), 'Indefinido') AS responsavel
        FROM issues i
        JOIN projeto p ON i.id_projeto = p.id
        JOIN repositorio r ON p.id_repositorio = r.id
        WHERE i.status = 'closed'
        AND i.status_ativa = TRUE
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
        ORDER BY i.data_fechamento ASC NULLS LAST;
      `;

        const issuesResult = await pool.query(sql, valores);
        const issues = issuesResult.rows.map(issue => {
            // Extrai a label de Complexidade
            const complexidade = (issue.labels || []).find((lbl: string) => lbl.startsWith('Complexidade / '));
            return {
                id_issue: issue.id_issue,
                codigo_issue: issue.codigo_issue,
                projeto_principal: issue.projeto_principal,
                cliente: issue.cliente,
                complexidade: complexidade ? complexidade.replace('Complexidade / ', '') : 'Não definida',
                data_fechamento: issue.data_fechamento,
                responsavel: issue.responsavel
            };
        });

        res.json(issues);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao buscar issues fechadas para relatório.' });
    }
  };

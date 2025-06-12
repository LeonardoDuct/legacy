import { Request, Response } from 'express';
import pool from '../config/database';
import { handleError, handleNotFound } from '../shared/helpers/errorHandler';

export const getCategorias = async (_req: Request, res: Response) => {
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
        handleError(res, error, 'Erro interno ao buscar categorias');
    }
};

export const updateCategoria = async (req: Request, res: Response) => {
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
            handleNotFound(res, 'Categoria');
        }
    } catch (error) {
        handleError(res, error, 'Erro interno ao atualizar categoria');
    }
};

export const createCategoria = async (req: Request, res: Response) => {
    const { titulo, porcentagem } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO categorias (categoria, peso) VALUES ($1, $2) RETURNING *;`,
            [titulo, porcentagem]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Erro interno ao criar categoria');
    }
};

export const deleteCategoria = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`DELETE FROM categorias WHERE id = $1 RETURNING *;`, [id]);

        if (result.rows.length > 0) {
            res.json({ message: 'Categoria excluída com sucesso' });
        } else {
            handleNotFound(res, 'Categoria');
        }
    } catch (error) {
        handleError(res, error, 'Erro interno ao excluir categoria');
    }
};
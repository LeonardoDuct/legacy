import { Request, Response } from 'express';
import pool from '../config/database';
import { handleError, handleNotFound } from '../shared/helpers/errorHandler';

export const updateClassificacao = async (req: Request, res: Response) => {
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
            handleNotFound(res, 'Classificação');
        }
    } catch (error) {
        handleError(res, error, 'Erro interno ao atualizar classificação');
    }

};

export const createClassificacao = async (req: Request, res: Response) => {
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
            handleError(res, error, 'Erro interno ao criar classificação');
        }
    }

};

export const deleteClassificacao = async (req: Request, res: Response) => {
    const { categoria, classificacao } = req.params;

    try {
        let result;
        if (categoria === 'Prazo') {
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
            result = await pool.query(
                `DELETE FROM labels WHERE label = $1 RETURNING *;`,
                [`${categoria} / ${classificacao}`]
            );
        } else {
            result = await pool.query(
                `DELETE FROM classificacoes WHERE categoria = $1 AND classificacao = $2 RETURNING *;`,
                [categoria, classificacao]
            );
        }

        if (result.rows.length > 0) {
            res.json({ message: 'Classificação excluída com sucesso' });
        } else {
            handleNotFound(res, 'Classificação');
        }
    } catch (error) {
        handleError(res, error, 'Erro interno ao excluir classificação');
    }
};
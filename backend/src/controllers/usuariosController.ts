import { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { handleError, handleNotFound } from '../shared/helpers/errorHandler';

export const createUsuario = async (req: Request, res: Response) => {
    const { nome, email, senha, admin, head, iprojetos } = req.body;

    try {
        const existente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (existente.rows.length > 0) {
            res.status(400).json({ mensagem: 'Email já cadastrado' });
            return;
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, admin, head, iprojetos) VALUES ($1, $2, $3, $4, $5, $6)',
            [nome, email, senhaHash, !!admin, !!head, !!iprojetos]
        );

        res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
    } catch (erro) {
        handleError(res, erro, 'Erro interno');
    }
};

export const updateUsuario = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nome, email, admin, head, iprojetos } = req.body;

    try {
        await pool.query(
            'UPDATE usuarios SET nome = $1, email = $2, admin = $3, head = $4, iprojetos = $5 WHERE id = $6',
            [nome, email, admin, head, iprojetos, id]
        );
        res.status(200).json({ mensagem: 'Usuário atualizado com sucesso' });
    } catch (error) {
        handleError(res, error, 'Erro interno');
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        res.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
        return;
    }

    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        if (!usuario) {
            res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });
            return;
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaCorreta) {
            res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });
            return;
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                admin: usuario.admin,
                head: usuario.head,
                iprojetos: usuario.iprojetos // Adiciona a flag no token
            },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '8h' }
        );
        const precisaTrocarSenha = usuario.troca_senha;

        res.json({
            token,
            trocaSenha: precisaTrocarSenha,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                admin: usuario.admin,
                head: usuario.head,
                iprojetos: usuario.iprojetos // Adiciona a flag na resposta
            }
        });
    } catch (error) {
        handleError(res, error, 'Erro interno ao realizar login.');
    }
};

export const alterarSenha = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { novaSenha } = req.body;
    const usuarioAutenticado = (req as any).user;

    if (!novaSenha) {
        res.status(400).json({ mensagem: 'Nova senha é obrigatória.' });
        return;
    }

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
    } catch (error) {
        handleError(res, error, 'Erro ao alterar senha.');
    }
};

export const getUsuarios = async (_req: Request, res: Response) => {
    try {
        const resultado = await pool.query(
            'SELECT id, nome, email, admin, head, iprojetos, criado_em FROM usuarios ORDER BY id DESC'
        );
        res.json(resultado.rows);
    } catch (error) {
        handleError(res, error, 'Erro ao buscar usuários');
    }
};

export const resetarSenhaPadrao = async (req: Request, res: Response) => {
    const { id } = req.params;
    const senhaPadrao = 'jallcard';
    try {
        const senhaHash = await bcrypt.hash(senhaPadrao, 10);
        await pool.query(
            'UPDATE usuarios SET senha_hash = $1, troca_senha = true WHERE id = $2',
            [senhaHash, id]
        );
        res.status(200).json({ mensagem: 'Senha resetada para o padrão com sucesso!' });
    } catch (error) {
        handleError(res, error, 'Erro ao resetar senha.');
    }
};
import { Request, Response, RequestHandler } from 'express';
import pool from '../config/database';
import crypto from 'crypto'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { handleError, handleNotFound } from '../shared/helpers/errorHandler';
import { resetPasswordEmail, resetLinkEmail } from '../shared/helpers/emailTemplates';
import { enviarEmail } from '../services/emailService';

export const createUsuario = async (req: Request, res: Response) => {
    const { nome, email, senha, admin, head, iprojetos, adm_categorias, adm_usuarios } = req.body;

    try {
        const existente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (existente.rows.length > 0) {
            res.status(400).json({ mensagem: 'Email já cadastrado' });
            return;
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, admin, head, iprojetos, adm_categorias, adm_usuarios) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [nome, email, senhaHash, !!admin, !!head, !!iprojetos, !!adm_categorias, !!adm_usuarios]
        );

        // Envia email de boas-vindas
        try {
            await enviarEmail(
                email,
                "Bem-vindo ao Sistema Legacy!",
                `Olá ${nome},\n\nSeu cadastro foi realizado com sucesso no sistema Legacy.`
            );
        } catch (erroEmail) {
            console.error("Falha ao enviar email de boas-vindas:", erroEmail);
        }

        res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
    } catch (erro) {
        handleError(res, erro, 'Erro interno');
    }
};

export const updateUsuario = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nome, email, admin, head, iprojetos, adm_categorias, adm_usuarios } = req.body;

    try {
        await pool.query(
            'UPDATE usuarios SET nome = $1, email = $2, admin = $3, head = $4, iprojetos = $5, adm_categorias = $6, adm_usuarios = $7 WHERE id = $8',
            [nome, email, admin, head, iprojetos, adm_categorias, adm_usuarios, id]
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
                iprojetos: usuario.iprojetos,
                adm_categorias: usuario.adm_categorias,
                adm_usuarios: usuario.adm_usuarios
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
                iprojetos: usuario.iprojetos,
                adm_categorias: usuario.adm_categorias,
                adm_usuarios: usuario.adm_usuarios
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
            'SELECT id, nome, email, admin, head, iprojetos, adm_categorias, adm_usuarios, criado_em FROM usuarios ORDER BY id DESC'
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

        const result = await pool.query('SELECT nome, email FROM usuarios WHERE id = $1', [id]);
        const usuario = result.rows[0];

        if (usuario) {
            try {
                const { subject, body } = resetPasswordEmail(usuario.nome);
                await enviarEmail(
                    usuario.email,
                    subject,
                    body
                );
            } catch (erroEmail) {
                console.error("Falha ao enviar email de reset de senha:", erroEmail);
            }
        }

        res.status(200).json({ mensagem: 'Senha resetada para o padrão com sucesso!' });
    } catch (error) {
        handleError(res, error, 'Erro ao resetar senha.');
    }
};

export const solicitarRecuperacaoSenha = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ mensagem: 'E-mail obrigatório.' });
        return;
    }

    const usuario = (await pool.query(
        'SELECT id, nome FROM usuarios WHERE email = $1',
        [email]
    )).rows[0];

    if (!usuario) {
        res.status(200).json({ mensagem: 'Se o e-mail existir, enviaremos instruções.' });
        return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expira_em = new Date(Date.now() + 1000 * 60 * 30); // 30 minutos

    await pool.query(
        'INSERT INTO tokens_recuperacao (usuario_id, token, expira_em) VALUES ($1, $2, $3)',
        [usuario.id, token, expira_em]
    );

    const link = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`;
    const { subject, body } = resetLinkEmail(usuario.nome, link);

    const enviado = await enviarEmail(email, subject, body);
    if (!enviado) {
        console.error("Falha ao enviar e-mail de recuperação.");
    }

    res.status(200).json({ mensagem: 'Se o e-mail existir, enviaremos instruções.' });
};
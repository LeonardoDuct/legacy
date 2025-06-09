import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ mensagem: 'Token não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      console.error('JWT_SECRET não definido no ambiente');
      res.status(500).json({ mensagem: 'Erro interno do servidor' });
      return;
    }

    const decoded = jwt.verify(token, segredo);

    (req as any).user = decoded;
    next();
  } catch (error) {
    console.log('Erro na verificação do token:', error);
    res.status(401).json({ mensagem: 'Token inválido' });
  }
}

import { Response } from 'express';

export function handleError(res: Response, error: any, message: string) {
    console.error(message, error);
    if (process.env.NODE_ENV === 'development') {
        res.status(500).json({ message, error: error?.message || error });
    } else {
        res.status(500).json({ message });
    }
}

export function handleNotFound(res: Response, resource: string = 'Recurso') {
    res.status(404).json({ mensagem: `${resource} não encontrado` });
}
export function resetPasswordEmail(nome: string, senhaPadrao: string = 'jallcard') {
    return {
        subject: 'Redefinição de Senha - Sistema Legacy',
        body: `Olá ${nome},

Sua senha de acesso ao Sistema Legacy foi redefinida para o padrão: ${senhaPadrao}.

Por motivos de segurança, solicitamos que realize o login utilizando a senha padrão e, em seguida, altere-a para uma nova senha de sua preferência.

Em caso de dúvidas, entre em contato com o suporte.

Atenciosamente,
Equipe de Suporte - Jallcard`
    };
}

export function resetLinkEmail(nome: string, link: string) {
    return {
        subject: 'Recuperação de Senha - Sistema Legacy',
        body: `Olá ${nome},

Recebemos uma solicitação para redefinir sua senha.

Clique no link abaixo para criar uma nova senha. O link é válido por 30 minutos:

${link}

Se não foi você que solicitou, ignore este e-mail.

Atenciosamente,
Equipe de Suporte - Jallcard`
    };
}
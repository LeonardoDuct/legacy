import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import * as issuesController from '../controllers/issuesController';
import * as categoriasController from '../controllers/categoriasController';
import * as classificacaoController from '../controllers/classificacaoController';
import * as usuariosController from '../controllers/usuariosController';

const router = Router();

// --------------------- Issues: Usando controller ---------------------
router.get('/', issuesController.status);
router.get('/issues', issuesController.getIssues);
router.get('/issues/detalhes/:projetoPrincipal', issuesController.getDetalhesProjeto);
router.get('/issues/filtrar', issuesController.getResumoFiltrado);
router.get('/issues/:id/sucessoras', issuesController.getSucessoras);

// --------------------- Categorias: Usando controller ---------------------
router.get('/categorias', categoriasController.getCategorias);
router.put('/categorias/:nome_categoria', categoriasController.updateCategoria);
router.post('/categorias', categoriasController.createCategoria);
router.delete('/categorias/:id', categoriasController.deleteCategoria);

// --------------------- Classificação: Usando controller ---------------------
router.put('/classificacao/:categoria/:classificacao', classificacaoController.updateClassificacao);
router.post('/classificacao/:categoria/:classificacao', classificacaoController.createClassificacao);
router.delete('/classificacao/:categoria/:classificacao', classificacaoController.deleteClassificacao);

// --------------------- Usuários: Usando controller ---------------------
router.post('/usuarios', usuariosController.createUsuario);
router.put('/usuarios/:id', usuariosController.updateUsuario);
router.post('/login', usuariosController.login);
router.post('/usuarios/:id/alterar-senha', authMiddleware, usuariosController.alterarSenha);
router.get('/usuarios', usuariosController.getUsuarios);

export default router;
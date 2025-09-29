# Legacy

Legacy é um sistema para gerenciar demandas internas, as IS, facilitando a melhor distribuição das equipes e acompanhamento das atividades. O sistema permite identificar demandas mais prioritárias, otimizando os processos e a gestão do fluxo de trabalho.

## Tecnologias Utilizadas

- **Frontend:** [Angular](https://angular.io/) v19.2.5
- **Backend:** [Express.js](https://expressjs.com/) + TypeScript

## Como rodar o projeto

### Frontend (Angular)

1. Acesse a pasta `ticket-hub`:
    ```bash
    cd ticket-hub
    ```
2. Instale as dependências:
    ```bash
    npm install
    ```
3. Rode o servidor de desenvolvimento:
    ```bash
    ng serve
    ```
4. Acesse [http://localhost:4200](http://localhost:4200) no navegador.

### Backend (Express.js/TypeScript)

1. Acesse a pasta `backend`:
    ```bash
    cd backend
    ```
2. Instale as dependências:
    ```bash
    npm install
    ```
3. Rode o servidor:
    ```bash
    npm start
    ```
4. O backend estará em [http://localhost:3000](http://localhost:3000)

## Geração de código Angular

- Gerar componente:
    ```bash
    ng generate component nome-do-componente
    ```
- Outras opções:
    ```bash
    ng generate directive|pipe|service|class|guard|interface|enum|module
    ```

## Build (produção)

- Build do frontend:
    ```bash
    ng build
    ```
- Artefatos gerados em `dist/`.

## Testes

- **Unitários (Angular):**
    ```bash
    ng test
    ```
- **End-to-end (Angular):**
    ```bash
    ng e2e
    ```

## Ajuda

Para mais informações sobre Angular CLI:  
```bash
ng help
```
Ou acesse a [documentação oficial](https://angular.io/cli).

---

*Atualizado para Angular v19.2.5, backend Express.js na pasta `backend`, e nome do projeto Legacy.*
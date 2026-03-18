# Zé da Carne - Aplicativo de Açougue Online

Um aplicativo web completo e profissional para gerenciamento de vendas de carnes online, com funcionalidades de catálogo, carrinho de compras, pedidos, gerenciamento de clientes e relatórios.

## Funcionalidades

### Para Clientes
- **Autenticação**: Registro e login de usuários
- **Catálogo de Produtos**: Navegação por categorias (Bovino, Suíno, Frango, Embutidos, Rotisseria, Conveniência)
- **Carrinho de Compras**: Adicionar, remover e atualizar quantidade de itens
- **Sistema de Pedidos**: Finalizar compras com opções de retirada ou entrega
- **Histórico de Pedidos**: Acompanhar status dos pedidos
- **Interface Responsiva**: Funciona em desktop, tablet e mobile

### Para Administradores
- **Gerenciamento de Produtos**: Adicionar, editar e deletar produtos
- **Gerenciamento de Clientes**: Visualizar dados de clientes cadastrados
- **Relatórios**: Exportar dados em Excel (Pedidos, Clientes, Produtos)
- **Dashboard**: Visualizar estatísticas gerais

## Tecnologias Utilizadas

### Backend
- **Node.js** com Express.js
- **SQLite** com better-sqlite3
- **ExcelJS** para exportação de relatórios

### Frontend
- **HTML5** com CSS3 moderno
- **JavaScript vanilla** (sem dependências externas)
- **Design responsivo** com Grid e Flexbox
- **Font Awesome** para ícones

## Instalação

### Pré-requisitos
- Node.js 14+ instalado
- npm ou yarn

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/Jonathasdev1/acouguejoia123.git
cd acouguejoia123
```

2. **Instale as dependências**
```bash
npm install
```

3. **Inicie o servidor**
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## Estrutura do Projeto

```
acouguejoia123/
├── public/                 # Arquivos estáticos (frontend)
│   ├── index.html         # Página principal
│   ├── js/
│   │   └── app.js         # Aplicação JavaScript principal
│   └── styles/
│       └── main.css       # Estilos CSS
├── db.js                  # Configuração do banco de dados
├── server-auth.js         # Servidor principal com autenticação
├── server.js              # Servidor original (legado)
├── auth-routes.js         # Rotas de autenticação
├── exportar.js            # Utilitários de exportação
├── package.json           # Dependências do projeto
└── acougue.db             # Banco de dados SQLite
```

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login

### Produtos
- `GET /api/produtos` - Listar todos os produtos
- `GET /api/produtos/:id` - Obter detalhes de um produto
- `POST /api/produtos` - Criar novo produto (admin)
- `PUT /api/produtos/:id` - Atualizar produto (admin)
- `DELETE /api/produtos/:id` - Deletar produto (admin)

### Pedidos
- `POST /api/pedidos` - Criar novo pedido
- `GET /api/pedidos` - Listar todos os pedidos (admin)
- `GET /api/pedidos/cliente/:cliente_id` - Listar pedidos do cliente
- `PATCH /api/pedidos/:id/status` - Atualizar status do pedido

### Clientes
- `GET /api/clientes` - Listar todos os clientes
- `POST /api/clientes` - Cadastrar novo cliente

### Relatórios
- `GET /api/relatorios/exportar` - Exportar relatório em Excel

## Uso

### Para Clientes

1. **Registre-se**: Clique em "Cadastre-se" e preencha seus dados
2. **Faça login**: Use suas credenciais para acessar a plataforma
3. **Navegue pelo catálogo**: Explore os produtos por categoria
4. **Adicione ao carrinho**: Clique em "Adicionar" nos produtos desejados
5. **Finalize a compra**: Vá para o carrinho e clique em "Finalizar Compra"
6. **Acompanhe seu pedido**: Veja o status na seção "Meus Pedidos"

### Para Administradores

1. **Faça login** como administrador
2. **Acesse o painel**: Clique em "Admin" na barra de navegação
3. **Gerencie produtos**: Adicione novos produtos ou edite os existentes
4. **Visualize estatísticas**: Veja o dashboard com dados gerais
5. **Exporte relatórios**: Baixe dados em formato Excel

## Dados Iniciais

O banco de dados vem pré-carregado com uma lista de produtos de exemplo, incluindo:
- Carnes bovinas (Contra Filé, Picanha, Maminha, etc.)
- Carnes suínas (Bisteca, Costela, etc.)
- Frango (Coxa, Peito, etc.)
- Embutidos e Rotisseria
- Itens de conveniência

## Autenticação

O sistema utiliza autenticação simples baseada em email e senha. Dados de login são armazenados no banco SQLite.

**Usuário Admin Padrão** (para criar, use o painel de admin):
- Email: admin@example.com
- Senha: admin123

## Banco de Dados

O projeto utiliza SQLite com as seguintes tabelas:

- **usuario**: Dados de usuários registrados
- **cliente**: Informações de clientes
- **produto**: Catálogo de produtos
- **estoque**: Quantidade em estoque
- **pedido**: Pedidos realizados
- **pedido_item**: Itens de cada pedido
- **pedido_sequencia**: Contador de números de pedidos

## Desenvolvimento

### Para adicionar novas funcionalidades:

1. **Backend**: Edite `server-auth.js` ou crie novos arquivos de rotas
2. **Frontend**: Modifique `public/js/app.js` para adicionar novas páginas
3. **Estilos**: Atualize `public/styles/main.css`

### Para testar a API:

```bash
# Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@example.com","phone":"11999999999","password":"senha123"}'

# Fazer login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"senha123"}'

# Listar produtos
curl http://localhost:3000/api/produtos
```

## Troubleshooting

### Porta 3000 já está em uso
```bash
# Mude a porta
PORT=3001 npm start
```

### Erro ao conectar ao banco de dados
```bash
# Remova o banco antigo e reinicie
rm acougue.db*
npm start
```

### Módulos não encontrados
```bash
# Reinstale as dependências
rm -rf node_modules package-lock.json
npm install
```

## Próximas Melhorias

- [ ] Integração com sistema de pagamento
- [ ] Notificações por email/SMS
- [ ] Dashboard com gráficos avançados
- [ ] Autenticação com JWT
- [ ] App mobile nativa
- [ ] Sistema de avaliações e comentários
- [ ] Cupons e promoções
- [ ] Integração com WhatsApp

## Suporte

Para dúvidas ou problemas, entre em contato através do repositório GitHub.

## Licença

ISC

## Autor

Jonathas Dev - [GitHub](https://github.com/Jonathasdev1)

---

**Desenvolvido com ❤️ para Zé da Carne**

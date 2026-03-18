# Testes da API - Zé da Carne

## Configuração Inicial

Certifique-se de que o servidor está rodando:
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## Testes de Autenticação

### 1. Registrar um novo usuário

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "11999999999",
    "password": "senha123"
  }'
```

**Resposta esperada:**
```json
{
  "message": "Usuário registrado com sucesso",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "role": "cliente"
  }
}
```

### 2. Fazer login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

**Resposta esperada:**
```json
{
  "user": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "role": "cliente"
  },
  "token": "token_1"
}
```

### 3. Tentar login com credenciais inválidas

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "senhaerrada"
  }'
```

**Resposta esperada (401):**
```json
{
  "error": "Email ou senha inválidos"
}
```

## Testes de Produtos

### 1. Listar todos os produtos

```bash
curl http://localhost:3000/api/produtos
```

**Resposta esperada:**
```json
[
  {
    "id": 1,
    "nome": "Contra File",
    "preco": 64.98,
    "categoria": "bovino",
    "ativo": true
  },
  ...
]
```

### 2. Obter detalhes de um produto

```bash
curl http://localhost:3000/api/produtos/1
```

**Resposta esperada:**
```json
{
  "id": 1,
  "nome": "Contra File",
  "preco": 64.98,
  "categoria": "bovino",
  "ativo": true
}
```

### 3. Criar um novo produto (admin)

```bash
curl -X POST http://localhost:3000/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Costela Bovina",
    "preco": 45.90,
    "categoria": "bovino"
  }'
```

**Resposta esperada (201):**
```json
{
  "id": 37,
  "nome": "Costela Bovina",
  "preco": 45.9,
  "categoria": "bovino",
  "ativo": false
}
```

### 4. Atualizar um produto

```bash
curl -X PUT http://localhost:3000/api/produtos/37 \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Costela Bovina Premium",
    "preco": 49.90,
    "categoria": "bovino"
  }'
```

**Resposta esperada:**
```json
{
  "id": 37,
  "nome": "Costela Bovina Premium",
  "preco": 49.9,
  "categoria": "bovino",
  "ativo": false
}
```

### 5. Deletar um produto

```bash
curl -X DELETE http://localhost:3000/api/produtos/37
```

**Resposta esperada:**
```json
{
  "message": "Produto deletado com sucesso"
}
```

## Testes de Clientes

### 1. Listar todos os clientes

```bash
curl http://localhost:3000/api/clientes
```

**Resposta esperada:**
```json
[
  {
    "id": 1,
    "nome": "João Silva",
    "telefone": "11999999999",
    "email": "joao@example.com",
    "endereco": "Rua das Flores, 123, Centro, São Paulo",
    "criado_em": "2026-03-17T22:50:00Z"
  }
]
```

### 2. Cadastrar um novo cliente

```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "telefone": "11988888888",
    "email": "maria@example.com",
    "rua": "Avenida Paulista",
    "numero": "1000",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "complemento": "Apto 501"
  }'
```

**Resposta esperada (201):**
```json
{
  "id": 2,
  "nome": "Maria Santos",
  "telefone": "11988888888",
  "email": "maria@example.com",
  "endereco": "Avenida Paulista, 1000, Bela Vista, São Paulo, Apto 501",
  "criado_em": "2026-03-17T23:00:00Z"
}
```

## Testes de Pedidos

### 1. Criar um novo pedido

```bash
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "tipo_entrega": "delivery",
    "endereco_entrega": "Rua das Flores, 123, Centro, São Paulo",
    "observacao": "Entregar após as 18h",
    "itens": [
      {
        "produto_id": 1,
        "quantidade": 2,
        "preco_unitario": 64.98,
        "subtotal": 129.96
      },
      {
        "produto_id": 2,
        "quantidade": 1,
        "preco_unitario": 79.98,
        "subtotal": 79.98
      }
    ]
  }'
```

**Resposta esperada (201):**
```json
{
  "message": "Pedido criado com sucesso",
  "id": 1,
  "numero_pedido": 1,
  "cliente_id": 1,
  "status": "recebido",
  "total": 209.94,
  "tipo_entrega": "delivery",
  "endereco_entrega": "Rua das Flores, 123, Centro, São Paulo",
  "observacao": "Entregar após as 18h",
  "criado_em": "2026-03-17T23:05:00Z"
}
```

### 2. Listar todos os pedidos

```bash
curl http://localhost:3000/api/pedidos
```

**Resposta esperada:**
```json
[
  {
    "id": 1,
    "numero_pedido": 1,
    "cliente_id": 1,
    "status": "recebido",
    "total": 209.94,
    "tipo_entrega": "delivery",
    "endereco_entrega": "Rua das Flores, 123, Centro, São Paulo",
    "observacao": "Entregar após as 18h",
    "criado_em": "2026-03-17T23:05:00Z"
  }
]
```

### 3. Listar pedidos de um cliente específico

```bash
curl http://localhost:3000/api/pedidos/cliente/1
```

**Resposta esperada:**
```json
[
  {
    "id": 1,
    "numero_pedido": 1,
    "cliente_id": 1,
    "status": "recebido",
    "total": 209.94,
    "tipo_entrega": "delivery",
    "endereco_entrega": "Rua das Flores, 123, Centro, São Paulo",
    "observacao": "Entregar após as 18h",
    "criado_em": "2026-03-17T23:05:00Z"
  }
]
```

### 4. Atualizar status de um pedido

```bash
curl -X PATCH http://localhost:3000/api/pedidos/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "preparando"
  }'
```

**Resposta esperada:**
```json
{
  "message": "Status atualizado",
  "id": 1,
  "numero_pedido": 1,
  "cliente_id": 1,
  "status": "preparando",
  "total": 209.94,
  "tipo_entrega": "delivery",
  "endereco_entrega": "Rua das Flores, 123, Centro, São Paulo",
  "observacao": "Entregar após as 18h",
  "criado_em": "2026-03-17T23:05:00Z"
}
```

## Testes de Relatórios

### 1. Exportar relatório em Excel

```bash
curl -o relatorio.xlsx http://localhost:3000/api/relatorios/exportar
```

O arquivo será salvo como `relatorio.xlsx` contendo três planilhas:
- **Pedidos**: Número, Cliente, Total, Status, Tipo de Entrega, Data
- **Clientes**: ID, Nome, Telefone, Email, Endereço, Data de Cadastro
- **Produtos**: ID, Nome, Preço, Categoria, Estoque

## Testes de Status

### 1. Verificar status da API

```bash
curl http://localhost:3000/api/status
```

**Resposta esperada:**
```json
{
  "message": "API no ar!",
  "status": "ok",
  "storage": "SQLite"
}
```

### 2. Health check

```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "healthy": true
}
```

## Testes com Postman

1. **Importe a coleção** (se disponível)
2. **Configure a variável de ambiente** `base_url` para `http://localhost:3000`
3. **Execute os testes** na ordem sugerida

## Testes de Carga

### Com Apache Bench

```bash
# 1000 requisições com 10 requisições simultâneas
ab -n 1000 -c 10 http://localhost:3000/api/produtos
```

### Com wrk

```bash
# 4 threads, 100 conexões, 30 segundos
wrk -t4 -c100 -d30s http://localhost:3000/api/produtos
```

## Checklist de Testes

- [ ] Autenticação: Registro funciona
- [ ] Autenticação: Login funciona
- [ ] Autenticação: Credenciais inválidas retornam erro
- [ ] Produtos: Listagem retorna todos os produtos
- [ ] Produtos: Detalhes de um produto funcionam
- [ ] Produtos: Criar novo produto funciona
- [ ] Produtos: Atualizar produto funciona
- [ ] Produtos: Deletar produto funciona
- [ ] Clientes: Listagem retorna todos os clientes
- [ ] Clientes: Cadastrar novo cliente funciona
- [ ] Pedidos: Criar novo pedido funciona
- [ ] Pedidos: Listar pedidos funciona
- [ ] Pedidos: Atualizar status do pedido funciona
- [ ] Relatórios: Exportação em Excel funciona
- [ ] Status: API está respondendo corretamente
- [ ] Health: Health check retorna status positivo

## Tratamento de Erros

### Erros Comuns

| Código | Mensagem | Solução |
|--------|----------|---------|
| 400 | Campos obrigatórios faltando | Verifique se todos os campos requeridos foram enviados |
| 401 | Email ou senha inválidos | Verifique as credenciais |
| 404 | Recurso não encontrado | Verifique o ID do recurso |
| 500 | Erro interno do servidor | Verifique os logs do servidor |

## Dicas de Teste

1. **Use o jq** para formatar respostas JSON:
   ```bash
   curl http://localhost:3000/api/produtos | jq .
   ```

2. **Salve respostas em arquivo**:
   ```bash
   curl http://localhost:3000/api/produtos > produtos.json
   ```

3. **Use variáveis no curl**:
   ```bash
   BASE_URL="http://localhost:3000"
   curl $BASE_URL/api/status
   ```

4. **Teste com dados diferentes** para validar validações

5. **Verifique os logs** do servidor para erros

## Próximos Testes

- [ ] Testes de integração com Selenium
- [ ] Testes de performance com k6
- [ ] Testes de segurança com OWASP ZAP
- [ ] Testes de compatibilidade de navegadores
- [ ] Testes de acessibilidade

# Guia de Deployment - Zé da Carne

## Opção 1: Deployment no Heroku

### Pré-requisitos
- Conta no Heroku
- Heroku CLI instalado

### Passos

1. **Faça login no Heroku**
```bash
heroku login
```

2. **Crie uma nova aplicação**
```bash
heroku create ze-da-carne
```

3. **Configure as variáveis de ambiente (se necessário)**
```bash
heroku config:set NODE_ENV=production
```

4. **Faça deploy**
```bash
git push heroku main
```

5. **Abra a aplicação**
```bash
heroku open
```

## Opção 2: Deployment no Railway

### Pré-requisitos
- Conta no Railway
- Railway CLI instalado

### Passos

1. **Conecte seu repositório GitHub**
   - Vá para https://railway.app
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Autorize e selecione o repositório

2. **Configure as variáveis de ambiente**
   - Adicione `PORT` se necessário

3. **Deploy automático**
   - Railway fará deploy automaticamente a cada push

## Opção 3: Deployment em VPS (DigitalOcean, Linode, AWS)

### Pré-requisitos
- VPS com Node.js instalado
- SSH access

### Passos

1. **Conecte ao servidor**
```bash
ssh user@seu-servidor.com
```

2. **Clone o repositório**
```bash
git clone https://github.com/Jonathasdev1/acouguejoia123.git
cd acouguejoia123
```

3. **Instale as dependências**
```bash
npm install --production
```

4. **Use PM2 para manter a aplicação rodando**
```bash
npm install -g pm2
pm2 start server-auth.js --name "ze-da-carne"
pm2 startup
pm2 save
```

5. **Configure Nginx como reverse proxy**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

6. **Configure SSL com Let's Encrypt**
```bash
sudo certbot --nginx -d seu-dominio.com
```

## Opção 4: Deployment com Docker

### Crie um Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Build e execute

```bash
docker build -t ze-da-carne .
docker run -p 3000:3000 ze-da-carne
```

## Opção 5: Deployment no Netlify (Frontend apenas)

Se quiser servir o frontend no Netlify e a API em outro lugar:

1. **Crie um arquivo `netlify.toml`** (já existe no projeto)

2. **Conecte seu repositório**
   - Vá para https://netlify.com
   - Clique em "New site from Git"
   - Selecione o repositório

3. **Configure as variáveis de ambiente**
   - Adicione `VITE_API_URL` apontando para sua API

## Monitoramento

### Logs
```bash
# Heroku
heroku logs --tail

# PM2
pm2 logs

# Docker
docker logs -f container-id
```

### Health Check
```bash
curl https://seu-dominio.com/health
```

## Backup do Banco de Dados

### Backup local
```bash
cp acougue.db acougue.db.backup
```

### Backup automático com cron (Linux)
```bash
0 2 * * * cp /path/to/acougue.db /path/to/backups/acougue.db.$(date +\%Y\%m\%d)
```

## Performance

### Recomendações
- Use um CDN para servir arquivos estáticos
- Configure caching de HTTP
- Use compressão gzip
- Monitore o uso de memória e CPU
- Configure rate limiting

### Exemplo de rate limiting com Express
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por IP
});

app.use('/api/', limiter);
```

## Troubleshooting

### Erro: Port already in use
```bash
# Mude a porta
PORT=8000 npm start
```

### Erro: Database locked
```bash
# Reinicie a aplicação
pm2 restart ze-da-carne
```

### Erro: Out of memory
```bash
# Aumente o limite de memória
node --max-old-space-size=4096 server-auth.js
```

## Checklist de Deployment

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados migrado
- [ ] SSL/HTTPS configurado
- [ ] Backups configurados
- [ ] Monitoramento ativo
- [ ] Logs sendo coletados
- [ ] Rate limiting configurado
- [ ] CORS configurado corretamente
- [ ] Testes de carga realizados
- [ ] Documentação atualizada

## Suporte

Para dúvidas sobre deployment, consulte a documentação oficial das plataformas ou entre em contato.

// Rotas de Autenticação e Relatórios para adicionar ao server.js

// ============================================================================
// AUTENTICAÇÃO - Registro de usuário
// ============================================================================
app.post("/api/auth/register", (req, res) => {
	const { name, email, phone, password } = req.body;

	if (!name || !email || !phone || !password) {
		return res.status(400).json({ error: "Campos obrigatórios faltando" });
	}

	try {
		// Verifica se a tabela usuario existe, se não, cria
		db.exec(`
			CREATE TABLE IF NOT EXISTS usuario (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				nome TEXT NOT NULL,
				email TEXT NOT NULL UNIQUE,
				telefone TEXT NOT NULL,
				senha TEXT NOT NULL,
				role TEXT NOT NULL DEFAULT 'cliente',
				criado_em TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);

		// Verifica se o usuário já existe
		const existente = db.prepare("SELECT id FROM usuario WHERE email = ?").get(email);
		if (existente) {
			return res.status(400).json({ error: "Email já cadastrado" });
		}

		// Insere novo usuário
		const info = db.prepare(
			"INSERT INTO usuario (nome, email, telefone, senha, role) VALUES (?, ?, ?, ?, ?)"
		).run(name, email, phone, password, "cliente");

		const usuario = db.prepare("SELECT id, nome, email, role FROM usuario WHERE id = ?").get(info.lastInsertRowid);
		res.status(201).json({ message: "Usuário registrado com sucesso", usuario });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Erro ao registrar usuário" });
	}
});

// ============================================================================
// AUTENTICAÇÃO - Login
// ============================================================================
app.post("/api/auth/login", (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: "Email e senha são obrigatórios" });
	}

	try {
		const usuario = db.prepare("SELECT id, nome, email, role FROM usuario WHERE email = ? AND senha = ?").get(email, password);

		if (!usuario) {
			return res.status(401).json({ error: "Email ou senha inválidos" });
		}

		res.status(200).json({ user: usuario, token: `token_${usuario.id}` });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Erro ao fazer login" });
	}
});

// ============================================================================
// RELATÓRIOS - Exportar para Excel
// ============================================================================
app.get("/api/relatorios/exportar", (req, res) => {
	try {
		const ExcelJS = require("exceljs");
		const workbook = new ExcelJS.Workbook();

		// Planilha de Pedidos
		const pedidosSheet = workbook.addWorksheet("Pedidos");
		const pedidos = db.prepare(`
			SELECT p.numero_pedido, c.nome, p.total, p.status, p.tipo_entrega, p.criado_em
			FROM pedido p
			JOIN cliente c ON p.cliente_id = c.id
			ORDER BY p.criado_em DESC
		`).all();

		pedidosSheet.columns = [
			{ header: "Número", key: "numero_pedido", width: 12 },
			{ header: "Cliente", key: "nome", width: 20 },
			{ header: "Total", key: "total", width: 12 },
			{ header: "Status", key: "status", width: 15 },
			{ header: "Entrega", key: "tipo_entrega", width: 15 },
			{ header: "Data", key: "criado_em", width: 20 }
		];

		pedidos.forEach(pedido => {
			pedidosSheet.addRow(pedido);
		});

		// Planilha de Clientes
		const clientesSheet = workbook.addWorksheet("Clientes");
		const clientes = db.prepare("SELECT id, nome, telefone, email, endereco, criado_em FROM cliente ORDER BY criado_em DESC").all();

		clientesSheet.columns = [
			{ header: "ID", key: "id", width: 8 },
			{ header: "Nome", key: "nome", width: 20 },
			{ header: "Telefone", key: "telefone", width: 15 },
			{ header: "Email", key: "email", width: 25 },
			{ header: "Endereço", key: "endereco", width: 30 },
			{ header: "Data Cadastro", key: "criado_em", width: 20 }
		];

		clientes.forEach(cliente => {
			clientesSheet.addRow(cliente);
		});

		// Planilha de Produtos
		const produtosSheet = workbook.addWorksheet("Produtos");
		const produtos = db.prepare("SELECT p.id, p.nome, p.preco, p.categoria, e.quantidade FROM produto p LEFT JOIN estoque e ON p.id = e.produto_id ORDER BY p.id").all();

		produtosSheet.columns = [
			{ header: "ID", key: "id", width: 8 },
			{ header: "Nome", key: "nome", width: 20 },
			{ header: "Preço", key: "preco", width: 12 },
			{ header: "Categoria", key: "categoria", width: 15 },
			{ header: "Estoque", key: "quantidade", width: 12 }
		];

		produtos.forEach(produto => {
			produtosSheet.addRow(produto);
		});

		res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		res.setHeader("Content-Disposition", `attachment; filename="relatorio_${new Date().toISOString().split('T')[0]}.xlsx"`);

		workbook.xlsx.write(res).then(() => {
			res.end();
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Erro ao exportar relatório" });
	}
});

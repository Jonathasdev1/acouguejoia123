// ============================================================================
// ZÉ DA CARNE - SERVIDOR BACKEND COM AUTENTICAÇÃO E RELATÓRIOS
// ============================================================================

const express = require("express");
const path = require("path");
const { db } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.sendStatus(204);
	}

	next();
});

// Arquivos estáticos
const WEB_ROOT = path.join(__dirname, "public");
app.use(express.static(WEB_ROOT));

// ============================================================================
// UTILITÁRIOS
// ============================================================================

const normalizeName = (value) => {
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const limparTexto = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

const syncProductAvailabilityByStock = (produtoId) => {
	const estoque = db.prepare("SELECT quantidade FROM estoque WHERE produto_id = ?").get(produtoId);
	const ativo = estoque && Number(estoque.quantidade) > 0 ? 1 : 0;
	db.prepare("UPDATE produto SET ativo = ? WHERE id = ?").run(ativo, produtoId);
};

const syncAllAvailabilityByStock = () => {
	const itens = db.prepare("SELECT id FROM produto").all();
	for (const item of itens) {
		syncProductAvailabilityByStock(item.id);
	}
};

const getNextOrderNumber = () => {
	const row = db.prepare("SELECT ultimo_numero FROM pedido_sequencia WHERE id = 1").get();
	const atual = row ? Number(row.ultimo_numero) : 0;
	const proximo = atual >= 1000 ? 1 : atual + 1;
	db.prepare("UPDATE pedido_sequencia SET ultimo_numero = ? WHERE id = 1").run(proximo);
	return proximo;
};

syncAllAvailabilityByStock();

// ============================================================================
// ROTAS - PÁGINA PRINCIPAL
// ============================================================================

app.get("/", (req, res) => {
	res.sendFile(path.join(WEB_ROOT, "index.html"));
});

app.get("/api/status", (req, res) => {
	res.json({
		message: "API no ar!",
		status: "ok",
		storage: "SQLite",
	});
});

app.get("/health", (req, res) => {
	res.status(200).json({ healthy: true });
});

// ============================================================================
// ROTAS - AUTENTICAÇÃO
// ============================================================================

app.post("/api/auth/register", (req, res) => {
	const { name, email, phone, password } = req.body;

	if (!name || !email || !phone || !password) {
		return res.status(400).json({ error: "Campos obrigatórios faltando" });
	}

	try {
		// Verifica se a tabela usuario existe
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
// ROTAS - PRODUTOS
// ============================================================================

app.get("/api/produtos", (req, res) => {
	const produtos = db.prepare("SELECT id, nome, preco, categoria, ativo FROM produto ORDER BY id").all();
	res.status(200).json(produtos.map((p) => ({ ...p, ativo: Boolean(p.ativo) })));
});

app.get("/api/produtos/:id", (req, res) => {
	const id = Number(req.params.id);
	const produto = db
		.prepare("SELECT id, nome, preco, categoria, ativo FROM produto WHERE id = ?")
		.get(id);

	if (!produto) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	res.status(200).json({ ...produto, ativo: Boolean(produto.ativo) });
});

app.post("/api/produtos", (req, res) => {
	const { nome, preco, categoria = "geral" } = req.body;

	if (!nome || typeof nome !== "string") {
		return res.status(400).json({ error: "Campo nome eh obrigatorio" });
	}

	if (typeof preco !== "number" || preco <= 0) {
		return res.status(400).json({ error: "Campo preco deve ser numero maior que zero" });
	}

	const info = db
		.prepare("INSERT INTO produto (nome, preco, categoria, ativo) VALUES (?, ?, ?, 0)")
		.run(nome.trim(), Number(preco.toFixed(2)), categoria);

	db.prepare("INSERT OR IGNORE INTO estoque (produto_id, quantidade, unidade) VALUES (?, 0, 'kg')").run(
		info.lastInsertRowid
	);

	const novo = db
		.prepare("SELECT id, nome, preco, categoria, ativo FROM produto WHERE id = ?")
		.get(info.lastInsertRowid);

	res.status(201).json({ ...novo, ativo: Boolean(novo.ativo) });
});

app.put("/api/produtos/:id", (req, res) => {
	const id = Number(req.params.id);
	const { nome, preco, categoria = "geral" } = req.body;

	if (!nome || typeof nome !== "string") {
		return res.status(400).json({ error: "Campo nome eh obrigatorio" });
	}

	if (typeof preco !== "number" || preco <= 0) {
		return res.status(400).json({ error: "Campo preco deve ser numero maior que zero" });
	}

	const info = db
		.prepare("UPDATE produto SET nome = ?, preco = ?, categoria = ? WHERE id = ?")
		.run(nome.trim(), Number(preco.toFixed(2)), categoria, id);

	if (info.changes === 0) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	const atualizado = db
		.prepare("SELECT id, nome, preco, categoria, ativo FROM produto WHERE id = ?")
		.get(id);

	res.status(200).json({ ...atualizado, ativo: Boolean(atualizado.ativo) });
});

app.delete("/api/produtos/:id", (req, res) => {
	const id = Number(req.params.id);
	const info = db.prepare("DELETE FROM produto WHERE id = ?").run(id);

	if (info.changes === 0) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	res.status(200).json({ message: "Produto deletado com sucesso" });
});

// ============================================================================
// ROTAS - PEDIDOS
// ============================================================================

app.post("/api/pedidos", (req, res) => {
	const { cliente_id, tipo_entrega, endereco_entrega, observacao, itens } = req.body;

	if (!cliente_id || !tipo_entrega || !Array.isArray(itens) || itens.length === 0) {
		return res.status(400).json({ error: "Dados inválidos para criar pedido" });
	}

	try {
		const numero_pedido = getNextOrderNumber();
		const total = itens.reduce((sum, item) => sum + item.subtotal, 0);

		const infoPedido = db
			.prepare(
				"INSERT INTO pedido (numero_pedido, cliente_id, status, total, tipo_entrega, endereco_entrega, observacao) VALUES (?, ?, ?, ?, ?, ?, ?)"
			)
			.run(numero_pedido, cliente_id, "recebido", total, tipo_entrega, endereco_entrega || null, observacao || null);

		const pedidoId = infoPedido.lastInsertRowid;

		const insertItem = db.prepare(
			"INSERT INTO pedido_item (pedido_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)"
		);

		const addItems = db.transaction((items) => {
			for (const item of items) {
				insertItem.run(pedidoId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal);
			}
		});

		addItems(itens);

		const pedido = db
			.prepare(
				"SELECT id, numero_pedido, cliente_id, status, total, tipo_entrega, endereco_entrega, observacao, criado_em FROM pedido WHERE id = ?"
			)
			.get(pedidoId);

		res.status(201).json({ message: "Pedido criado com sucesso", ...pedido });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Erro ao criar pedido" });
	}
});

app.get("/api/pedidos", (req, res) => {
	const pedidos = db
		.prepare(
			"SELECT id, numero_pedido, cliente_id, status, total, tipo_entrega, endereco_entrega, observacao, criado_em FROM pedido ORDER BY criado_em DESC"
		)
		.all();

	res.status(200).json(pedidos);
});

app.get("/api/pedidos/cliente/:cliente_id", (req, res) => {
	const cliente_id = Number(req.params.cliente_id);
	const pedidos = db
		.prepare(
			"SELECT id, numero_pedido, cliente_id, status, total, tipo_entrega, endereco_entrega, observacao, criado_em FROM pedido WHERE cliente_id = ? ORDER BY criado_em DESC"
		)
		.all(cliente_id);

	res.status(200).json(pedidos);
});

app.patch("/api/pedidos/:id/status", (req, res) => {
	const id = Number(req.params.id);
	const { status } = req.body;

	if (!status) {
		return res.status(400).json({ error: "Status é obrigatório" });
	}

	const info = db.prepare("UPDATE pedido SET status = ? WHERE id = ?").run(status, id);

	if (info.changes === 0) {
		return res.status(404).json({ error: "Pedido não encontrado" });
	}

	const pedido = db
		.prepare(
			"SELECT id, numero_pedido, cliente_id, status, total, tipo_entrega, endereco_entrega, observacao, criado_em FROM pedido WHERE id = ?"
		)
		.get(id);

	res.status(200).json({ message: "Status atualizado", ...pedido });
});

// ============================================================================
// ROTAS - CLIENTES
// ============================================================================

app.get("/api/clientes", (req, res) => {
	const clientes = db
		.prepare("SELECT id, nome, telefone, email, endereco, criado_em FROM cliente ORDER BY id")
		.all();

	res.status(200).json(clientes);
});

app.post("/api/clientes", (req, res) => {
	const { nome, telefone, email, endereco, rua, numero, bairro, cidade, complemento } = req.body;

	if (!nome || !telefone) {
		return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
	}

	try {
		const nomeLimpo = String(nome || "").trim();
		const telefoneLimpo = normalizePhone(telefone);
		const emailLimpo = limparTexto(email);
		const ruaLimpa = limparTexto(rua);
		const numeroLimpo = limparTexto(numero);
		const bairroLimpo = limparTexto(bairro);
		const cidadeLimpa = limparTexto(cidade);
		const complementoLimpo = limparTexto(complemento);
		const enderecoLimpo = ruaLimpa
			? [ruaLimpa, numeroLimpo, bairroLimpo, cidadeLimpa, complementoLimpo].filter(Boolean).join(", ")
			: limparTexto(endereco);

		const existente = db.prepare("SELECT id FROM cliente WHERE telefone = ?").get(telefoneLimpo);

		if (existente) {
			db.prepare(
				"UPDATE cliente SET nome=?, email=?, endereco=?, rua=?, numero=?, bairro=?, cidade=?, complemento=? WHERE id=?"
			).run(nomeLimpo, emailLimpo, enderecoLimpo, ruaLimpa, numeroLimpo, bairroLimpo, cidadeLimpa, complementoLimpo, existente.id);
			return res.status(200).json(db.prepare("SELECT id, nome, telefone, email, endereco, criado_em FROM cliente WHERE id = ?").get(existente.id));
		}

		const info = db
			.prepare("INSERT INTO cliente (nome, telefone, email, endereco, rua, numero, bairro, cidade, complemento) VALUES (?,?,?,?,?,?,?,?,?)")
			.run(nomeLimpo, telefoneLimpo, emailLimpo, enderecoLimpo, ruaLimpa, numeroLimpo, bairroLimpo, cidadeLimpa, complementoLimpo);

		const cliente = db.prepare("SELECT id, nome, telefone, email, endereco, criado_em FROM cliente WHERE id = ?").get(info.lastInsertRowid);
		res.status(201).json(cliente);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Erro ao cadastrar cliente" });
	}
});

// ============================================================================
// ROTAS - RELATÓRIOS
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

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
	console.log(`Servidor rodando em http://localhost:${PORT}`);
});

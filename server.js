
// Bloco 1: importa o framework e a conexão com banco SQLite.
const express = require("express");
const path = require("path");
const { db } = require("./db");

// Bloco 2: inicializa a aplicacao e define a porta padrao.
const app = express();
const PORT = process.env.PORT || 3000;

// Bloco 3: middleware para ler JSON no corpo das requisicoes.
app.use(express.json());

// Bloco 4: CORS simples para permitir que o frontend acesse a API.
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.sendStatus(204);
	}

	next();
});

// Bloco 4.1: define pasta oficial do frontend e publica arquivos estaticos.
const WEB_ROOT = path.join(
	__dirname,
	"projeto Açougue-Corrigido (1)",
	"projeto Açougue01",
	"projeto Açougue01"
);
app.use(express.static(WEB_ROOT));

// Bloco 5: normaliza nome para evitar duplicidade por acento/hifen/espaco.
const normalizeName = (value) => {
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const limparTexto = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

const saveOrUpdateClientByPhone = ({
	nome,
	telefone,
	email = null,
	rua = null,
	numero = null,
	bairro = null,
	cidade = null,
	complemento = null,
	// campo legado: usado como fallback quando os novos nao sao fornecidos
	endereco = null,
}) => {
	const nomeLimpo = String(nome || "").trim();
	const telefoneLimpo = normalizePhone(telefone);
	const emailLimpo = limparTexto(email);
	const ruaLimpa = limparTexto(rua);
	const numeroLimpo = limparTexto(numero);
	const bairroLimpo = limparTexto(bairro);
	const cidadeLimpa = limparTexto(cidade);
	const complementoLimpo = limparTexto(complemento);
	// monta campo legado 'endereco' para exibicao simples
	const enderecoLimpo = ruaLimpa
		? [ruaLimpa, numeroLimpo, bairroLimpo, cidadeLimpa, complementoLimpo].filter(Boolean).join(", ")
		: limparTexto(endereco);

	if (!nomeLimpo) throw new Error("Campo nome eh obrigatorio");
	if (!telefoneLimpo) throw new Error("Campo telefone eh obrigatorio");

	const sel = "SELECT id, nome, telefone, email, endereco, rua, numero, bairro, cidade, complemento, criado_em FROM cliente";
	const existente = db.prepare(sel + " WHERE telefone = ?").get(telefoneLimpo);

	if (existente) {
		db.prepare(
			"UPDATE cliente SET nome=?, email=?, endereco=?, rua=?, numero=?, bairro=?, cidade=?, complemento=? WHERE id=?"
		).run(nomeLimpo, emailLimpo, enderecoLimpo, ruaLimpa, numeroLimpo, bairroLimpo, cidadeLimpa, complementoLimpo, existente.id);
		return { created: false, cliente: db.prepare(sel + " WHERE id = ?").get(existente.id) };
	}

	const info = db
		.prepare("INSERT INTO cliente (nome, telefone, email, endereco, rua, numero, bairro, cidade, complemento) VALUES (?,?,?,?,?,?,?,?,?)")
		.run(nomeLimpo, telefoneLimpo, emailLimpo, enderecoLimpo, ruaLimpa, numeroLimpo, bairroLimpo, cidadeLimpa, complementoLimpo);

	return { created: true, cliente: db.prepare(sel + " WHERE id = ?").get(info.lastInsertRowid) };
};

// Bloco 5.1: sincroniza disponibilidade de 1 produto com base no estoque.
// Regra: quantidade <= 0 => ativo = false | quantidade > 0 => ativo = true
const syncProductAvailabilityByStock = (produtoId) => {
	const estoque = db.prepare("SELECT quantidade FROM estoque WHERE produto_id = ?").get(produtoId);
	const ativo = estoque && Number(estoque.quantidade) > 0 ? 1 : 0;
	db.prepare("UPDATE produto SET ativo = ? WHERE id = ?").run(ativo, produtoId);
};

// Bloco 5.2: aplica a mesma regra para todo o catalogo ao subir o servidor.
const syncAllAvailabilityByStock = () => {
	const itens = db.prepare("SELECT id FROM produto").all();
	for (const item of itens) {
		syncProductAvailabilityByStock(item.id);
	}
};

// Bloco 5.3: gera numero de pedido com auto incremento ciclico de 1 a 1000.
const getNextOrderNumber = () => {
	const row = db.prepare("SELECT ultimo_numero FROM pedido_sequencia WHERE id = 1").get();
	const atual = row ? Number(row.ultimo_numero) : 0;
	const proximo = atual >= 1000 ? 1 : atual + 1;
	db.prepare("UPDATE pedido_sequencia SET ultimo_numero = ? WHERE id = 1").run(proximo);
	return proximo;
};

syncAllAvailabilityByStock();

// Bloco 6: rota web unica oficial (index do frontend).
app.get("/", (req, res) => {
	res.sendFile(path.join(WEB_ROOT, "index.html"));
});

// Bloco 6.1: rota de status da API para diagnostico rapido.
app.get("/api/status", (req, res) => {
	res.json({
		message: "API no ar!",
		status: "ok",
		storage: "SQLite",
	});
});

// Bloco 7: rota de saude para monitoramento rapido.
app.get("/health", (req, res) => {
	res.status(200).json({ healthy: true });
});

// Bloco 8: lista todos os produtos do banco.
app.get("/produtos", (req, res) => {
	const produtos = db.prepare("SELECT id, nome, preco, categoria, ativo FROM produto ORDER BY id").all();
	res.status(200).json(produtos.map((p) => ({ ...p, ativo: Boolean(p.ativo) })));
});

// Bloco 8.1: sincroniza catalogo completo vindo do frontend (upsert em lote).
app.post("/produtos/sync-catalogo", (req, res) => {
	const { produtos: catalogo } = req.body;

	if (!Array.isArray(catalogo)) {
		return res.status(400).json({ error: "Campo produtos deve ser um array" });
	}

	let criados = 0;
	let atualizados = 0;
	let ignorados = 0;

	const existentes = db.prepare("SELECT id, nome FROM produto").all();
	const byKey = new Map(existentes.map((item) => [normalizeName(item.nome), item]));

	const insertProduto = db.prepare(
		"INSERT INTO produto (nome, preco, categoria, ativo) VALUES (?, ?, ?, 0)"
	);
	const updateProduto = db.prepare(
		"UPDATE produto SET nome = ?, preco = ?, categoria = ? WHERE id = ?"
	);
	const insertEstoque = db.prepare(
		"INSERT OR IGNORE INTO estoque (produto_id, quantidade, unidade) VALUES (?, 0, 'kg')"
	);

	const sync = db.transaction((items) => {
		for (const item of items) {
			const nome = typeof item?.nome === "string" ? item.nome.trim() : "";
			const preco = Number(item?.preco);
			const categoria =
				typeof item?.categoria === "string" && item.categoria.trim() ? item.categoria.trim() : "geral";

			if (!nome || !Number.isFinite(preco) || preco <= 0) {
				ignorados += 1;
				continue;
			}

			const key = normalizeName(nome);
			const existente = byKey.get(key);

			if (existente) {
				updateProduto.run(nome, Number(preco.toFixed(2)), categoria, existente.id);
				atualizados += 1;
			} else {
				const info = insertProduto.run(nome, Number(preco.toFixed(2)), categoria);
				insertEstoque.run(info.lastInsertRowid);
				byKey.set(key, { id: info.lastInsertRowid, nome });
				criados += 1;
			}
		}
	});

	sync(catalogo);

	const todos = db.prepare("SELECT id, nome, preco, categoria, ativo FROM produto ORDER BY id").all();
	res.status(200).json({
		message: "Catalogo sincronizado com sucesso",
		resumo: { criados, atualizados, ignorados, total: todos.length },
		produtos: todos.map((p) => ({ ...p, ativo: Boolean(p.ativo) })),
	});
});

// Bloco 9: busca um produto por id.
app.get("/produtos/:id", (req, res) => {
	const id = Number(req.params.id);
	const produto = db
		.prepare("SELECT id, nome, preco, categoria, ativo FROM produto WHERE id = ?")
		.get(id);

	if (!produto) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	res.status(200).json({ ...produto, ativo: Boolean(produto.ativo) });
});

// Bloco 9.1: bloqueia ou desbloqueia produto temporariamente.
app.patch("/produtos/:id/disponibilidade", (req, res) => {
	const id = Number(req.params.id);
	const { ativo } = req.body;

	if (typeof ativo !== "boolean") {
		return res.status(400).json({ error: "Campo ativo deve ser true ou false" });
	}

	const info = db.prepare("UPDATE produto SET ativo = ? WHERE id = ?").run(ativo ? 1 : 0, id);

	if (info.changes === 0) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	const produto = db
		.prepare("SELECT id, nome, preco, categoria, ativo FROM produto WHERE id = ?")
		.get(id);

	const status = ativo ? "disponivel" : "bloqueado temporariamente";
	res.status(200).json({ message: `Produto ${status}`, produto: { ...produto, ativo: Boolean(produto.ativo) } });
});

// Bloco 10: cria um novo produto com validacao basica.
app.post("/produtos", (req, res) => {
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

// Bloco 11: atualiza produto inteiro (nome, preco, categoria).
app.put("/produtos/:id", (req, res) => {
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

// Bloco 12: atualiza parcialmente, util para mudar so o preco.
app.patch("/produtos/:id/preco", (req, res) => {
	const id = Number(req.params.id);
	const { preco } = req.body;

	if (typeof preco !== "number" || preco <= 0) {
		return res.status(400).json({ error: "Campo preco deve ser numero maior que zero" });
	}

	const info = db.prepare("UPDATE produto SET preco = ? WHERE id = ?").run(Number(preco.toFixed(2)), id);

	if (info.changes === 0) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	const produto = db
		.prepare("SELECT id, nome, preco, categoria, ativo FROM produto WHERE id = ?")
		.get(id);

	res.status(200).json({ ...produto, ativo: Boolean(produto.ativo) });
});

// Bloco 13: remove produto por id.
app.delete("/produtos/:id", (req, res) => {
	const id = Number(req.params.id);
	const info = db.prepare("DELETE FROM produto WHERE id = ?").run(id);

	if (info.changes === 0) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	res.status(204).send();
});

// Bloco 13.1: consulta estoque por produto.
// Exemplo: GET /estoque/3
app.get("/estoque/:produtoId", (req, res) => {
	const produtoId = Number(req.params.produtoId);

	if (!Number.isInteger(produtoId) || produtoId <= 0) {
		return res.status(400).json({ error: "produtoId invalido" });
	}

	const produto = db
		.prepare("SELECT id, nome, categoria, ativo FROM produto WHERE id = ?")
		.get(produtoId);

	if (!produto) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	const estoque = db
		.prepare("SELECT quantidade, unidade, atualizado_em FROM estoque WHERE produto_id = ?")
		.get(produtoId);

	if (!estoque) {
		return res.status(404).json({ error: "Estoque nao encontrado para este produto" });
	}

	res.status(200).json({
		produto: {
			id: produto.id,
			nome: produto.nome,
			categoria: produto.categoria,
			ativo: Boolean(produto.ativo),
		},
		estoque,
	});
});

// Bloco 13.2: registra ENTRADA de estoque e atualiza disponibilidade.
// Exemplo: POST /estoque/entrada  body: { "produtoId": 3, "quantidade": 12.5 }
app.post("/estoque/entrada", (req, res) => {
	const produtoId = Number(req.body?.produtoId);
	const quantidade = Number(req.body?.quantidade);

	if (!Number.isInteger(produtoId) || produtoId <= 0) {
		return res.status(400).json({ error: "produtoId invalido" });
	}

	if (!Number.isFinite(quantidade) || quantidade <= 0) {
		return res.status(400).json({ error: "quantidade deve ser maior que zero" });
	}

	const produto = db.prepare("SELECT id, nome FROM produto WHERE id = ?").get(produtoId);
	if (!produto) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	const info = db
		.prepare(
			"UPDATE estoque SET quantidade = quantidade + ?, atualizado_em = datetime('now') WHERE produto_id = ?"
		)
		.run(quantidade, produtoId);

	if (info.changes === 0) {
		return res.status(404).json({ error: "Estoque nao encontrado para este produto" });
	}

	syncProductAvailabilityByStock(produtoId);

	const estoqueAtual = db
		.prepare("SELECT quantidade, unidade, atualizado_em FROM estoque WHERE produto_id = ?")
		.get(produtoId);

	const produtoAtual = db
		.prepare("SELECT id, nome, categoria, ativo FROM produto WHERE id = ?")
		.get(produtoId);

	res.status(200).json({
		message: "Entrada de estoque registrada com sucesso",
		produto: { ...produtoAtual, ativo: Boolean(produtoAtual.ativo) },
		estoque: estoqueAtual,
	});
});

// Bloco 13.3: registra SAIDA de estoque e bloqueia automaticamente quando zerar.
// Exemplo: POST /estoque/saida  body: { "produtoId": 3, "quantidade": 2 }
app.post("/estoque/saida", (req, res) => {
	const produtoId = Number(req.body?.produtoId);
	const quantidade = Number(req.body?.quantidade);

	if (!Number.isInteger(produtoId) || produtoId <= 0) {
		return res.status(400).json({ error: "produtoId invalido" });
	}

	if (!Number.isFinite(quantidade) || quantidade <= 0) {
		return res.status(400).json({ error: "quantidade deve ser maior que zero" });
	}

	const produto = db.prepare("SELECT id, nome FROM produto WHERE id = ?").get(produtoId);
	if (!produto) {
		return res.status(404).json({ error: "Produto nao encontrado" });
	}

	const estoqueAtual = db.prepare("SELECT quantidade FROM estoque WHERE produto_id = ?").get(produtoId);
	if (!estoqueAtual) {
		return res.status(404).json({ error: "Estoque nao encontrado para este produto" });
	}

	if (Number(estoqueAtual.quantidade) < quantidade) {
		return res.status(400).json({ error: "Estoque insuficiente para esta saida" });
	}

	db.prepare(
		"UPDATE estoque SET quantidade = quantidade - ?, atualizado_em = datetime('now') WHERE produto_id = ?"
	).run(quantidade, produtoId);

	syncProductAvailabilityByStock(produtoId);

	const estoqueNovo = db
		.prepare("SELECT quantidade, unidade, atualizado_em FROM estoque WHERE produto_id = ?")
		.get(produtoId);

	const produtoAtual = db
		.prepare("SELECT id, nome, categoria, ativo FROM produto WHERE id = ?")
		.get(produtoId);

	res.status(200).json({
		message: "Saida de estoque registrada com sucesso",
		produto: { ...produtoAtual, ativo: Boolean(produtoAtual.ativo) },
		estoque: estoqueNovo,
	});
});

// Bloco 13.4: cria pedido e da baixa no estoque conforme itens.
// Exemplo de body:
// {
//   "clienteId": 1,
//   "tipoEntrega": "entrega",
//   "enderecoEntrega": "Rua X, 123",
//   "observacao": "Sem alho",
//   "itens": [
//     { "produtoId": 1, "quantidade": 1.5 },
//     { "produtoId": 2, "quantidade": 2 }
//   ]
// }
app.post("/pedidos", (req, res) => {
	const {
		clienteId,
		clienteNome,
		clienteTelefone,
		clienteEmail,
		clienteRua = null,
		clienteNumero = null,
		clienteBairro = null,
		clienteCidade = null,
		clienteComplemento = null,
		tipoEntrega,
		enderecoEntrega = null,
		observacao = null,
		itens,
	} = req.body;

	// Aceita clienteId direto ou clienteNome para criacao automatica de cliente web.
	let resolvedClienteId = clienteId ? Number(clienteId) : null;

	if (resolvedClienteId && (!Number.isInteger(resolvedClienteId) || resolvedClienteId <= 0)) {
		return res.status(400).json({ error: "clienteId invalido" });
	}

	if (!resolvedClienteId && (!clienteNome || typeof clienteNome !== "string" || !clienteNome.trim())) {
		return res.status(400).json({ error: "clienteId ou clienteNome eh obrigatorio" });
	}

	if (!tipoEntrega || typeof tipoEntrega !== "string") {
		return res.status(400).json({ error: "tipoEntrega eh obrigatorio" });
	}

	if (!Array.isArray(itens) || itens.length === 0) {
		return res.status(400).json({ error: "Pedido deve conter ao menos 1 item" });
	}

	// Reutiliza ou cria cliente por telefone; sem telefone, cai no modo temporario.
	try {
	if (!resolvedClienteId) {
		if (clienteTelefone) {
			const clienteSalvo = saveOrUpdateClientByPhone({
				nome: clienteNome,
				telefone: clienteTelefone,
				email: clienteEmail,
				rua: tipoEntrega === "entrega" ? clienteRua : null,
				numero: tipoEntrega === "entrega" ? clienteNumero : null,
				bairro: tipoEntrega === "entrega" ? clienteBairro : null,
				cidade: tipoEntrega === "entrega" ? clienteCidade : null,
				complemento: tipoEntrega === "entrega" ? clienteComplemento : null,
			});
			resolvedClienteId = Number(clienteSalvo.cliente.id);
		} else {
			const telefoneTemp = `web-${Date.now()}`;
			const infoCliente = db
				.prepare("INSERT INTO cliente (nome, telefone, email, endereco) VALUES (?, ?, ?, ?)")
				.run(
					String(clienteNome).trim(),
					telefoneTemp,
					typeof clienteEmail === "string" && clienteEmail.trim() ? clienteEmail.trim() : null,
					tipoEntrega === "entrega" ? enderecoEntrega : null
				);
			resolvedClienteId = Number(infoCliente.lastInsertRowid);
		}
	} else {
		const cliente = db.prepare("SELECT id FROM cliente WHERE id = ?").get(resolvedClienteId);
		if (!cliente) {
			return res.status(404).json({ error: "Cliente nao encontrado" });
		}
	}

	const buscarProduto = db.prepare("SELECT id, nome, preco, ativo FROM produto WHERE id = ?");
	const buscarEstoque = db.prepare("SELECT quantidade FROM estoque WHERE produto_id = ?");
	const inserirPedido = db.prepare(
		"INSERT INTO pedido (numero_pedido, cliente_id, status, total, tipo_entrega, endereco_entrega, observacao) VALUES (?, ?, 'recebido', 0, ?, ?, ?)"
	);
	const inserirPedidoItem = db.prepare(
		"INSERT INTO pedido_item (pedido_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)"
	);
	const atualizarEstoque = db.prepare(
		"UPDATE estoque SET quantidade = quantidade - ?, atualizado_em = datetime('now') WHERE produto_id = ?"
	);
	const atualizarTotalPedido = db.prepare("UPDATE pedido SET total = ? WHERE id = ?");

		const resultado = db.transaction(() => {
			let total = 0;
			const itensProcessados = [];

			// Valida todos os itens antes de gravar, evitando baixa parcial.
			for (const item of itens) {
				const produtoId = Number(item?.produtoId);
				const quantidade = Number(item?.quantidade);

				if (!Number.isInteger(produtoId) || produtoId <= 0) {
					throw new Error("produtoId invalido em um dos itens");
				}

				if (!Number.isFinite(quantidade) || quantidade <= 0) {
					throw new Error("quantidade invalida em um dos itens");
				}

				const produto = buscarProduto.get(produtoId);
				if (!produto) {
					throw new Error(`Produto ${produtoId} nao encontrado`);
				}

				if (!produto.ativo) {
					throw new Error(`Produto ${produto.nome} esta indisponivel`);
				}

				const estoque = buscarEstoque.get(produtoId);
				if (!estoque) {
					throw new Error(`Estoque nao encontrado para produto ${produto.nome}`);
				}

				if (Number(estoque.quantidade) < quantidade) {
					throw new Error(`Estoque insuficiente para ${produto.nome}`);
				}

				const subtotal = Number((produto.preco * quantidade).toFixed(2));
				total += subtotal;

				itensProcessados.push({
					produtoId,
					quantidade,
					precoUnitario: Number(produto.preco),
					subtotal,
				});
			}

			// Cria o pedido apos validar todo o conteudo.
			const numeroPedido = getNextOrderNumber();
			const pedidoInfo = inserirPedido.run(
				numeroPedido,
				resolvedClienteId,
				tipoEntrega.trim(),
				tipoEntrega === "entrega" ? enderecoEntrega : null,
				observacao
			);

			const pedidoId = Number(pedidoInfo.lastInsertRowid);

			// Registra itens e realiza baixa de estoque.
			for (const item of itensProcessados) {
				inserirPedidoItem.run(
					pedidoId,
					item.produtoId,
					item.quantidade,
					item.precoUnitario,
					item.subtotal
				);

				atualizarEstoque.run(item.quantidade, item.produtoId);
				syncProductAvailabilityByStock(item.produtoId);
			}

			total = Number(total.toFixed(2));
			atualizarTotalPedido.run(total, pedidoId);

			return { pedidoId, total };
		})();

		const pedidoCriado = db
			.prepare(
				"SELECT id, numero_pedido, cliente_id, status, total, tipo_entrega, endereco_entrega, observacao, criado_em FROM pedido WHERE id = ?"
			)
			.get(resultado.pedidoId);

		const itensCriados = db
			.prepare(
				"SELECT id, pedido_id, produto_id, quantidade, preco_unitario, subtotal FROM pedido_item WHERE pedido_id = ?"
			)
			.all(resultado.pedidoId);

		res.status(201).json({
			message: "Pedido criado e estoque baixado com sucesso",
			pedido: pedidoCriado,
			itens: itensCriados,
		});
	} catch (error) {
		res.status(400).json({ error: error.message || "Falha ao criar pedido" });
	}
});

// Bloco 13.5: lista pedidos com dados resumidos do cliente.
app.get("/pedidos", (req, res) => {
	const pedidos = db
		.prepare(
			`SELECT
				p.id,
				p.numero_pedido,
				p.cliente_id,
				c.nome AS cliente_nome,
				p.status,
				p.total,
				p.tipo_entrega,
				p.criado_em
			 FROM pedido p
			 JOIN cliente c ON c.id = p.cliente_id
			 ORDER BY p.id DESC`
		)
		.all();

	res.status(200).json(pedidos);
});

// Bloco 13.6: detalha 1 pedido com seus itens.
app.get("/pedidos/:id", (req, res) => {
	const id = Number(req.params.id);

	if (!Number.isInteger(id) || id <= 0) {
		return res.status(400).json({ error: "id de pedido invalido" });
	}

	const pedido = db
		.prepare(
			`SELECT
				p.id,
				p.numero_pedido,
				p.cliente_id,
				c.nome AS cliente_nome,
				c.telefone AS cliente_telefone,
				p.status,
				p.total,
				p.tipo_entrega,
				p.endereco_entrega,
				p.observacao,
				p.criado_em
			 FROM pedido p
			 JOIN cliente c ON c.id = p.cliente_id
			 WHERE p.id = ?`
		)
		.get(id);

	if (!pedido) {
		return res.status(404).json({ error: "Pedido nao encontrado" });
	}

	const itens = db
		.prepare(
			`SELECT
				pi.id,
				pi.pedido_id,
				pi.produto_id,
				pr.nome AS produto_nome,
				pi.quantidade,
				pi.preco_unitario,
				pi.subtotal
			 FROM pedido_item pi
			 JOIN produto pr ON pr.id = pi.produto_id
			 WHERE pi.pedido_id = ?`
		)
		.all(id);

	res.status(200).json({ pedido, itens });
});

// Bloco 13.7: confirma pedido (status de controle operacional).
app.patch("/pedidos/:id/confirmar", (req, res) => {
	const id = Number(req.params.id);

	if (!Number.isInteger(id) || id <= 0) {
		return res.status(400).json({ error: "id de pedido invalido" });
	}

	const pedido = db.prepare("SELECT id, status FROM pedido WHERE id = ?").get(id);
	if (!pedido) {
		return res.status(404).json({ error: "Pedido nao encontrado" });
	}

	if (pedido.status === "cancelado") {
		return res.status(400).json({ error: "Pedido cancelado nao pode ser confirmado" });
	}

	db.prepare("UPDATE pedido SET status = 'confirmado' WHERE id = ?").run(id);

	const atualizado = db
		.prepare("SELECT id, numero_pedido, status, total, tipo_entrega, criado_em FROM pedido WHERE id = ?")
		.get(id);

	res.status(200).json({ message: "Pedido confirmado", pedido: atualizado });
});

// Bloco 13.8: cancela pedido e devolve itens para o estoque automaticamente.
app.patch("/pedidos/:id/cancelar", (req, res) => {
	const id = Number(req.params.id);

	if (!Number.isInteger(id) || id <= 0) {
		return res.status(400).json({ error: "id de pedido invalido" });
	}

	const pedido = db.prepare("SELECT id, status FROM pedido WHERE id = ?").get(id);
	if (!pedido) {
		return res.status(404).json({ error: "Pedido nao encontrado" });
	}

	if (pedido.status === "cancelado") {
		return res.status(400).json({ error: "Pedido ja esta cancelado" });
	}

	const itens = db
		.prepare("SELECT produto_id, quantidade FROM pedido_item WHERE pedido_id = ?")
		.all(id);

	const cancelar = db.transaction(() => {
		for (const item of itens) {
			db.prepare(
				"UPDATE estoque SET quantidade = quantidade + ?, atualizado_em = datetime('now') WHERE produto_id = ?"
			).run(Number(item.quantidade), Number(item.produto_id));
			syncProductAvailabilityByStock(Number(item.produto_id));
		}

		db.prepare("UPDATE pedido SET status = 'cancelado' WHERE id = ?").run(id);
	});

	cancelar();

	const atualizado = db
		.prepare("SELECT id, numero_pedido, status, total, tipo_entrega, criado_em FROM pedido WHERE id = ?")
		.get(id);

	res.status(200).json({ message: "Pedido cancelado e estoque devolvido", pedido: atualizado });
});

// Bloco 14: cadastra cliente.
app.post("/clientes", (req, res) => {
	const {
		nome, telefone, email = null, endereco = null,
		rua = null, numero = null, bairro = null, cidade = null, complemento = null,
	} = req.body;

	try {
		const resultado = saveOrUpdateClientByPhone({ nome, telefone, email, endereco, rua, numero, bairro, cidade, complemento });
		res.status(resultado.created ? 201 : 200).json(resultado.cliente);
	} catch (error) {
		if (String(error.message).includes("obrigatorio")) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: "Falha ao cadastrar cliente" });
	}
});

// Bloco 15: lista clientes cadastrados.
app.get("/clientes", (req, res) => {
	const clientes = db
		.prepare("SELECT id, nome, telefone, email, endereco, criado_em FROM cliente ORDER BY id")
		.all();

	res.status(200).json(clientes);
});

// Bloco 16: inicia o servidor e exibe URL local no terminal.
app.listen(PORT, () => {
	console.log(`Servidor rodando em http://localhost:${PORT}`);
});

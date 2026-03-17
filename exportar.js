const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const db = new Database(path.join(__dirname, "acougue.db"));
const pasta = path.join(__dirname, "exportacao");
if (!fs.existsSync(pasta)) fs.mkdirSync(pasta);

const escaparCampo = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return s.includes(";") || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
};

const gravarCSV = (nome, rows) => {
  const arquivo = path.join(pasta, nome + ".csv");
  if (rows.length === 0) {
    fs.writeFileSync(arquivo, "(sem registros)\n", "utf-8");
    console.log("Exportado: " + nome + ".csv (0 linhas)");
    return;
  }
  const cols = Object.keys(rows[0]);
  const linhas = [
    cols.join(";"),
    ...rows.map((r) => cols.map((c) => escaparCampo(r[c])).join(";")),
  ];
  fs.writeFileSync(arquivo, "\uFEFF" + linhas.join("\r\n"), "utf-8");
  console.log("Exportado: " + nome + ".csv (" + rows.length + " linhas)");
};

// ── clientes com endereço estruturado ────────────────────────────────────────
gravarCSV("cliente", db.prepare(
  "SELECT id, nome, telefone, email, rua, numero, bairro, cidade, complemento, endereco, criado_em FROM cliente ORDER BY id"
).all());

// ── produtos ordenados por categoria ─────────────────────────────────────────
gravarCSV("produto", db.prepare(
  "SELECT id, categoria, nome, preco, ativo, criado_em FROM produto ORDER BY categoria, nome"
).all());

// ── um CSV por categoria (bovino, suíno, aves, etc.) ─────────────────────────
const categorias = db.prepare("SELECT DISTINCT categoria FROM produto ORDER BY categoria").all().map(r => r.categoria);
categorias.forEach(cat => {
  const rows = db.prepare("SELECT id, nome, preco, ativo, criado_em FROM produto WHERE categoria = ? ORDER BY nome").all(cat);
  gravarCSV("produto_" + cat.replace(/[^a-zA-Z0-9]/g, "_"), rows);
});

// ── demais tabelas ────────────────────────────────────────────────────────────
["estoque", "pedido", "pedido_item", "pedido_sequencia"].forEach((tabela) => {
  gravarCSV(tabela, db.prepare("SELECT * FROM " + tabela).all());
});

// ── CSV único consolidado com todos os CSVs gerados ─────────────────────────
const consolidadoPath = path.join(pasta, "tudo_em_um.csv");
const csvFiles = fs
  .readdirSync(pasta)
  .filter((name) => name.endsWith(".csv") && name !== "tudo_em_um.csv")
  .sort();

const blocos = [];
csvFiles.forEach((fileName) => {
  const conteudo = fs.readFileSync(path.join(pasta, fileName), "utf-8").replace(/^\uFEFF/, "").trim();
  blocos.push([`### ${fileName}`, conteudo].join("\r\n"));
});

fs.writeFileSync(consolidadoPath, "\uFEFF" + blocos.join("\r\n\r\n"), "utf-8");
console.log("Exportado: tudo_em_um.csv (" + csvFiles.length + " arquivos em 1)");

const montarRowsTabela = (tabela, orderBy = "id") => {
  return db.prepare(`SELECT * FROM ${tabela} ORDER BY ${orderBy}`).all();
};

const escreverAba = (workbook, nomeAba, rows) => {
  const ws = workbook.addWorksheet(nomeAba);
  if (!rows.length) {
    ws.addRow(["sem registros"]);
    return;
  }
  const headers = Object.keys(rows[0]);
  ws.addRow(headers);
  rows.forEach((r) => ws.addRow(headers.map((h) => r[h])));
  ws.views = [{ state: "frozen", ySplit: 1 }];
};

const normalizarNomeAba = (nome) => {
  const semAcento = String(nome || "geral").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return semAcento.replace(/[\\/?*\[\]:]/g, "_").slice(0, 31);
};

const gerarXlsx = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "API Boutique das Carnes";
  workbook.created = new Date();

  // Abas por categoria de produto: bovino, suino, frango/aves, etc.
  categorias.forEach((cat) => {
    const rows = db
      .prepare("SELECT id, nome, preco, ativo, criado_em FROM produto WHERE categoria = ? ORDER BY nome")
      .all(cat);
    escreverAba(workbook, normalizarNomeAba(cat), rows);
  });

  // Abas das tabelas principais.
  escreverAba(workbook, "cliente", db.prepare("SELECT id, nome, telefone, email, rua, numero, bairro, cidade, complemento, endereco, criado_em FROM cliente ORDER BY id").all());
  escreverAba(workbook, "estoque", montarRowsTabela("estoque"));
  escreverAba(workbook, "pedido", montarRowsTabela("pedido"));
  escreverAba(workbook, "pedido_item", montarRowsTabela("pedido_item"));
  escreverAba(workbook, "pedido_seq", montarRowsTabela("pedido_sequencia"));

  const xlsxPath = path.join(pasta, "tudo_em_um.xlsx");
  await workbook.xlsx.writeFile(xlsxPath);
  console.log("Exportado: tudo_em_um.xlsx (abas por categoria + tabelas)");
};

gerarXlsx()
  .then(() => {
    console.log("\nArquivos gerados em:\n" + pasta);
  })
  .catch((err) => {
    console.error("Falha ao gerar XLSX:", err.message);
    process.exitCode = 1;
  });


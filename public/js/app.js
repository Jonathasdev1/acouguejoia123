// ============================================================================
// ZÉ DA CARNE - APLICATIVO DE AÇOUGUE ONLINE
// Sistema completo com autenticação, catálogo, carrinho, pedidos e relatórios
// ============================================================================
import { state } from './state.js';
import {
    handleLogin,
    handleRegister,
    logout
} from './auth.js';
import { loadFromStorage } from './storage.js';

// ============================================================================
// 1. CONFIGURAÇÃO E CONSTANTES
// ============================================================================

const API_BASE_URL = '/api';
const STORAGE_KEYS = {
    USER: 'ze_da_carne_user',
    CART: 'ze_da_carne_cart',
    TOKEN: 'ze_da_carne_token'
};

// ============================================================================
// 2. ESTADO GLOBAL DA APLICAÇÃO
// ============================================================================

const app = {
    currentUser: null,
    currentPage: 'login',
    cart: [],
    products: [],
    orders: [],
    clients: [],
    isAdmin: false,

    init() {
        loadFromStorage();
        this.setupEventListeners();
        this.render();
    },

    saveToStorage() {
        if (this.currentUser) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
        }
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(this.cart));
    },

    setupEventListeners() {
    // ================================================================
    // CLIQUES
    // ================================================================
    document.addEventListener('click', (e) => {

        // ------------------------------------------------------------
        // Navegação
        // ------------------------------------------------------------
        const navLink = e.target.closest('.nav-link');

        if (navLink) {
            e.preventDefault();

            const page = navLink.dataset.page;

            if (page) {
                this.currentPage = page;
                this.render();
            }

            return;
        }

        // ------------------------------------------------------------
        // Login
        // ------------------------------------------------------------
        const loginButton = e.target.closest('#btn-login');

        if (loginButton) {
            e.preventDefault();


            handleLogin(
                this.showAlert.bind(this),
                this.render.bind(this)
            );

            return;
        }

        // ------------------------------------------------------------
        // Registro
        // ------------------------------------------------------------
        const registerButton = e.target.closest('#btn-register');

        if (registerButton) {
            e.preventDefault();

            handleRegister(
                this.showAlert.bind(this),
                this.render.bind(this)
            );

            return;
        }

        // ------------------------------------------------------------
        // Logout
        // ------------------------------------------------------------
        const logoutButton = e.target.closest('#btn-logout');

        if (logoutButton) {
            e.preventDefault();

            logout(
                this.showAlert.bind(this),
                this.render.bind(this)
            );

            return;
        }

        // ------------------------------------------------------------
        // Adicionar ao carrinho
        // ------------------------------------------------------------
        const addButton = e.target.closest('.add-to-cart');

        if (addButton) {
            e.preventDefault();

            const productId = parseInt(addButton.dataset.productId);

            if (!isNaN(productId)) {
                this.addToCart(productId);
            }

            return;
        }

        // ------------------------------------------------------------
        // REMOVER DO CARRINHO
        // ------------------------------------------------------------
        const removeButton = e.target.closest('.remove-from-cart');

        if (removeButton) {
            e.preventDefault();

            const cartIndex = parseInt(removeButton.dataset.cartIndex);

            if (!isNaN(cartIndex)) {
                this.removeFromCart(cartIndex);
            }

            return;
        }

        // ------------------------------------------------------------
        // DIMINUIR QUANTIDADE (-)
        // ------------------------------------------------------------
        const decreaseButton = e.target.closest('.quantity-decrease');

        if (decreaseButton) {
            e.preventDefault();

            const cartIndex = parseInt(decreaseButton.dataset.cartIndex);

            if (!isNaN(cartIndex) && this.cart[cartIndex]) {
                const newQuantity = this.cart[cartIndex].quantity - 1;

                this.updateCartQuantity(cartIndex, newQuantity);
            }

            return;
        }

        // ------------------------------------------------------------
        // AUMENTAR QUANTIDADE (+)
        // ------------------------------------------------------------
        const increaseButton = e.target.closest('.quantity-increase');

        if (increaseButton) {
            e.preventDefault();

            const cartIndex = parseInt(increaseButton.dataset.cartIndex);

            if (!isNaN(cartIndex) && this.cart[cartIndex]) {
                const newQuantity = this.cart[cartIndex].quantity + 1;

                this.updateCartQuantity(cartIndex, newQuantity);
            }

            return;
        }

        // ------------------------------------------------------------
        // Finalizar pedido
        // ------------------------------------------------------------
        const checkoutButton = e.target.closest('#btn-checkout');

        if (checkoutButton) {
            e.preventDefault();

            this.currentPage = 'checkout';
            this.render();

            return;
        }

        // ------------------------------------------------------------
        // Confirmar pedido
        // ------------------------------------------------------------
        const confirmOrderButton = e.target.closest('#btn-confirm-order');

        if (confirmOrderButton) {
            e.preventDefault();
            this.handleConfirmOrder();
            return;
        }

        // ------------------------------------------------------------
        // Filtrar categoria
        // ------------------------------------------------------------
        const categoryButton = e.target.closest('.category-filter');

        if (categoryButton) {
            e.preventDefault();

            const category = categoryButton.dataset.category;

            if (category) {
                this.filterByCategory(category);
            }

            return;
        }

        // ------------------------------------------------------------
        // Admin - Adicionar produto
        // ------------------------------------------------------------
        const addProductButton = e.target.closest('#btn-add-product');

        if (addProductButton) {
            e.preventDefault();
            this.showAddProductModal();
            return;
        }

        // ------------------------------------------------------------
        // Admin - Salvar produto
        // ------------------------------------------------------------
        const saveProductButton = e.target.closest('#btn-save-product');

        if (saveProductButton) {
            e.preventDefault();
            this.handleSaveProduct();
            return;
        }

        // ------------------------------------------------------------
        // Admin - Exportar relatório
        // ------------------------------------------------------------
        const exportReportButton = e.target.closest('#btn-export-report');

        if (exportReportButton) {
            e.preventDefault();
            this.exportReport();
            return;
        }
    });


    // ================================================================
    // ALTERAÇÃO DE QUANTIDADE PELO INPUT
    // ================================================================
    document.addEventListener('change', (e) => {

        const quantityInput = e.target.closest('.cart-quantity');

        if (quantityInput) {

            const cartIndex = parseInt(quantityInput.dataset.cartIndex);
            const quantity = parseInt(quantityInput.value);

            if (!isNaN(cartIndex) && !isNaN(quantity)) {
                this.updateCartQuantity(cartIndex, quantity);
            }
        }
    });


    // ================================================================
    // ATUALIZAR QUANTIDADE NO CARRINHO
    // ================================================================

    document.addEventListener('change', (e) => {

        const quantityInput = e.target.closest('.cart-quantity');

        if (quantityInput) {

            const cartIndex = parseInt(
                quantityInput.dataset.cartIndex
            );

            const quantity = parseInt(
                quantityInput.value
            );

            if (!isNaN(cartIndex) && !isNaN(quantity)) {
                this.updateCartQuantity(cartIndex, quantity);
            }
        }
    });


        // Atualizar quantidade no carrinho
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('cart-quantity')) {
                const cartIndex = parseInt(e.target.dataset.cartIndex);
                const quantity = parseInt(e.target.value);
                this.updateCartQuantity(cartIndex, quantity);
            }
        });
    },


    // ========================================================================
    // 4. CARRINHO DE COMPRAS
    // ========================================================================

    addToCart(productId) {
    console.time('addToCart TOTAL');

    const product = this.products.find(p => p.id === productId);

    if (!product) {
        console.timeEnd('addToCart TOTAL');
        return;
    }

    console.time('cart');

    const existingItem = this.cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        this.cart.push({
            id: product.id,
            name: product.nome,
            price: product.preco,
            quantity: 1
        });
    }

    console.timeEnd('cart');

    console.time('saveToStorage');
    this.saveToStorage();
    console.timeEnd('saveToStorage');

    console.time('showAlert');
    this.showAlert(`${product.nome} adicionado ao carrinho!`, 'success');
    console.timeEnd('showAlert');

    console.time('render');
    this.render();
    console.timeEnd('render');

    console.timeEnd('addToCart TOTAL');
},

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.saveToStorage();
        this.render();
    },

    updateCartQuantity(index, quantity) {

        // Verifica se o item existe
        if (!this.cart[index]) {
            return;
        }

        // Garante que seja número
        quantity = parseInt(quantity);

        // Se for inválido ou menor que 1,
        // remove o produto do carrinho
        if (isNaN(quantity) || quantity <= 0) {
            this.removeFromCart(index);
            return;
        }

        // Atualiza quantidade
        this.cart[index].quantity = quantity;

        // Salva no localStorage
        this.saveToStorage();

        // Atualiza a tela
        this.render();
    },

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    getCartCount() {
        return this.cart.reduce((count, item) => count + item.quantity, 0);
    },

    // ========================================================================
    // 5. PEDIDOS
    // ========================================================================

    async handleConfirmOrder() {
        if (this.cart.length === 0) {
            this.showAlert('Seu carrinho está vazio', 'error');
            return;
        }

        const deliveryType = document.getElementById('delivery-type')?.value;
        const address = document.getElementById('delivery-address')?.value;
        const observation = document.getElementById('order-observation')?.value;

        if (!deliveryType) {
            this.showAlert('Por favor, selecione o tipo de entrega', 'error');
            return;
        }

        if (deliveryType === 'delivery' && !address) {
            this.showAlert('Por favor, informe o endereço de entrega', 'error');
            return;
        }

        try {
            const orderData = {
                cliente_id: this.currentUser.id,
                tipo_entrega: deliveryType,
                endereco_entrega: address || null,
                observacao: observation || null,
                itens: this.cart.map(item => ({
                    produto_id: item.id,
                    quantidade: item.quantity,
                    preco_unitario: item.price,
                    subtotal: item.price * item.quantity
                }))
            };

            const response = await fetch(`${API_BASE_URL}/pedidos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showAlert(`Pedido #${data.numero_pedido} criado com sucesso!`, 'success');
                this.cart = [];
                this.saveToStorage();
                this.currentPage = 'orders';
                this.render();
            } else {
                this.showAlert(data.error || 'Erro ao criar pedido', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showAlert('Erro ao criar pedido', 'error');
        }
    },

    async loadOrders() {
        try {
            const response = await fetch(`${API_BASE_URL}/pedidos/cliente/${this.currentUser.id}`);
            if (response.ok) {
                this.orders = await response.json();
            }
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
        }
    },

    // ========================================================================
    // 6. PRODUTOS E CATÁLOGO
    // ========================================================================

    async loadProducts() {
        try {
            const response = await fetch(`${API_BASE_URL}/produtos`);
            if (response.ok) {
                this.products = await response.json();
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    },

    filterByCategory(category) {
        // Implementado na renderização
        this.currentCategory = category;
        this.render();
    },

    getFilteredProducts() {
        if (!this.currentCategory || this.currentCategory === 'todos') {
            return this.products;
        }
        return this.products.filter(p => p.categoria === this.currentCategory);
    },

    // ========================================================================
    // 7. ADMIN - GERENCIAMENTO
    // ========================================================================

    showAddProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.add('active');
        }
    },

    async handleSaveProduct() {
        const name = document.getElementById('product-name')?.value;
        const price = parseFloat(document.getElementById('product-price')?.value);
        const category = document.getElementById('product-category')?.value;

        if (!name || !price || !category) {
            this.showAlert('Por favor, preencha todos os campos', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: name, preco: price, categoria: category })
            });

            if (response.ok) {
                this.showAlert('Produto adicionado com sucesso!', 'success');
                await this.loadProducts();
                this.render();
            } else {
                this.showAlert('Erro ao adicionar produto', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showAlert('Erro ao adicionar produto', 'error');
        }
    },

    async loadClients() {
        try {
            const response = await fetch(`${API_BASE_URL}/clientes`);
            if (response.ok) {
                this.clients = await response.json();
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    },

    async exportReport() {
        try {
            const response = await fetch(`${API_BASE_URL}/relatorios/exportar`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio_${new Date().toISOString().split('T')[0]}.xlsx`;
                a.click();
                this.showAlert('Relatório exportado com sucesso!', 'success');
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showAlert('Erro ao exportar relatório', 'error');
        }
    },

    // ========================================================================
    // 8. RENDERIZAÇÃO
    // ========================================================================

    async render() {
        const root = document.getElementById('root');

        if (!state.currentUser) {
            root.innerHTML = this.renderAuthPage();
        } else {
            await this.loadProducts();
            await this.loadOrders();

            if (state.isAdmin) {
                await this.loadClients();
            }

            root.innerHTML = this.renderMainApp();
        }
    },

    renderAuthPage() {
        if (state.currentPage === 'register') {
            return this.renderRegisterPage();
        }

        return this.renderLoginPage();
    },

    renderLoginPage() {
        return `
            <div class="auth-container">
                <div class="auth-box">
                    <div class="auth-header">
                        <i class="fas fa-cow"></i>
                        <h1>Zé da Carne</h1>
                        <p>Açougue Online</p>
                    </div>
                    <form class="auth-form">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" id="login-email" class="form-input" placeholder="seu@email.com" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Senha</label>
                            <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
                        </div>
                        <button type="button" id="btn-login" class="btn btn-primary btn-block">Entrar</button>
                    </form>
                    <div class="auth-footer">
                        <p>Não tem conta? <a href="#" class="nav-link" data-page="register">Cadastre-se</a></p>
                    </div>
                </div>
            </div>
            <style>
                .auth-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, var(--primary-color) 0%, #b71c1c 100%);
                }
                .auth-box {
                    background: white;
                    padding: 3rem;
                    border-radius: 12px;
                    box-shadow: var(--shadow-lg);
                    width: 100%;
                    max-width: 400px;
                }
                .auth-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .auth-header i {
                    font-size: 3rem;
                    color: var(--primary-color);
                    display: block;
                    margin-bottom: 0.5rem;
                }
                .auth-header h1 {
                    font-size: 2rem;
                    margin: 0.5rem 0;
                }
                .auth-header p {
                    color: var(--text-light);
                    margin: 0;
                }
                .auth-form {
                    margin-bottom: 1.5rem;
                }
                .auth-footer {
                    text-align: center;
                    border-top: 1px solid var(--border-color);
                    padding-top: 1rem;
                }
                .auth-footer a {
                    color: var(--primary-color);
                    text-decoration: none;
                    font-weight: 600;
                }
                .auth-footer a:hover {
                    text-decoration: underline;
                }
            </style>
        `;
    },

    renderRegisterPage() {
        return `
            <div class="auth-container">
                <div class="auth-box">
                    <div class="auth-header">
                        <i class="fas fa-cow"></i>
                        <h1>Zé da Carne</h1>
                        <p>Cadastro</p>
                    </div>
                    <form class="auth-form">
                        <div class="form-group">
                            <label class="form-label">Nome Completo</label>
                            <input type="text" id="register-name" class="form-input" placeholder="Seu nome" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" id="register-email" class="form-input" placeholder="seu@email.com" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Telefone</label>
                            <input type="tel" id="register-phone" class="form-input" placeholder="(11) 99999-9999" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Senha</label>
                            <input type="password" id="register-password" class="form-input" placeholder="••••••••" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirmar Senha</label>
                            <input type="password" id="register-confirm-password" class="form-input" placeholder="••••••••" required>
                        </div>
                        <button type="button" id="btn-register" class="btn btn-primary btn-block">Cadastrar</button>
                    </form>
                    <div class="auth-footer">
                        <p>Já tem conta? <a href="#" class="nav-link" data-page="login">Faça login</a></p>
                    </div>
                </div>
            </div>
            <style>
                .auth-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, var(--primary-color) 0%, #b71c1c 100%);
                }
                .auth-box {
                    background: white;
                    padding: 3rem;
                    border-radius: 12px;
                    box-shadow: var(--shadow-lg);
                    width: 100%;
                    max-width: 400px;
                }
                .auth-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .auth-header i {
                    font-size: 3rem;
                    color: var(--primary-color);
                    display: block;
                    margin-bottom: 0.5rem;
                }
                .auth-header h1 {
                    font-size: 2rem;
                    margin: 0.5rem 0;
                }
                .auth-header p {
                    color: var(--text-light);
                    margin: 0;
                }
                .auth-form {
                    margin-bottom: 1.5rem;
                }
                .auth-footer {
                    text-align: center;
                    border-top: 1px solid var(--border-color);
                    padding-top: 1rem;
                }
                .auth-footer a {
                    color: var(--primary-color);
                    text-decoration: none;
                    font-weight: 600;
                }
                .auth-footer a:hover {
                    text-decoration: underline;
                }
            </style>
        `;
    },

    renderMainApp() {
        return `
            <div class="app-container">
                ${this.renderNavbar()}
                <div class="main-content">
                    ${this.renderPage()}
                </div>
            </div>
        `;
    },

    renderNavbar() {
        return `
            <nav class="navbar">
                <div class="navbar-content">
                    <div class="navbar-brand">
                        <i class="fas fa-cow"></i>
                        Zé da Carne
                    </div>
                    <div class="navbar-menu">
                        <a href="#" class="nav-link" data-page="catalog">
                            <i class="fas fa-shopping-bag"></i> Catálogo
                        </a>
                        <a href="#" class="nav-link" data-page="cart">
                            <i class="fas fa-shopping-cart"></i> Carrinho
                            <span class="cart-badge">${this.getCartCount()}</span>
                        </a>
                        <a href="#" class="nav-link" data-page="orders">
                            <i class="fas fa-list"></i> Meus Pedidos
                        </a>
                        ${state.isAdmin ? `
                            <a href="#" class="nav-link" data-page="admin">
                                <i class="fas fa-cog"></i> Admin
                            </a>
                        ` : ''}
                        <button id="btn-logout" class="btn btn-outline btn-small">
                            <i class="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </div>
                </div>
            </nav>
        `;
    },

    renderPage() {
        switch (state.currentPage) {
            case 'catalog':
                return this.renderCatalog();

            case 'cart':
                return this.renderCart();

            case 'checkout':
                return this.renderCheckout();

            case 'orders':
                return this.renderOrders();

            case 'admin':
                return state.isAdmin
                    ? this.renderAdmin()
                    : this.renderCatalog();

            default:
                return this.renderCatalog();
        }
    },

    renderCatalog() {
        const categories = [...new Set(this.products.map(p => p.categoria))];
        const filteredProducts = this.getFilteredProducts();

        return `
            <div class="catalog-container">
                <div class="categories-sidebar">
                    <h3>Categorias</h3>
                    <ul class="category-list">
                        <li
                            class="category-item ${!this.currentCategory || this.currentCategory === 'todos' ? 'active' : ''} category-filter"
                            data-category="todos"
                        >
                            <a href="#" data-category="todos">
                                Todos
                            </a>
                        </li>

                        ${categories.map(cat => `
                            <li
                                class="category-item ${this.currentCategory === cat ? 'active' : ''} category-filter"
                                data-category="${cat}"
                            >
                                <a href="#" data-category="${cat}">
                                    ${this.formatCategory(cat)}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div>
                    <h2>Nossos Produtos</h2>
                    <div class="products-grid">
                        ${filteredProducts.map(product => `
                            <div class="product-card">
                                <div class="product-image">
                                    <i class="fas fa-drumstick-bite"></i>
                                </div>
                                <div class="product-info">
                                    <h3 class="product-name">${product.nome}</h3>
                                    <p class="product-category">${this.formatCategory(product.categoria)}</p>
                                    <p class="product-price">R$ ${product.preco.toFixed(2)}</p>
                                    <button class="btn btn-primary btn-block add-to-cart" data-product-id="${product.id}">
                                        <i class="fas fa-plus"></i> Adicionar
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    formatCategory(category) {
        const categories = {
            bovino: 'Bovino',
            suino: 'Suíno',
            frango: 'Frango',
            rotisseria: 'Rotisseria',
            conveniencia: 'Conveniência'
    };

    return categories[category] || category;
    },

    renderCart() {
    if (this.cart.length === 0) {
        return `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h2>Seu carrinho está vazio</h2>
                <p>Adicione alguns produtos deliciosos!</p>

                <a href="#"
                   class="nav-link btn btn-primary mt-3"
                   data-page="catalog">
                    Voltar ao Catálogo
                </a>
            </div>
        `;
    }

    const total = this.getCartTotal();
    const subtotal = total;
    const taxa = total * 0.1;
    const totalComTaxa = subtotal + taxa;

    return `
        <div class="cart-container">

            <div class="cart-items">

                <h2>Seu Carrinho</h2>

                ${this.cart.map((item, index) => `

                    <div class="cart-item">

                        <!-- IMAGEM -->
                        <div class="cart-item-image">
                            <i class="fas fa-drumstick-bite"></i>
                        </div>

                        <!-- INFORMAÇÕES -->
                        <div class="cart-item-details">

                            <div class="cart-item-name">
                                ${item.name}
                            </div>

                            <div class="cart-item-price">
                                R$ ${item.price.toFixed(2)}
                            </div>

                        </div>

                        <!-- CONTROLE DE QUANTIDADE -->
                        <div class="quantity-control">

                            <!-- DIMINUIR -->
                            <button
                                type="button"
                                class="quantity-decrease"
                                data-cart-index="${index}"
                                aria-label="Diminuir quantidade"
                            >
                                -
                            </button>

                            <!-- QUANTIDADE -->
                            <input
                                type="number"
                                class="cart-quantity"
                                data-cart-index="${index}"
                                value="${item.quantity}"
                                min="1"
                            >

                            <!-- AUMENTAR -->
                            <button
                                type="button"
                                class="quantity-increase"
                                data-cart-index="${index}"
                                aria-label="Aumentar quantidade"
                            >
                                +
                            </button>

                        </div>

                        <!-- TOTAL DO ITEM -->
                        <div style="
                            text-align: right;
                            min-width: 100px;
                        ">

                            <div style="
                                font-weight: bold;
                                margin-bottom: 0.5rem;
                            ">
                                R$ ${(item.price * item.quantity).toFixed(2)}
                            </div>

                            <!-- REMOVER -->
                            <button
                                type="button"
                                class="btn btn-small remove-from-cart"
                                data-cart-index="${index}"
                                aria-label="Remover produto"
                            >
                                <i class="fas fa-trash"></i>
                            </button>

                        </div>

                    </div>

                `).join('')}

            </div>


            <!-- RESUMO DO CARRINHO -->
            <div class="cart-summary">

                <h3>Resumo</h3>

                <div class="summary-item">
                    <span>Subtotal:</span>
                    <span>R$ ${subtotal.toFixed(2)}</span>
                </div>

                <div class="summary-item">
                    <span>Taxa de Entrega:</span>
                    <span>R$ ${taxa.toFixed(2)}</span>
                </div>

                <div class="summary-item total">
                    <span>Total:</span>
                    <span>R$ ${totalComTaxa.toFixed(2)}</span>
                </div>

                <button
                    id="btn-checkout"
                    class="btn btn-success btn-block mt-3"
                    type="button"
                >
                    <i class="fas fa-credit-card"></i>
                    Finalizar Compra
                </button>

            </div>

        </div>
    `;
},

    renderCheckout() {
        const total = this.getCartTotal();
        const taxa = total * 0.1;
        const totalComTaxa = total + taxa;

        return `
            <div style="max-width: 600px; margin: 0 auto;">
                <h2>Finalizar Pedido</h2>
                <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: var(--shadow);">
                    <div class="form-group">
                        <label class="form-label">Tipo de Entrega</label>
                        <select id="delivery-type" class="form-select">
                            <option value="">Selecione...</option>
                            <option value="retirada">Retirada na Loja</option>
                            <option value="delivery">Entrega em Casa</option>
                        </select>
                    </div>
                    <div class="form-group" id="address-group" style="display: none;">
                        <label class="form-label">Endereço de Entrega</label>
                        <textarea id="delivery-address" class="form-textarea" placeholder="Rua, número, bairro, cidade"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observações (opcional)</label>
                        <textarea id="order-observation" class="form-textarea" placeholder="Alguma observação especial?"></textarea>
                    </div>
                    <div style="background: var(--light-color); padding: 1rem; border-radius: 6px; margin: 1.5rem 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>Subtotal:</span>
                            <span>R$ ${total.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                            <span>Taxa:</span>
                            <span>R$ ${taxa.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: bold; color: var(--primary-color);">
                            <span>Total:</span>
                            <span>R$ ${totalComTaxa.toFixed(2)}</span>
                        </div>
                    </div>
                    <button id="btn-confirm-order" class="btn btn-success btn-block">
                        <i class="fas fa-check"></i> Confirmar Pedido
                    </button>
                    <button class="btn btn-outline btn-block mt-2 nav-link" data-page="cart">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                </div>
            </div>
            <script>
                const deliveryType = document.getElementById('delivery-type');
                const addressGroup = document.getElementById('address-group');
                if (deliveryType) {
                    deliveryType.addEventListener('change', (e) => {
                        addressGroup.style.display = e.target.value === 'delivery' ? 'block' : 'none';
                    });
                }
            </script>
        `;
    },

    renderOrders() {
        if (this.orders.length === 0) {
            return `
                <div class="empty-cart">
                    <i class="fas fa-inbox"></i>
                    <h2>Nenhum pedido ainda</h2>
                    <p>Faça seu primeiro pedido agora!</p>
                    <a href="#" class="nav-link btn btn-primary mt-3" data-page="catalog">Ir para Catálogo</a>
                </div>
            `;
        }

        return `
            <div>
                <h2>Meus Pedidos</h2>
                <div style="display: grid; gap: 1.5rem;">
                    ${this.orders.map(order => `
                        <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                                <div>
                                    <h3>Pedido #${order.numero_pedido}</h3>
                                    <p style="color: var(--text-light); font-size: 0.9rem;">${new Date(order.criado_em).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.25rem; font-weight: bold; color: var(--primary-color);">R$ ${order.total.toFixed(2)}</div>
                                    <span style="display: inline-block; padding: 0.25rem 0.75rem; background: ${order.status === 'entregue' ? 'var(--success-color)' : 'var(--warning-color)'}; color: white; border-radius: 4px; font-size: 0.85rem; margin-top: 0.5rem;">${order.status}</span>
                                </div>
                            </div>
                            <div>
                                <p><strong>Tipo de Entrega:</strong> ${order.tipo_entrega === 'retirada' ? 'Retirada na Loja' : 'Entrega em Casa'}</p>
                                ${order.endereco_entrega ? `<p><strong>Endereço:</strong> ${order.endereco_entrega}</p>` : ''}
                                ${order.observacao ? `<p><strong>Observações:</strong> ${order.observacao}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderAdmin() {
        return `
            <div>
                <h2>Painel Administrativo</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); text-align: center;">
                        <i class="fas fa-box" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 0.5rem; display: block;"></i>
                        <h3>${this.products.length}</h3>
                        <p>Produtos</p>
                    </div>
                    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); text-align: center;">
                        <i class="fas fa-users" style="font-size: 2rem; color: var(--secondary-color); margin-bottom: 0.5rem; display: block;"></i>
                        <h3>${this.clients.length}</h3>
                        <p>Clientes</p>
                    </div>
                    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); text-align: center;">
                        <i class="fas fa-receipt" style="font-size: 2rem; color: var(--success-color); margin-bottom: 0.5rem; display: block;"></i>
                        <h3>${this.orders.length}</h3>
                        <p>Pedidos</p>
                    </div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); margin-bottom: 2rem;">
                    <h3>Gerenciamento de Produtos</h3>
                    <button id="btn-add-product" class="btn btn-primary mt-2">
                        <i class="fas fa-plus"></i> Adicionar Produto
                    </button>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow);">
                    <h3>Relatórios</h3>
                    <button id="btn-export-report" class="btn btn-secondary mt-2">
                        <i class="fas fa-download"></i> Exportar Relatório
                    </button>
                </div>

                <div id="product-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 class="modal-title">Adicionar Produto</h2>
                            <button class="modal-close" onclick="document.getElementById('product-modal').classList.remove('active')">×</button>
                        </div>
                        <form>
                            <div class="form-group">
                                <label class="form-label">Nome do Produto</label>
                                <input type="text" id="product-name" class="form-input" placeholder="Ex: Picanha" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Preço (R$)</label>
                                <input type="number" id="product-price" class="form-input" placeholder="0.00" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Categoria</label>
                                <select id="product-category" class="form-select" required>
                                    <option value="">Selecione...</option>
                                    <option value="bovino">Bovino</option>
                                    <option value="suino">Suíno</option>
                                    <option value="frango">Frango</option>
                                    <option value="embutidos">Embutidos</option>
                                </select>
                            </div>
                            <button type="button" id="btn-save-product" class="btn btn-success btn-block">
                                <i class="fas fa-save"></i> Salvar Produto
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // 9. UTILITÁRIOS
    // ========================================================================

    showAlert(message, type = 'info') {
        const alertId = `alert-${Date.now()}`;
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        const alertContainer = document.querySelector('#alert-container');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = alertHTML;
        alertContainer.insertBefore(tempDiv.firstElementChild, alertContainer.firstChild);

        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) alert.remove();
        }, 3000);
    }
};

// ============================================================================
// 10. INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

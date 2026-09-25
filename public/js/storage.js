
// STORAGE - LOCAL STORAGE

import { STORAGE_KEYS } from './config.js';
import { state } from './state.js';



// CARREGAR DADOS DO LOCAL STORAGE
export function loadFromStorage() {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    const cart = localStorage.getItem(STORAGE_KEYS.CART);

    if (user) {
        state.currentUser = JSON.parse(user);
        state.currentPage = 'catalog';
        state.isAdmin = state.currentUser.role === 'admin';
    }

    if (cart) {
        state.cart = JSON.parse(cart);
    }
}



// SALVAR DADOS NO LOCAL STORAGE
export function saveToStorage() {
    if (state.currentUser) {
        localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify(state.currentUser)
        );
    }

    localStorage.setItem(
        STORAGE_KEYS.CART,
        JSON.stringify(state.cart)
    );
}

// LIMPAR DADOS DO LOCAL STORAGE
export function clearStorage() {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.CART);
}
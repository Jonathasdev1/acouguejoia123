
// AUTENTICAÇÃO

import { API_BASE_URL } from './config.js';
import { state } from './state.js';
import { saveToStorage, clearStorage } from './storage.js';


// LOGIN
export async function handleLogin(showAlert, render) {
    console.log('HANDLE LOGIN EXECUTADO');
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
        showAlert('Por favor, preencha todos os campos', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            state.currentUser = data.user;
            state.isAdmin = data.user.role === 'admin';
            state.currentPage = 'catalog';

            saveToStorage();

            showAlert('Login realizado com sucesso!', 'success');

            await render();
        } else {
            showAlert(
                data.error || 'Erro ao fazer login',
                'error'
            );
        }

    } catch (error) {
        console.error('Erro:', error);

        showAlert(
            'Erro ao conectar com o servidor',
            'error'
        );
    }
}

// CADASTRO
export async function handleRegister(showAlert, render) {
    const name = document.getElementById('register-name')?.value;
    const email = document.getElementById('register-email')?.value;
    const phone = document.getElementById('register-phone')?.value;
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-confirm-password')?.value;

    if (
        !name ||
        !email ||
        !phone ||
        !password ||
        !confirmPassword
    ) {
        showAlert(
            'Por favor, preencha todos os campos',
            'error'
        );

        return;
    }

    if (password !== confirmPassword) {
        showAlert(
            'As senhas não conferem',
            'error'
        );

        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                phone,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(
                'Cadastro realizado com sucesso! Faça login agora.',
                'success'
            );

            state.currentPage = 'login';

            await render();
        } else {
            showAlert(
                data.error || 'Erro ao registrar',
                'error'
            );
        }

    } catch (error) {
        console.error('Erro:', error);

        showAlert(
            'Erro ao conectar com o servidor',
            'error'
        );
    }
}

// LOGOUT
export function logout(showAlert, render) {
    state.currentUser = null;
    state.cart = [];
    state.currentPage = 'login';
    state.isAdmin = false;

    clearStorage();

    showAlert(
        'Logout realizado com sucesso',
        'success'
    );

    render();
}


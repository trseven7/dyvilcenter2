// Script para a página de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    // Verificar se já está logado
    checkLoginStatus();
    
    loginForm.addEventListener('submit', handleLogin);
    
    // Funções para gerenciar cookies
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
    }
    
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
    function deleteCookie(name) {
        document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict";
    }
    
    // Função para verificar status de login
    function checkLoginStatus() {
        const sessionToken = getCookie('session_token');
        const userRole = getCookie('user_role');
        
        if (sessionToken && userRole === 'admin') {
            // Verificar se a sessão ainda é válida
            fetch('/backend/api.php?action=validateSession', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_token: sessionToken
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Sessão válida, redirecionar para dashboard
                    window.location.href = 'index.html';
                } else {
                    // Sessão inválida, limpar cookies
                    deleteCookie('session_token');
                    deleteCookie('user_role');
                    deleteCookie('user_id');
                    deleteCookie('username');
                }
            })
            .catch(error => {
                console.error('Erro ao validar sessão:', error);
                // Em caso de erro, limpar cookies por segurança
                deleteCookie('session_token');
                deleteCookie('user_role');
                deleteCookie('user_id');
                deleteCookie('username');
            });
        }
    }
    
    // Função para lidar com o login
    async function handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Validação básica
        if (!username || !password) {
            showError('Por favor, preencha todos os campos');
            return;
        }
        
        // Mostrar loading no botão
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        submitBtn.disabled = true;
        
        try {
            // Fazer requisição para verificar credenciais
            const response = await fetch('/backend/api.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Login bem-sucedido - armazenar dados da sessão em cookies
                setCookie('session_token', data.session_token, 7); // 7 dias
                setCookie('user_role', data.user.role, 7);
                setCookie('user_id', data.user.id, 7);
                setCookie('username', data.user.username, 7);
                
                // Redirecionar para dashboard
                window.location.href = 'index.html';
            } else {
                // Login falhou
                showError(data.message || 'Credenciais inválidas');
            }
            
        } catch (error) {
            console.error('Erro no login:', error);
            showError('Erro de conexão. Tente novamente.');
        } finally {
            // Restaurar botão
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    // Função para mostrar erro
    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        
        // Esconder erro após 5 segundos
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    // Focar no primeiro campo
    document.getElementById('username').focus();
});


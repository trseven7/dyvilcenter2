// Script para a página de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    // Função para gerar CSRF token
    function generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Gerar e definir CSRF token
    const csrfToken = generateCSRFToken();
    document.getElementById('csrf_token').value = csrfToken;
    sessionStorage.setItem('csrf_token', csrfToken);
    
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
        
        // Adicionar flag Secure se estiver em HTTPS
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict" + secure;
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
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict" + secure;
    }
    
    // Função para verificar status de login
    function checkLoginStatus() {
        const sessionToken = getCookie('session_token');
        const userRole = getCookie('user_role');
        
        if (sessionToken && userRole === 'admin') {
            // Verificar se a sessão ainda é válida
            fetch('backend/api.php?action=validateSession', {
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
        const csrfToken = document.getElementById('csrf_token').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
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
            const response = await fetch('backend/api.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    csrf_token: csrfToken,
                    remember_me: rememberMe
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Login bem-sucedido - armazenar dados da sessão em cookies
                // Duração baseada em "Lembrar de mim": 30 dias se marcado, 7 dias se não
                const cookieDays = rememberMe ? 30 : 7;
                setCookie('session_token', data.session_token, cookieDays);
                setCookie('user_role', data.user.role, cookieDays);
                setCookie('user_id', data.user.id, cookieDays);
                setCookie('username', data.user.username, cookieDays);
                
                // Mostrar feedback de sucesso antes de redirecionar
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Sucesso! Redirecionando...';
                submitBtn.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
                
                // Redirecionar após breve delay para mostrar feedback
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                // Login falhou - verificar se é rate limiting
                if (data.rate_limited) {
                    showError(data.message, 'warning');
                    // Desabilitar botão por mais tempo se rate limited
                    submitBtn.disabled = true;
                    setTimeout(() => {
                        submitBtn.disabled = false;
                    }, 5000);
                } else {
                    showError(data.message || 'Credenciais inválidas');
                }
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
    function showError(message, type = 'error') {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        
        // Aplicar estilo baseado no tipo
        if (type === 'warning') {
            errorMessage.style.background = 'rgba(255, 193, 7, 0.2)';
            errorMessage.style.borderColor = 'rgba(255, 193, 7, 0.5)';
            errorMessage.style.color = '#ffc107';
            errorMessage.querySelector('i').className = 'fas fa-exclamation-triangle';
        } else {
            errorMessage.style.background = 'rgba(255, 77, 109, 0.2)';
            errorMessage.style.borderColor = 'rgba(255, 77, 109, 0.5)';
            errorMessage.style.color = '#ff4d6d';
            errorMessage.querySelector('i').className = 'fas fa-exclamation-triangle';
        }
        
        // Esconder erro após tempo baseado no tipo
        const hideTime = type === 'warning' ? 8000 : 5000;
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, hideTime);
    }
    
    // Focar no primeiro campo
    document.getElementById('username').focus();
    
    // Funcionalidade de mostrar/ocultar senha
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');
    
    if (togglePassword && passwordInput && togglePasswordIcon) {
        togglePassword.addEventListener('click', function() {
            const isPassword = passwordInput.type === 'password';
            
            // Alternar tipo do input
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Alternar ícone
            togglePasswordIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            
            // Atualizar aria-label para acessibilidade
            togglePassword.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
            
            // Manter foco no input de senha
            passwordInput.focus();
        });
    }
});


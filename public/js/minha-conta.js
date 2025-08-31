// Sistema de Gerenciamento da Conta
class AccountManager {
    constructor() {
        this.userInfo = null;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadUserInfo();
    }
    
    bindEvents() {
        // Toggle de senha
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePassword(e));
        });
        
        // Verificação de força da senha
        document.getElementById('new-password').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });
        
        // Copiar código de afiliado
        document.getElementById('copy-affiliate-btn').addEventListener('click', () => {
            this.copyAffiliateCode();
        });
        
        // Formulário de alteração de senha
        document.getElementById('change-password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });
    }
    
    // Função para gerenciar cookies
    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
    // Função para escapar HTML e prevenir XSS
    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    async loadUserInfo() {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=getUserInfo', {
                headers: {
                    'Authorization': 'Bearer ' + sessionToken
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.userInfo = data.user;
                this.updateUserDisplay();
            } else {
                // Usar dados dos cookies como fallback
                this.loadUserFromCookies();
            }
        } catch (error) {
            console.error('Erro ao carregar informações do usuário:', error);
            this.loadUserFromCookies();
        }
    }
    
    loadUserFromCookies() {
        const username = this.getCookie('username');
        const userRole = this.getCookie('user_role');
        
        this.userInfo = {
            username: username || 'Usuário',
            telegram_username: null,
            telegram_id: null,
            plan: 'free',
            credits: 0,
            affiliate_code: 'DEMO123',
            created_at: new Date().toISOString()
        };
        
        this.updateUserDisplay();
    }
    
    updateUserDisplay() {
        if (!this.userInfo) return;
        
        // Atualizar informações básicas
        document.getElementById('username').textContent = this.escapeHTML(this.userInfo.username);
        document.getElementById('telegram-username').textContent = this.userInfo.telegram_username || 'Não informado';
        document.getElementById('telegram-id').textContent = this.userInfo.telegram_id || 'Não informado';
        
        // Atualizar plano
        const planElement = document.getElementById('user-plan');
        planElement.textContent = this.userInfo.plan.toUpperCase();
        planElement.className = `info-value plan-badge ${this.userInfo.plan}`;
        
        // Atualizar créditos
        const creditsElement = document.getElementById('user-credits');
        creditsElement.querySelector('span').textContent = this.userInfo.credits || 0;
        
        // Atualizar código de afiliado
        const affiliateElement = document.getElementById('affiliate-code');
        affiliateElement.querySelector('span').textContent = this.userInfo.affiliate_code || 'N/A';
        
        // Atualizar data de membro
        if (this.userInfo.created_at) {
            const memberSince = new Date(this.userInfo.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            document.getElementById('member-since').textContent = memberSince;
        }
    }
    
    togglePassword(e) {
        const button = e.currentTarget;
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }
    
    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        let strength = 0;
        let strengthLabel = 'Digite uma senha';
        
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Remover classes anteriores
        strengthBar.className = 'strength-fill';
        strengthText.className = 'strength-text';
        
        if (password.length === 0) {
            strengthLabel = 'Digite uma senha';
        } else if (strength <= 2) {
            strengthBar.classList.add('weak');
            strengthText.classList.add('weak');
            strengthLabel = 'Senha fraca';
        } else if (strength === 3) {
            strengthBar.classList.add('fair');
            strengthText.classList.add('fair');
            strengthLabel = 'Senha razoável';
        } else if (strength === 4) {
            strengthBar.classList.add('good');
            strengthText.classList.add('good');
            strengthLabel = 'Senha boa';
        } else if (strength === 5) {
            strengthBar.classList.add('strong');
            strengthText.classList.add('strong');
            strengthLabel = 'Senha forte';
        }
        
        strengthText.textContent = strengthLabel;
    }
    
    copyAffiliateCode() {
        const codeElement = document.getElementById('affiliate-code').querySelector('span');
        const code = codeElement.textContent;
        
        if (code === 'N/A') {
            this.showNotification('Código de afiliado não disponível', 'warning');
            return;
        }
        
        // Copiar para clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                this.showNotification('Código de afiliado copiado!', 'success');
            });
        } else {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Código de afiliado copiado!', 'success');
        }
    }
    
    async changePassword() {
        const form = document.getElementById('change-password-form');
        const formData = new FormData(form);
        
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');
        
        // Validações
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showNotification('Todos os campos são obrigatórios', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showNotification('As senhas não coincidem', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            this.showNotification('A nova senha deve ter pelo menos 8 caracteres', 'error');
            return;
        }
        
        // Verificar força da senha
        const hasLower = /[a-z]/.test(newPassword);
        const hasUpper = /[A-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
        
        if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
            this.showNotification('A senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais', 'error');
            return;
        }
        
        const changeBtn = document.querySelector('.change-password-btn');
        const originalText = changeBtn.innerHTML;
        changeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Alterando...';
        changeBtn.disabled = true;
        
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=changePassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Senha alterada com sucesso!', 'success');
                form.reset();
                this.checkPasswordStrength(''); // Reset password strength
            } else {
                this.showNotification('Erro ao alterar senha: ' + (result.error || 'Erro desconhecido'), 'error');
            }
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            this.showNotification('Erro de conexão ao alterar senha', 'error');
        } finally {
            changeBtn.innerHTML = originalText;
            changeBtn.disabled = false;
        }
    }
    
    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const icon = document.createElement('i');
        icon.className = `fas ${this.getNotificationIcon(type)}`;
        
        const span = document.createElement('span');
        span.textContent = message;
        
        content.appendChild(icon);
        content.appendChild(span);
        notification.appendChild(content);
        
        // Adicionar estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 400px;
        `;
        
        // Cores baseadas no tipo
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
                notification.style.color = '#000';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #ff6b6b, #ff5252)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, #ffa726, #ff9800)';
                notification.style.color = '#000';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #42a5f5, #2196f3)';
        }
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remover após 4 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
    
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
}

// Inicializar quando a página carregar
let accountManager;
document.addEventListener('DOMContentLoaded', function() {
    accountManager = new AccountManager();
});

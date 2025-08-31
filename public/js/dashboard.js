// Sistema de Dashboard
class DashboardManager {
    constructor() {
        this.userInfo = null;
        this.init();
    }
    
    init() {
        this.loadUserInfo();
        this.loadStats();
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
            plan: 'free',
            credits: 0,
            role: userRole || 'user',
            created_at: new Date().toISOString(),
            affiliate_code: 'N/A'
        };
        
        this.updateUserDisplay();
    }
    
    updateUserDisplay() {
        if (!this.userInfo) return;
        
        // Atualizar nome do usuário
        document.getElementById('user-name').textContent = this.escapeHTML(this.userInfo.username);
        
        // Atualizar plano
        const planElement = document.getElementById('user-plan');
        const planText = document.getElementById('plan-text');
        planText.textContent = this.userInfo.plan.toUpperCase();
        
        // Aplicar classe CSS baseada no plano
        planElement.className = `user-plan ${this.userInfo.plan}`;
        
        // Atualizar créditos
        document.getElementById('credits-text').textContent = this.userInfo.credits || 0;
        
        // Atualizar código de afiliado
        document.getElementById('affiliate-code').textContent = this.userInfo.affiliate_code || 'N/A';
        
        // Atualizar data de membro
        if (this.userInfo.created_at) {
            const memberSince = new Date(this.userInfo.created_at).toLocaleDateString('pt-BR', {
                month: '2-digit',
                year: 'numeric'
            });
            document.getElementById('member-since').textContent = memberSince;
        }
    }
    
    async loadStats() {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=getDashboardStats', {
                headers: {
                    'Authorization': 'Bearer ' + sessionToken
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateStats(data.stats);
            } else {
                // Usar dados de exemplo
                this.updateStats({
                    total_users: 1250,
                    my_invites: 0
                });
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            this.updateStats({
                total_users: 1250,
                my_invites: 0
            });
        }
    }
    
    updateStats(stats) {
        // Atualizar total de usuários
        this.animateNumber('total-users', stats.total_users || 0);
        
        // Atualizar meus convites
        this.animateNumber('my-invites', stats.my_invites || 0);
    }
    
    animateNumber(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const startValue = 0;
        const duration = 2000; // 2 segundos
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Função de easing (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
            
            element.textContent = currentValue.toLocaleString('pt-BR');
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
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
let dashboardManager;
document.addEventListener('DOMContentLoaded', function() {
    dashboardManager = new DashboardManager();
});

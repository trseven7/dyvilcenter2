// Sistema de Ranking
class RankingManager {
    constructor() {
        this.ranking = [];
        this.userPosition = null;
        this.userInfo = null;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadRanking();
        this.loadUserPosition();
    }
    
    bindEvents() {
        // Botão de compartilhar código
        document.getElementById('share-code-btn').addEventListener('click', () => {
            this.shareAffiliateCode();
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
    
    async loadRanking() {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=getRanking', {
                headers: {
                    'Authorization': 'Bearer ' + sessionToken
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.ranking = data.ranking || [];
            } else {
                // Dados de exemplo se não há endpoint
                this.ranking = [
                    {
                        position: 1,
                        username: 'AffiliateKing',
                        score: 47,
                        user_id: '1'
                    },
                    {
                        position: 2,
                        username: 'InviteExpert',
                        score: 32,
                        user_id: '2'
                    },
                    {
                        position: 3,
                        username: 'ReferralMaster',
                        score: 28,
                        user_id: '3'
                    },
                    {
                        position: 4,
                        username: 'NetworkPro',
                        score: 19,
                        user_id: '4'
                    },
                    {
                        position: 5,
                        username: 'SocialInfluencer',
                        score: 15,
                        user_id: '5'
                    }
                ];
            }
            
            this.renderRanking();
        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
            this.ranking = [
                {
                    position: 1,
                    username: 'AffiliateKing',
                    score: 47,
                    user_id: '1'
                },
                {
                    position: 2,
                    username: 'InviteExpert',
                    score: 32,
                    user_id: '2'
                },
                {
                    position: 3,
                    username: 'ReferralMaster',
                    score: 28,
                    user_id: '3'
                },
                {
                    position: 4,
                    username: 'NetworkPro',
                    score: 19,
                    user_id: '4'
                },
                {
                    position: 5,
                    username: 'SocialInfluencer',
                    score: 15,
                    user_id: '5'
                }
            ];
            this.renderRanking();
        }
    }
    
    async loadUserPosition() {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=getUserPosition', {
                headers: {
                    'Authorization': 'Bearer ' + sessionToken
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.userPosition = data.position;
                this.userInfo = data.user;
            } else {
                // Dados de exemplo
                this.userPosition = {
                    position: null, // Não está no ranking
                    score: 0
                };
                this.userInfo = {
                    username: this.getCookie('username') || 'Usuário',
                    affiliate_code: 'DEMO123'
                };
            }
            
            this.renderUserPosition();
        } catch (error) {
            console.error('Erro ao carregar posição do usuário:', error);
            this.userPosition = {
                position: null,
                score: 0
            };
            this.userInfo = {
                username: this.getCookie('username') || 'Usuário',
                affiliate_code: 'DEMO123'
            };
            this.renderUserPosition();
        }
    }
    
    renderRanking() {
        const loadingElement = document.getElementById('loading-ranking');
        const rankingList = document.getElementById('ranking-list');
        const emptyRanking = document.getElementById('empty-ranking');
        
        loadingElement.style.display = 'none';
        
        if (this.ranking.length === 0) {
            emptyRanking.style.display = 'block';
            rankingList.style.display = 'none';
            return;
        }
        
        rankingList.innerHTML = this.ranking.map(user => this.renderRankingItem(user)).join('');
        rankingList.style.display = 'block';
        emptyRanking.style.display = 'none';
        
        // Animar entrada dos itens
        this.animateRankingItems();
    }
    
    renderRankingItem(user) {
        const positionClass = this.getPositionClass(user.position);
        const positionIcon = this.getPositionIcon(user.position);
        
        return `
            <div class="ranking-item" data-position="${user.position}">
                <div class="ranking-position ${positionClass}">
                    ${positionIcon || user.position}
                </div>
                
                <div class="ranking-user">
                    <div class="user-name">${this.escapeHTML(user.username)}</div>
                    <div class="user-stats">
                        <div class="user-invites">
                            <i class="fas fa-user-plus"></i>
                            <span>${user.score} convites</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getPositionClass(position) {
        switch (position) {
            case 1: return 'first';
            case 2: return 'second';
            case 3: return 'third';
            default: return 'other';
        }
    }
    
    getPositionIcon(position) {
        switch (position) {
            case 1: return '<i class="fas fa-crown"></i>';
            case 2: return '<i class="fas fa-medal"></i>';
            case 3: return '<i class="fas fa-award"></i>';
            default: return null;
        }
    }
    
    renderUserPosition() {
        const positionElement = document.getElementById('my-position');
        const invitesElement = document.getElementById('my-invites');
        const codeElement = document.getElementById('my-affiliate-code');
        
        // Atualizar posição
        if (this.userPosition && this.userPosition.position) {
            positionElement.querySelector('.rank-number').textContent = this.userPosition.position + 'º';
        } else {
            positionElement.querySelector('.rank-number').textContent = 'N/A';
        }
        
        // Atualizar convites
        invitesElement.textContent = this.userPosition ? this.userPosition.score : 0;
        
        // Atualizar código de afiliado
        codeElement.textContent = this.userInfo ? this.userInfo.affiliate_code : 'N/A';
    }
    
    animateRankingItems() {
        const items = document.querySelectorAll('.ranking-item');
        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.5s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    shareAffiliateCode() {
        const code = this.userInfo ? this.userInfo.affiliate_code : null;
        
        if (!code || code === 'N/A') {
            this.showNotification('Código de afiliado não disponível', 'warning');
            return;
        }
        
        const shareText = `🚀 Junte-se ao Dyvil Center usando meu código de afiliado: ${code}\n\nAcesse agora e comece a usar nossos serviços!`;
        
        // Tentar usar a API de compartilhamento nativa
        if (navigator.share) {
            navigator.share({
                title: 'Dyvil Center - Convite',
                text: shareText,
                url: window.location.origin
            }).then(() => {
                this.showNotification('Código compartilhado com sucesso!', 'success');
            }).catch((error) => {
                console.log('Erro ao compartilhar:', error);
                this.copyToClipboard(shareText);
            });
        } else {
            // Fallback: copiar para clipboard
            this.copyToClipboard(shareText);
        }
    }
    
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Código copiado para a área de transferência!', 'success');
            });
        } else {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Código copiado para a área de transferência!', 'success');
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
let rankingManager;
document.addEventListener('DOMContentLoaded', function() {
    rankingManager = new RankingManager();
});

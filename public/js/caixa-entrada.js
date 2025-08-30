// Sistema de Gerenciamento da Caixa de Entrada
class InboxManager {
    constructor() {
        this.feedbacks = [];
        this.filteredFeedbacks = [];
        this.selectedFeedback = null;
        this.currentFilter = 'todos';
        this.searchTerm = '';
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadFeedbacks();
    }
    
    bindEvents() {
        // Navegação de abas
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleTabChange(e));
        });
        
        // Busca
        document.getElementById('search-feedbacks').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterFeedbacks();
        });
        
        // Filtro
        document.getElementById('filter-feedbacks').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterFeedbacks();
        });
        
        // Modal de exclusão
        document.getElementById('close-delete-modal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancel-delete-btn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-delete-btn').addEventListener('click', () => this.confirmDelete());
        
        // Fechar modal ao clicar fora
        document.getElementById('delete-modal').addEventListener('click', (e) => {
            if (e.target.id === 'delete-modal') {
                this.closeDeleteModal();
            }
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
    
    async loadFeedbacks() {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=getFeedbacks', {
                headers: {
                    'Authorization': 'Bearer ' + sessionToken
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.feedbacks = data.feedbacks || [];
                this.updateStats();
                this.filterFeedbacks();
            } else {
                // Se não há endpoint ainda, usar dados de exemplo
                this.loadSampleData();
            }
        } catch (error) {
            console.error('Erro ao carregar feedbacks:', error);
            this.loadSampleData();
        }
    }
    
    loadSampleData() {
        // Dados de exemplo baseados na imagem
        this.feedbacks = [
            {
                id: '1',
                username: 'dyvil',
                rating: 5,
                title: 'Excelente serviço',
                message: 'Muito bom o serviço, recomendo para todos. A qualidade é excepcional e o atendimento é muito bom.',
                category: 'Geral',
                status: 'pending',
                is_read: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        
        this.updateStats();
        this.filterFeedbacks();
    }
    
    updateStats() {
        const total = this.feedbacks.length;
        const unread = this.feedbacks.filter(f => !f.is_read).length;
        const today = this.feedbacks.filter(f => {
            const today = new Date();
            const feedbackDate = new Date(f.created_at);
            return feedbackDate.toDateString() === today.toDateString();
        }).length;
        
        const totalRating = this.feedbacks.reduce((sum, f) => sum + f.rating, 0);
        const averageRating = total > 0 ? (totalRating / total).toFixed(1) : '0.0';
        
        document.getElementById('total-messages').textContent = total;
        document.getElementById('unread-messages').textContent = unread;
        document.getElementById('average-rating').textContent = averageRating;
        document.getElementById('today-messages').textContent = today;
    }
    
    filterFeedbacks() {
        let filtered = [...this.feedbacks];
        
        // Filtro por rating
        if (this.currentFilter !== 'todos') {
            const rating = parseInt(this.currentFilter);
            filtered = filtered.filter(f => f.rating === rating);
        }
        
        // Filtro por busca
        if (this.searchTerm) {
            filtered = filtered.filter(f => 
                f.username.toLowerCase().includes(this.searchTerm) ||
                f.title.toLowerCase().includes(this.searchTerm) ||
                f.message.toLowerCase().includes(this.searchTerm)
            );
        }
        
        this.filteredFeedbacks = filtered;
        this.renderFeedbacks();
        this.updateFeedbacksCount();
    }
    
    updateFeedbacksCount() {
        const header = document.querySelector('.feedbacks-header h2');
        header.innerHTML = `<i class="fas fa-comment-dots"></i> Feedbacks (${this.filteredFeedbacks.length})`;
    }
    
    renderFeedbacks() {
        const container = document.getElementById('feedbacks-list');
        
        if (this.filteredFeedbacks.length === 0) {
            container.innerHTML = `
                <div class="no-feedbacks">
                    <i class="fas fa-comment-dots"></i>
                    <p>Nenhum feedback encontrado</p>
                    <small>Tente alterar os filtros de busca</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.filteredFeedbacks.map(feedback => this.renderFeedbackItem(feedback)).join('');
        
        // Bind eventos dos itens
        this.bindFeedbackEvents();
    }
    
    renderFeedbackItem(feedback) {
        const date = new Date(feedback.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const time = new Date(feedback.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const stars = this.renderStars(feedback.rating);
        const preview = feedback.message.length > 100 ? 
            feedback.message.substring(0, 100) + '...' : 
            feedback.message;
        
        return `
            <div class="feedback-item ${this.selectedFeedback?.id === feedback.id ? 'selected' : ''}" 
                 data-id="${feedback.id}">
                <div class="feedback-info">
                    <div class="feedback-user">
                        <i class="fas fa-user-circle"></i>
                        ${this.escapeHTML(feedback.username)}
                    </div>
                    <div class="feedback-rating">
                        <div class="stars">${stars}</div>
                        <span class="rating-text">${feedback.rating}/5</span>
                    </div>
                    <div class="feedback-preview">
                        ${this.escapeHTML(preview)}
                    </div>
                </div>
                <div class="feedback-meta">
                    <div class="feedback-date">${date}</div>
                    <div class="feedback-time">${time}</div>
                    <div class="feedback-actions">
                        <button class="feedback-btn delete-feedback-btn" data-id="${feedback.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star star"></i>';
            } else {
                stars += '<i class="fas fa-star star empty"></i>';
            }
        }
        return stars;
    }
    
    bindFeedbackEvents() {
        // Clique nos itens de feedback
        document.querySelectorAll('.feedback-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Não selecionar se clicou no botão de deletar
                if (e.target.closest('.delete-feedback-btn')) {
                    return;
                }
                
                const id = item.dataset.id;
                this.selectFeedback(id);
            });
        });
        
        // Botões de deletar
        document.querySelectorAll('.delete-feedback-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.showDeleteModal(id);
            });
        });
    }
    
    selectFeedback(id) {
        this.selectedFeedback = this.feedbacks.find(f => f.id === id);
        
        // Atualizar seleção visual
        document.querySelectorAll('.feedback-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-id="${id}"]`).classList.add('selected');
        
        // Renderizar detalhes
        this.renderFeedbackDetails();
        
        // Marcar como lido se não estava
        if (!this.selectedFeedback.is_read) {
            this.markAsRead(id);
        }
    }
    
    renderFeedbackDetails() {
        const container = document.getElementById('feedback-details');
        
        if (!this.selectedFeedback) {
            container.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-comment-dots"></i>
                    <p>Selecione um feedback para ver os detalhes</p>
                </div>
            `;
            return;
        }
        
        const feedback = this.selectedFeedback;
        const date = new Date(feedback.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const time = new Date(feedback.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const stars = this.renderStars(feedback.rating);
        const userInitial = feedback.username.charAt(0).toUpperCase();
        
        container.innerHTML = `
            <div class="feedback-detail">
                <div class="feedback-detail-header">
                    <div class="feedback-detail-user">
                        <div class="user-avatar">${userInitial}</div>
                        <div class="user-info">
                            <h3>${this.escapeHTML(feedback.username)}</h3>
                            <div class="user-meta">${date} às ${time}</div>
                        </div>
                    </div>
                    <div class="feedback-detail-rating">
                        <div class="stars">${stars}</div>
                        <div class="rating-text">Avaliação: ${feedback.rating}/5</div>
                    </div>
                </div>
                
                <div class="feedback-detail-content">
                    <h4>Mensagem:</h4>
                    <div class="feedback-message">
                        ${this.escapeHTML(feedback.message)}
                    </div>
                </div>
                
                <div class="feedback-detail-actions">
                    <button class="btn-danger" onclick="inboxManager.showDeleteModal('${feedback.id}')">
                        <i class="fas fa-trash"></i>
                        Excluir Feedback
                    </button>
                </div>
            </div>
        `;
    }
    
    async markAsRead(id) {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=markFeedbackAsRead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify({ id })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Atualizar localmente
                const feedback = this.feedbacks.find(f => f.id === id);
                if (feedback) {
                    feedback.is_read = true;
                    this.updateStats();
                }
            }
        } catch (error) {
            console.error('Erro ao marcar como lido:', error);
            // Atualizar localmente mesmo com erro
            const feedback = this.feedbacks.find(f => f.id === id);
            if (feedback) {
                feedback.is_read = true;
                this.updateStats();
            }
        }
    }
    
    showDeleteModal(id) {
        this.feedbackToDelete = id;
        const modal = document.getElementById('delete-modal');
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    
    closeDeleteModal() {
        const modal = document.getElementById('delete-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        this.feedbackToDelete = null;
    }
    
    async confirmDelete() {
        if (!this.feedbackToDelete) return;
        
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=deleteFeedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify({ id: this.feedbackToDelete })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Feedback excluído com sucesso!', 'success');
                
                // Remover da lista local
                this.feedbacks = this.feedbacks.filter(f => f.id !== this.feedbackToDelete);
                
                // Se era o selecionado, limpar seleção
                if (this.selectedFeedback?.id === this.feedbackToDelete) {
                    this.selectedFeedback = null;
                    this.renderFeedbackDetails();
                }
                
                this.updateStats();
                this.filterFeedbacks();
            } else {
                this.showNotification('Erro ao excluir feedback: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir feedback:', error);
            this.showNotification('Erro de conexão ao excluir feedback', 'error');
        }
        
        this.closeDeleteModal();
    }
    
    handleTabChange(e) {
        const tab = e.target.closest('.nav-tab');
        const tabType = tab.dataset.tab;
        
        // Atualizar UI das abas
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Por enquanto, apenas feedbacks está implementado
        if (tabType !== 'feedbacks') {
            this.showNotification('Esta seção ainda não foi implementada', 'info');
            // Voltar para feedbacks
            setTimeout(() => {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tab="feedbacks"]').classList.add('active');
            }, 2000);
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
let inboxManager;
document.addEventListener('DOMContentLoaded', function() {
    inboxManager = new InboxManager();
});

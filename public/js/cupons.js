// Sistema de Gerenciamento de Cupons
class CouponsManager {
    constructor() {
        this.coupons = [];
        this.filteredCoupons = [];
        this.currentFilter = 'all';
        this.stats = {
            total: 0,
            active: 0,
            used: 0,
            expired: 0,
            total_credits: 0
        };
        
        this.init();
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
    
    init() {
        this.bindEvents();
        this.loadCoupons();
    }
    
    bindEvents() {
        // Formulário de criação
        const createForm = document.getElementById('create-coupon-form');
        createForm.addEventListener('submit', (e) => this.handleCreateCoupons(e));
        
        // Filtros
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleFilterChange(e));
        });
        
        // Ações em lote
        document.getElementById('copy-all-btn').addEventListener('click', () => this.copyAllActiveCoupons());
        document.getElementById('delete-all-btn').addEventListener('click', () => this.deleteAllCoupons());
        
        // Modal
        document.getElementById('close-codes-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('close-modal-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('copy-codes-btn').addEventListener('click', () => this.copyGeneratedCodes());
        
        // Fechar modal ao clicar fora
        document.getElementById('codes-modal').addEventListener('click', (e) => {
            if (e.target.id === 'codes-modal') {
                this.closeModal();
            }
        });
    }
    
    async loadCoupons() {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=getCoupons', {
                headers: {
                    'Authorization': 'Bearer ' + sessionToken
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.coupons = data.coupons;
                this.stats = data.stats;
                this.updateStats();
                this.filterCoupons();
            } else {
                this.showNotification('Erro ao carregar cupons: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar cupons:', error);
            this.showNotification('Erro de conexão ao carregar cupons', 'error');
        }
    }
    
    updateStats() {
        document.getElementById('total-cupons').textContent = this.stats.total;
        document.getElementById('cupons-ativos').textContent = this.stats.active;
        document.getElementById('cupons-usados').textContent = this.stats.used;
        document.getElementById('cupons-expirados').textContent = this.stats.expired;
        document.getElementById('total-creditos').textContent = this.stats.total_credits.toLocaleString();
        
        // Atualizar contadores dos filtros
        document.getElementById('filter-all-count').textContent = this.stats.total;
        document.getElementById('filter-active-count').textContent = this.stats.active;
        document.getElementById('filter-used-count').textContent = this.stats.used;
        document.getElementById('filter-expired-count').textContent = this.stats.expired;
    }
    
    filterCoupons() {
        if (this.currentFilter === 'all') {
            this.filteredCoupons = [...this.coupons];
        } else {
            this.filteredCoupons = this.coupons.filter(coupon => coupon.status === this.currentFilter);
        }
        
        this.renderCoupons();
        this.updateCouponsCount();
    }
    
    updateCouponsCount() {
        document.getElementById('coupons-count').textContent = this.filteredCoupons.length;
    }
    
    renderCoupons() {
        const container = document.getElementById('coupons-list');
        
        if (this.filteredCoupons.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <p>Nenhum cupom encontrado</p>
                    <small>Tente alterar o filtro ou criar novos cupons</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.filteredCoupons.map(coupon => this.renderCouponItem(coupon)).join('');
        
        // Bind eventos dos botões
        this.bindCouponEvents();
    }
    
    renderCouponItem(coupon) {
        const createdDate = new Date(coupon.created_at).toLocaleDateString('pt-BR');
        const expiresDate = coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('pt-BR') : 'Nunca';
        const usedDate = coupon.used_at ? new Date(coupon.used_at).toLocaleDateString('pt-BR') : null;
        
        let statusInfo = '';
        if (coupon.status === 'used') {
            const usedInfo = usedDate ? ` em ${usedDate}` : '';
            statusInfo = `Usado por: ${this.escapeHTML(coupon.used_by_username) || 'N/A'}${usedInfo}`;
        } else if (coupon.status === 'expired') {
            statusInfo = `Expirado em: ${expiresDate}`;
        } else {
            statusInfo = `Expira em: ${expiresDate}`;
        }
        
        return `
            <div class="coupon-item ${coupon.status}" data-id="${this.escapeHTML(coupon.id)}">
                <div class="coupon-info">
                    <div class="coupon-code">${this.escapeHTML(coupon.code)}</div>
                    <div class="coupon-details">
                        <span><i class="fas fa-coins"></i> ${coupon.credits} créditos</span>
                        <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                        <span><i class="fas fa-info-circle"></i> ${statusInfo}</span>
                    </div>
                </div>
                <div class="coupon-actions">
                    ${coupon.status === 'active' ? `
                        <button class="coupon-btn copy-btn" data-code="${this.escapeHTML(coupon.code)}">
                            <i class="fas fa-copy"></i>
                            Copiar
                        </button>
                    ` : ''}
                    ${coupon.status !== 'used' ? `
                        <button class="coupon-btn danger delete-btn" data-id="${this.escapeHTML(coupon.id)}">
                            <i class="fas fa-trash"></i>
                            Apagar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    bindCouponEvents() {
        // Botões de copiar
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const code = e.currentTarget.dataset.code;
                const coupon = this.coupons.find(c => c.code === code);
                if (coupon) {
                    const formattedText = this.formatCouponForCopy(coupon);
                    this.copyToClipboard(formattedText);
                    this.showCopySuccessModal(coupon);
                } else {
                    this.copyToClipboard(code);
                    this.showNotification(`Código ${code} copiado!`, 'success');
                }
            });
        });
        
        // Botões de deletar
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.deleteCoupon(id);
            });
        });
    }
    
    handleFilterChange(e) {
        const filter = e.target.dataset.filter;
        
        // Atualizar UI dos filtros
        document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');
        
        // Aplicar filtro
        this.currentFilter = filter;
        this.filterCoupons();
    }
    
    async handleCreateCoupons(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            credits: parseInt(formData.get('credits')),
            quantity: parseInt(formData.get('quantity')),
            validity_days: parseInt(formData.get('validity'))
        };
        
        // Validações
        if (data.credits <= 0 || data.credits > 10000) {
            this.showNotification('Quantidade de créditos deve ser entre 1 e 10.000', 'error');
            return;
        }
        
        if (data.quantity <= 0 || data.quantity > 100) {
            this.showNotification('Quantidade de cupons deve ser entre 1 e 100', 'error');
            return;
        }
        
        if (data.validity_days <= 0 || data.validity_days > 365) {
            this.showNotification('Validade deve ser entre 1 e 365 dias', 'error');
            return;
        }
        
        const submitBtn = e.target.querySelector('.create-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
        submitBtn.disabled = true;
        
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=createCoupons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.showGeneratedCodes(result.codes);
                this.loadCoupons(); // Recarregar lista
                e.target.reset(); // Limpar formulário
            } else {
                this.showNotification('Erro ao criar cupons: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao criar cupons:', error);
            this.showNotification('Erro de conexão ao criar cupons', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    async deleteCoupon(id) {
        if (!confirm('Tem certeza que deseja deletar este cupom?')) {
            return;
        }
        
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=deleteCoupon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify({ id })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.loadCoupons(); // Recarregar lista
            } else {
                this.showNotification('Erro ao deletar cupom: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar cupom:', error);
            this.showNotification('Erro de conexão ao deletar cupom', 'error');
        }
    }
    
    copyAllActiveCoupons() {
        const activeCoupons = this.coupons.filter(coupon => coupon.status === 'active');
        
        if (activeCoupons.length === 0) {
            this.showNotification('Nenhum cupom ativo para copiar', 'warning');
            return;
        }
        
        const codes = activeCoupons.map(coupon => coupon.code).join('\n');
        this.copyToClipboard(codes);
        this.showNotification(`${activeCoupons.length} códigos ativos copiados!`, 'success');
    }
    
    async deleteAllCoupons() {
        const unusedCoupons = this.coupons.filter(coupon => coupon.status !== 'used');
        
        if (unusedCoupons.length === 0) {
            this.showNotification('Nenhum cupom disponível para deletar', 'warning');
            return;
        }
        
        if (!confirm(`Tem certeza que deseja deletar ${unusedCoupons.length} cupons não utilizados?`)) {
            return;
        }
        
        let deleted = 0;
        let errors = 0;
        
        const sessionToken = this.getCookie('session_token');
        
        for (const coupon of unusedCoupons) {
            try {
                const response = await fetch('../backend/api.php?action=deleteCoupon', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionToken
                    },
                    body: JSON.stringify({ id: coupon.id })
                });
                
                const result = await response.json();
                if (result.success) {
                    deleted++;
                } else {
                    errors++;
                }
            } catch (error) {
                errors++;
            }
        }
        
        if (deleted > 0) {
            this.showNotification(`${deleted} cupons deletados com sucesso!`, 'success');
            this.loadCoupons();
        }
        
        if (errors > 0) {
            this.showNotification(`${errors} cupons não puderam ser deletados`, 'warning');
        }
    }
    
    showGeneratedCodes(codes) {
        const modal = document.getElementById('codes-modal');
        const codesList = document.getElementById('generated-codes');
        
        codesList.innerHTML = codes.map(code => `
            <div class="code-item">${code}</div>
        `).join('');
        
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Armazenar códigos para copiar
        this.generatedCodes = codes;
    }
    
    copyGeneratedCodes() {
        if (this.generatedCodes && this.generatedCodes.length > 0) {
            const codes = this.generatedCodes.join('\n');
            this.copyToClipboard(codes);
            this.showNotification(`${this.generatedCodes.length} códigos copiados!`, 'success');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('codes-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    formatCouponForCopy(coupon) {
        const createdDate = new Date(coupon.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
        });
        const createdTime = new Date(coupon.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const expiresDate = coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : 'Nunca';
        const expiresTime = coupon.expires_at ? new Date(coupon.expires_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        
        const statusEmoji = coupon.status === 'active' ? '✅ ATIVO' : 
                           coupon.status === 'used' ? '❌ USADO' : 
                           '⏰ EXPIRADO';
        
        return `🎫 CUPOM: ${coupon.code}
💰 VALOR: ${coupon.credits} créditos
📅 CRIADO: ${createdDate}, ${createdTime}
⏰ EXPIRA: ${expiresDate}${expiresTime ? ', ' + expiresTime : ''}
${statusEmoji}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 SITE: dyvilcenter.online`;
    }
    
    showCopySuccessModal(coupon) {
        // Criar modal de sucesso
        const modal = document.createElement('div');
        modal.className = 'copy-success-modal';
        modal.innerHTML = `
            <div class="copy-success-content">
                <div class="copy-success-header">
                    <i class="fas fa-check-circle"></i>
                    <h3>Cupom Copiado com Sucesso!</h3>
                </div>
                <div class="copy-success-body">
                    <div class="coupon-preview">
                        <div class="coupon-code-display">${coupon.code}</div>
                        <div class="coupon-info-display">
                            <span><i class="fas fa-coins"></i> ${coupon.credits} créditos</span>
                            <span><i class="fas fa-calendar"></i> ${coupon.status === 'active' ? 'Ativo' : coupon.status === 'used' ? 'Usado' : 'Expirado'}</span>
                        </div>
                    </div>
                    <p>O cupom foi copiado para sua área de transferência com todas as informações formatadas!</p>
                </div>
                <div class="copy-success-actions">
                    <button class="btn-primary close-copy-modal">
                        <i class="fas fa-check"></i>
                        Entendi
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar estilos
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            animation: fadeIn 0.3s ease;
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(modal);
        
        // Evento de fechar
        const closeBtn = modal.querySelector('.close-copy-modal');
        closeBtn.addEventListener('click', () => {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        });
        
        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeBtn.click();
            }
        });
        
        // Auto-fechar após 4 segundos
        setTimeout(() => {
            if (modal.parentNode) {
                closeBtn.click();
            }
        }, 4000);
    }
    
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        } else {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
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
document.addEventListener('DOMContentLoaded', function() {
    new CouponsManager();
});

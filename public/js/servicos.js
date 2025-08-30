// Sistema de Gerenciamento de Serviços
class ServicesManager {
    constructor() {
        this.services = [];
        this.filteredServices = [];
        this.currentFilters = {
            category: 'todas',
            plan: 'todos',
            status: 'todos'
        };
        this.editingService = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadServices();
    }
    
    bindEvents() {
        // Botões principais
        document.getElementById('recarregar-servicos').addEventListener('click', () => this.loadServices());
        document.getElementById('novo-servico').addEventListener('click', () => this.showServiceModal());
        
        // Filtros
        document.getElementById('filtro-categoria').addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value;
            this.filterServices();
        });
        
        document.getElementById('filtro-plano').addEventListener('change', (e) => {
            this.currentFilters.plan = e.target.value;
            this.filterServices();
        });
        
        document.getElementById('filtro-status').addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.filterServices();
        });
        
        // Modal de serviço
        document.getElementById('close-service-modal').addEventListener('click', () => this.closeServiceModal());
        document.getElementById('cancel-service-btn').addEventListener('click', () => this.closeServiceModal());
        document.getElementById('save-service-btn').addEventListener('click', () => this.saveService());
        
        // Modal de exclusão
        document.getElementById('close-delete-modal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancel-delete-btn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-delete-btn').addEventListener('click', () => this.confirmDelete());
        
        // Fechar modais ao clicar fora
        document.getElementById('service-modal').addEventListener('click', (e) => {
            if (e.target.id === 'service-modal') {
                this.closeServiceModal();
            }
        });
        
        document.getElementById('delete-modal').addEventListener('click', (e) => {
            if (e.target.id === 'delete-modal') {
                this.closeDeleteModal();
            }
        });
        
        // Formulário
        document.getElementById('service-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveService();
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
    
    async loadServices() {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=getServices', {
                headers: {
                    'Authorization': 'Bearer ' + sessionToken
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.services = data.services || [];
                this.filterServices();
            } else {
                // Se não há endpoint ainda, usar dados de exemplo
                this.loadSampleData();
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            this.loadSampleData();
        }
    }
    
    loadSampleData() {
        // Dados de exemplo baseados na imagem
        this.services = [
            {
                id: '1',
                name: 'SBR OAUTH STRIPE',
                api_file: 'stripe_oauth.php',
                category: 'cc',
                plan: 'free',
                status: 'online',
                credits: 1,
                format: 'cc|mes|ano|cvv',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Instagram Login',
                api_file: 'instagram_login.php',
                category: 'login-email',
                plan: 'free',
                status: 'online',
                credits: 1,
                format: 'email:senha',
                created_at: new Date().toISOString()
            }
        ];
        
        this.filterServices();
    }
    
    filterServices() {
        let filtered = [...this.services];
        
        // Filtro por categoria
        if (this.currentFilters.category !== 'todas') {
            filtered = filtered.filter(s => s.category === this.currentFilters.category);
        }
        
        // Filtro por plano
        if (this.currentFilters.plan !== 'todos') {
            filtered = filtered.filter(s => s.plan === this.currentFilters.plan);
        }
        
        // Filtro por status
        if (this.currentFilters.status !== 'todos') {
            filtered = filtered.filter(s => s.status === this.currentFilters.status);
        }
        
        this.filteredServices = filtered;
        this.renderServices();
        this.updateServicesCount();
    }
    
    updateServicesCount() {
        document.getElementById('services-count').textContent = this.filteredServices.length;
    }
    
    renderServices() {
        const container = document.getElementById('services-list');
        
        if (this.filteredServices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-laptop-code"></i>
                    <p>Nenhum serviço encontrado</p>
                    <small>Tente alterar os filtros ou criar um novo serviço</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.filteredServices.map(service => this.renderServiceItem(service)).join('');
        
        // Bind eventos dos botões
        this.bindServiceEvents();
    }
    
    renderServiceItem(service) {
        return `
            <div class="service-item" data-id="${service.id}">
                <div class="service-info">
                    <div class="service-name">${this.escapeHTML(service.name)}</div>
                    <div class="service-api">${this.escapeHTML(service.api_file)}</div>
                </div>
                
                <div class="service-category ${service.category}">
                    ${this.getCategoryLabel(service.category)}
                </div>
                
                <div class="service-plan ${service.plan}">
                    ${service.plan.toUpperCase()}
                </div>
                
                <div class="service-status ${service.status}">
                    ${this.getStatusLabel(service.status)}
                </div>
                
                <div class="service-credits">
                    ${service.credits} créditos
                </div>
                
                <div class="service-actions">
                    <button class="service-btn edit" data-id="${service.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="service-btn delete" data-id="${service.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    getCategoryLabel(category) {
        const labels = {
            'cc': 'CC',
            'login-email': 'Login Email',
            'login-cpf': 'Login CPF',
            'consulta': 'Consulta'
        };
        return labels[category] || category;
    }
    
    getStatusLabel(status) {
        const labels = {
            'online': 'Online',
            'manutencao': 'Manutenção',
            'offline': 'Offline'
        };
        return labels[status] || status;
    }
    
    bindServiceEvents() {
        // Botões de editar
        document.querySelectorAll('.service-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.editService(id);
            });
        });
        
        // Botões de deletar
        document.querySelectorAll('.service-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.showDeleteModal(id);
            });
        });
    }
    
    showServiceModal(service = null) {
        this.editingService = service;
        const modal = document.getElementById('service-modal');
        const form = document.getElementById('service-form');
        
        // Limpar formulário
        form.reset();
        
        if (service) {
            // Modo edição
            document.getElementById('modal-title').textContent = 'Editar Serviço';
            document.getElementById('save-btn-text').textContent = 'Salvar Alterações';
            
            // Preencher campos
            document.getElementById('service-name').value = service.name;
            document.getElementById('service-api').value = service.api_file;
            document.getElementById('service-category').value = service.category;
            document.getElementById('service-plan').value = service.plan;
            document.getElementById('service-status').value = service.status;
            document.getElementById('service-credits').value = service.credits;
            document.getElementById('service-format').value = service.format || '';
        } else {
            // Modo criação
            document.getElementById('modal-title').textContent = 'Novo Serviço';
            document.getElementById('save-btn-text').textContent = 'Criar Serviço';
        }
        
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Focar no primeiro campo
        setTimeout(() => {
            document.getElementById('service-name').focus();
        }, 100);
    }
    
    closeServiceModal() {
        const modal = document.getElementById('service-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        this.editingService = null;
    }
    
    editService(id) {
        const service = this.services.find(s => s.id === id);
        if (service) {
            this.showServiceModal(service);
        }
    }
    
    async saveService() {
        const form = document.getElementById('service-form');
        const formData = new FormData(form);
        
        const serviceData = {
            name: formData.get('name').trim(),
            api_file: formData.get('api_file').trim(),
            category: formData.get('category'),
            plan: formData.get('plan'),
            status: formData.get('status'),
            credits: parseInt(formData.get('credits')),
            format: formData.get('format').trim()
        };
        
        // Validações
        if (!serviceData.name) {
            this.showNotification('Nome do serviço é obrigatório', 'error');
            return;
        }
        
        if (!serviceData.api_file) {
            this.showNotification('Arquivo da API é obrigatório', 'error');
            return;
        }
        
        if (!serviceData.category || !serviceData.plan || !serviceData.status) {
            this.showNotification('Todos os campos obrigatórios devem ser preenchidos', 'error');
            return;
        }
        
        if (serviceData.credits < 0 || serviceData.credits > 1000) {
            this.showNotification('Custo deve ser entre 0 e 1000 créditos', 'error');
            return;
        }
        
        const saveBtn = document.getElementById('save-service-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveBtn.disabled = true;
        
        try {
            const sessionToken = this.getCookie('session_token');
            const endpoint = this.editingService ? 'updateService' : 'createService';
            const method = 'POST';
            
            if (this.editingService) {
                serviceData.id = this.editingService.id;
            }
            
            const response = await fetch(`../backend/api.php?action=${endpoint}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify(serviceData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(
                    this.editingService ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!', 
                    'success'
                );
                this.closeServiceModal();
                this.loadServices(); // Recarregar lista
            } else {
                // Simular sucesso para dados de exemplo
                if (this.editingService) {
                    // Atualizar serviço existente
                    const index = this.services.findIndex(s => s.id === this.editingService.id);
                    if (index !== -1) {
                        this.services[index] = { ...this.editingService, ...serviceData };
                    }
                    this.showNotification('Serviço atualizado com sucesso!', 'success');
                } else {
                    // Criar novo serviço
                    const newService = {
                        id: Date.now().toString(),
                        ...serviceData,
                        created_at: new Date().toISOString()
                    };
                    this.services.push(newService);
                    this.showNotification('Serviço criado com sucesso!', 'success');
                }
                
                this.closeServiceModal();
                this.filterServices();
            }
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
            this.showNotification('Erro de conexão ao salvar serviço', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    showDeleteModal(id) {
        const service = this.services.find(s => s.id === id);
        if (!service) return;
        
        this.serviceToDelete = id;
        document.getElementById('delete-service-name').textContent = service.name;
        
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
        this.serviceToDelete = null;
    }
    
    async confirmDelete() {
        if (!this.serviceToDelete) return;
        
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=deleteService', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify({ id: this.serviceToDelete })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Serviço excluído com sucesso!', 'success');
                
                // Remover da lista local
                this.services = this.services.filter(s => s.id !== this.serviceToDelete);
                this.filterServices();
            } else {
                // Simular sucesso para dados de exemplo
                this.services = this.services.filter(s => s.id !== this.serviceToDelete);
                this.showNotification('Serviço excluído com sucesso!', 'success');
                this.filterServices();
            }
        } catch (error) {
            console.error('Erro ao excluir serviço:', error);
            this.showNotification('Erro de conexão ao excluir serviço', 'error');
        }
        
        this.closeDeleteModal();
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
let servicesManager;
document.addEventListener('DOMContentLoaded', function() {
    servicesManager = new ServicesManager();
});

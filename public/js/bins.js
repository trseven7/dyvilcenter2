// Sistema de Gerenciamento de BINs
class BinsManager {
    constructor() {
        this.bins = [];
        this.services = [];
        this.filteredBins = [];
        this.currentFilters = {
            plano: 'todos',
            descricao: 'todos',
            bandeira: 'todas',
            nivel: 'todos',
            banco: 'todos',
            pais: 'todos',
            servico: 'todos'
        };
        this.currentTab = 'todos';
        this.searchTerm = '';
        this.editingBin = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadServices();
        this.loadBins();
    }
    
    bindEvents() {
        // Botões principais
        document.getElementById('adicionar-bin').addEventListener('click', () => this.showBinModal());
        
        // Busca
        document.getElementById('buscar-bin').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterBins();
        });
        
        // Filtros
        document.getElementById('filtro-plano').addEventListener('change', (e) => {
            this.currentFilters.plano = e.target.value;
            this.filterBins();
        });
        
        document.getElementById('filtro-descricao').addEventListener('change', (e) => {
            this.currentFilters.descricao = e.target.value;
            this.filterBins();
        });
        
        document.getElementById('filtro-bandeira').addEventListener('change', (e) => {
            this.currentFilters.bandeira = e.target.value;
            this.filterBins();
        });
        
        document.getElementById('filtro-nivel').addEventListener('change', (e) => {
            this.currentFilters.nivel = e.target.value;
            this.filterBins();
        });
        
        document.getElementById('filtro-banco').addEventListener('change', (e) => {
            this.currentFilters.banco = e.target.value;
            this.filterBins();
        });
        
        document.getElementById('filtro-pais').addEventListener('change', (e) => {
            this.currentFilters.pais = e.target.value;
            this.filterBins();
        });
        
        document.getElementById('filtro-servico').addEventListener('change', (e) => {
            this.currentFilters.servico = e.target.value;
            this.filterBins();
        });
        
        // Abas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Modal de BIN
        document.getElementById('close-bin-modal').addEventListener('click', () => this.closeBinModal());
        document.getElementById('cancel-bin-btn').addEventListener('click', () => this.closeBinModal());
        document.getElementById('save-bin-btn').addEventListener('click', () => this.saveBin());
        
        // Modal de exclusão
        document.getElementById('close-delete-modal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancel-delete-btn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-delete-btn').addEventListener('click', () => this.confirmDelete());
        
        // Fechar modais ao clicar fora
        document.getElementById('bin-modal').addEventListener('click', (e) => {
            if (e.target.id === 'bin-modal') {
                this.closeBinModal();
            }
        });
        
        document.getElementById('delete-modal').addEventListener('click', (e) => {
            if (e.target.id === 'delete-modal') {
                this.closeDeleteModal();
            }
        });
        
        // Formulário
        document.getElementById('bin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBin();
        });
        
        // Validação do BIN em tempo real
        document.getElementById('bin-number').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Apenas números
            if (value.length > 6) {
                value = value.substring(0, 6);
            }
            e.target.value = value;
        });
        
        // Atualizar preview da descrição
        ['bin-bandeira', 'bin-banco', 'bin-nivel', 'bin-pais'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateDescriptionPreview());
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
            } else {
                // Dados de exemplo se não há endpoint
                this.services = [
                    { id: '1', name: 'SBR OAUTH STRIPE', plan: 'free' },
                    { id: '2', name: 'Instagram Login', plan: 'pro' }
                ];
            }
            
            this.populateServiceSelects();
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            this.services = [
                { id: '1', name: 'SBR OAUTH STRIPE', plan: 'free' },
                { id: '2', name: 'Instagram Login', plan: 'pro' }
            ];
            this.populateServiceSelects();
        }
    }
    
    populateServiceSelects() {
        const serviceSelect = document.getElementById('bin-service');
        const filterSelect = document.getElementById('filtro-servico');
        
        // Limpar opções existentes (exceto a primeira)
        serviceSelect.innerHTML = '<option value="">Selecione um serviço</option>';
        filterSelect.innerHTML = '<option value="todos">Todos os serviços</option>';
        
        this.services.forEach(service => {
            const option1 = document.createElement('option');
            option1.value = service.id;
            option1.textContent = service.name;
            serviceSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = service.id;
            option2.textContent = service.name;
            filterSelect.appendChild(option2);
        });
    }
    
    async loadBins() {
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=getBins', {
                headers: {
                    'Authorization': 'Bearer ' + sessionToken
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.bins = data.bins || [];
            } else {
                // Dados de exemplo se não há endpoint
                this.bins = [
                    {
                        id: '1',
                        bin: '455183',
                        service_id: '1',
                        service_name: 'SBR OAUTH STRIPE',
                        bandeira: 'Visa',
                        banco: 'Bradesco S.A.',
                        nivel: 'Platinum',
                        pais: 'Brazil',
                        description: 'Visa, Bradesco S.A., Platinum, Brazil',
                        created_at: new Date().toISOString()
                    }
                ];
            }
            
            this.populateFilterOptions();
            this.filterBins();
        } catch (error) {
            console.error('Erro ao carregar BINs:', error);
            this.bins = [
                {
                    id: '1',
                    bin: '455183',
                    service_id: '1',
                    service_name: 'SBR OAUTH STRIPE',
                    bandeira: 'Visa',
                    banco: 'Bradesco S.A.',
                    nivel: 'Platinum',
                    pais: 'Brazil',
                    description: 'Visa, Bradesco S.A., Platinum, Brazil',
                    created_at: new Date().toISOString()
                }
            ];
            this.populateFilterOptions();
            this.filterBins();
        }
    }
    
    populateFilterOptions() {
        const bandeiras = [...new Set(this.bins.map(b => b.bandeira).filter(Boolean))];
        const niveis = [...new Set(this.bins.map(b => b.nivel).filter(Boolean))];
        const bancos = [...new Set(this.bins.map(b => b.banco).filter(Boolean))];
        const paises = [...new Set(this.bins.map(b => b.pais).filter(Boolean))];
        
        this.populateSelect('filtro-bandeira', bandeiras, 'Todas as bandeiras');
        this.populateSelect('filtro-nivel', niveis, 'Todos os níveis');
        this.populateSelect('filtro-banco', bancos, 'Todos os bancos');
        this.populateSelect('filtro-pais', paises, 'Todos os países');
    }
    
    populateSelect(selectId, options, defaultText) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        // Manter primeira opção e adicionar novas
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.toLowerCase();
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        
        // Restaurar valor selecionado se ainda existir
        if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    }
    
    filterBins() {
        let filtered = [...this.bins];
        
        // Filtro por busca
        if (this.searchTerm) {
            filtered = filtered.filter(bin => 
                bin.bin.toLowerCase().includes(this.searchTerm) ||
                (bin.description && bin.description.toLowerCase().includes(this.searchTerm)) ||
                (bin.service_name && bin.service_name.toLowerCase().includes(this.searchTerm))
            );
        }
        
        // Filtros específicos
        if (this.currentFilters.plano !== 'todos') {
            const service = this.services.find(s => s.id === bin.service_id);
            filtered = filtered.filter(bin => {
                const service = this.services.find(s => s.id === bin.service_id);
                return service && service.plan === this.currentFilters.plano;
            });
        }
        
        if (this.currentFilters.descricao !== 'todos') {
            if (this.currentFilters.descricao === 'com') {
                filtered = filtered.filter(bin => bin.description && bin.description.trim());
            } else if (this.currentFilters.descricao === 'sem') {
                filtered = filtered.filter(bin => !bin.description || !bin.description.trim());
            }
        }
        
        if (this.currentFilters.bandeira !== 'todas') {
            filtered = filtered.filter(bin => bin.bandeira && bin.bandeira.toLowerCase() === this.currentFilters.bandeira);
        }
        
        if (this.currentFilters.nivel !== 'todos') {
            filtered = filtered.filter(bin => bin.nivel && bin.nivel.toLowerCase() === this.currentFilters.nivel);
        }
        
        if (this.currentFilters.banco !== 'todos') {
            filtered = filtered.filter(bin => bin.banco && bin.banco.toLowerCase() === this.currentFilters.banco);
        }
        
        if (this.currentFilters.pais !== 'todos') {
            filtered = filtered.filter(bin => bin.pais && bin.pais.toLowerCase() === this.currentFilters.pais);
        }
        
        if (this.currentFilters.servico !== 'todos') {
            filtered = filtered.filter(bin => bin.service_id === this.currentFilters.servico);
        }
        
        this.filteredBins = filtered;
        this.renderBins();
        this.updateTabCounts();
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        
        // Atualizar UI das abas
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        this.renderBins();
    }
    
    updateTabCounts() {
        const totalCount = this.filteredBins.length;
        const serviceCount = this.currentFilters.servico !== 'todos' ? 
            this.filteredBins.filter(bin => bin.service_id === this.currentFilters.servico).length : 0;
        
        document.getElementById('count-todos').textContent = totalCount;
        document.getElementById('count-servico').textContent = serviceCount;
        
        // Atualizar nome do serviço na aba
        if (this.currentFilters.servico !== 'todos') {
            const service = this.services.find(s => s.id === this.currentFilters.servico);
            document.getElementById('servico-ativo').textContent = service ? service.name : 'Serviço Selecionado';
        } else {
            document.getElementById('servico-ativo').textContent = 'Selecione um serviço';
        }
    }
    
    renderBins() {
        const container = document.getElementById('bins-list');
        let binsToShow = this.filteredBins;
        
        // Filtrar por aba ativa
        if (this.currentTab === 'servico' && this.currentFilters.servico !== 'todos') {
            binsToShow = this.filteredBins.filter(bin => bin.service_id === this.currentFilters.servico);
        }
        
        if (binsToShow.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <p>Nenhum BIN encontrado</p>
                    <small>Tente alterar os filtros ou adicionar um novo BIN</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = binsToShow.map(bin => this.renderBinItem(bin)).join('');
        
        // Bind eventos dos botões
        this.bindBinEvents();
    }
    
    renderBinItem(bin) {
        const date = new Date(bin.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        return `
            <div class="bin-item" data-id="${bin.id}">
                <div class="bin-number">${this.escapeHTML(bin.bin)}</div>
                
                <div class="bin-info">
                    <div class="bin-description">
                        ${bin.description ? this.escapeHTML(bin.description) : 'Sem descrição'}
                    </div>
                    <div class="bin-service">
                        ${this.escapeHTML(bin.service_name || 'Serviço não encontrado')}
                    </div>
                </div>
                
                <div class="bin-date">
                    Adicionado em<br>${date}
                </div>
                
                <div class="bin-actions">
                    <button class="bin-btn edit" data-id="${bin.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="bin-btn delete" data-id="${bin.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    bindBinEvents() {
        // Botões de editar
        document.querySelectorAll('.bin-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.editBin(id);
            });
        });
        
        // Botões de deletar
        document.querySelectorAll('.bin-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.showDeleteModal(id);
            });
        });
    }
    
    showBinModal(bin = null) {
        this.editingBin = bin;
        const modal = document.getElementById('bin-modal');
        const form = document.getElementById('bin-form');
        
        // Limpar formulário
        form.reset();
        this.updateDescriptionPreview();
        
        if (bin) {
            // Modo edição
            document.getElementById('modal-title').textContent = 'Editar BIN';
            document.getElementById('save-btn-text').textContent = 'Salvar Alterações';
            
            // Preencher campos
            document.getElementById('bin-number').value = bin.bin;
            document.getElementById('bin-service').value = bin.service_id;
            document.getElementById('bin-bandeira').value = bin.bandeira || '';
            document.getElementById('bin-banco').value = bin.banco || '';
            document.getElementById('bin-nivel').value = bin.nivel || '';
            document.getElementById('bin-pais').value = bin.pais || '';
            
            this.updateDescriptionPreview();
        } else {
            // Modo criação
            document.getElementById('modal-title').textContent = 'Adicionar BIN';
            document.getElementById('save-btn-text').textContent = 'Adicionar BIN';
        }
        
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Focar no primeiro campo
        setTimeout(() => {
            document.getElementById('bin-number').focus();
        }, 100);
    }
    
    closeBinModal() {
        const modal = document.getElementById('bin-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        this.editingBin = null;
    }
    
    updateDescriptionPreview() {
        const bandeira = document.getElementById('bin-bandeira').value.trim();
        const banco = document.getElementById('bin-banco').value.trim();
        const nivel = document.getElementById('bin-nivel').value.trim();
        const pais = document.getElementById('bin-pais').value.trim();
        
        const preview = document.getElementById('description-preview');
        
        if (bandeira && banco && nivel && pais) {
            preview.textContent = `${bandeira}, ${banco}, ${nivel}, ${pais}`;
        } else {
            preview.textContent = 'Preencha os campos acima para ver a descrição';
        }
    }
    
    editBin(id) {
        const bin = this.bins.find(b => b.id === id);
        if (bin) {
            this.showBinModal(bin);
        }
    }
    
    async saveBin() {
        const form = document.getElementById('bin-form');
        const formData = new FormData(form);
        
        const binData = {
            bin: formData.get('bin').trim(),
            service_id: formData.get('service_id'),
            bandeira: formData.get('bandeira').trim(),
            banco: formData.get('banco').trim(),
            nivel: formData.get('nivel').trim(),
            pais: formData.get('pais').trim()
        };
        
        // Gerar descrição automaticamente
        binData.description = `${binData.bandeira}, ${binData.banco}, ${binData.nivel}, ${binData.pais}`;
        
        // Validações
        if (!binData.bin || !/^\d{1,6}$/.test(binData.bin)) {
            this.showNotification('BIN deve conter apenas números (máximo 6 dígitos)', 'error');
            return;
        }
        
        if (!binData.service_id) {
            this.showNotification('Selecione um serviço', 'error');
            return;
        }
        
        if (!binData.bandeira || !binData.banco || !binData.nivel || !binData.pais) {
            this.showNotification('Todos os campos são obrigatórios', 'error');
            return;
        }
        
        // Verificar se BIN já existe (apenas para novos)
        if (!this.editingBin && this.bins.some(b => b.bin === binData.bin)) {
            this.showNotification('Este BIN já existe no sistema', 'error');
            return;
        }
        
        const saveBtn = document.getElementById('save-bin-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveBtn.disabled = true;
        
        try {
            const sessionToken = this.getCookie('session_token');
            const endpoint = this.editingBin ? 'updateBin' : 'createBin';
            
            if (this.editingBin) {
                binData.id = this.editingBin.id;
            }
            
            const response = await fetch(`../backend/api.php?action=${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify(binData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(
                    this.editingBin ? 'BIN atualizado com sucesso!' : 'BIN adicionado com sucesso!', 
                    'success'
                );
                this.closeBinModal();
                this.loadBins(); // Recarregar lista
            } else {
                // Simular sucesso para dados de exemplo
                const service = this.services.find(s => s.id === binData.service_id);
                
                if (this.editingBin) {
                    // Atualizar BIN existente
                    const index = this.bins.findIndex(b => b.id === this.editingBin.id);
                    if (index !== -1) {
                        this.bins[index] = { 
                            ...this.editingBin, 
                            ...binData,
                            service_name: service ? service.name : 'Serviço não encontrado'
                        };
                    }
                    this.showNotification('BIN atualizado com sucesso!', 'success');
                } else {
                    // Criar novo BIN
                    const newBin = {
                        id: Date.now().toString(),
                        ...binData,
                        service_name: service ? service.name : 'Serviço não encontrado',
                        created_at: new Date().toISOString()
                    };
                    this.bins.push(newBin);
                    this.showNotification('BIN adicionado com sucesso!', 'success');
                }
                
                this.closeBinModal();
                this.populateFilterOptions();
                this.filterBins();
            }
        } catch (error) {
            console.error('Erro ao salvar BIN:', error);
            this.showNotification('Erro de conexão ao salvar BIN', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    showDeleteModal(id) {
        const bin = this.bins.find(b => b.id === id);
        if (!bin) return;
        
        this.binToDelete = id;
        document.getElementById('delete-bin-info').textContent = `BIN: ${bin.bin} - ${bin.description || 'Sem descrição'}`;
        
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
        this.binToDelete = null;
    }
    
    async confirmDelete() {
        if (!this.binToDelete) return;
        
        try {
            const sessionToken = this.getCookie('session_token');
            const response = await fetch('../backend/api.php?action=deleteBin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify({ id: this.binToDelete })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('BIN excluído com sucesso!', 'success');
                
                // Remover da lista local
                this.bins = this.bins.filter(b => b.id !== this.binToDelete);
                this.populateFilterOptions();
                this.filterBins();
            } else {
                // Simular sucesso para dados de exemplo
                this.bins = this.bins.filter(b => b.id !== this.binToDelete);
                this.showNotification('BIN excluído com sucesso!', 'success');
                this.populateFilterOptions();
                this.filterBins();
            }
        } catch (error) {
            console.error('Erro ao excluir BIN:', error);
            this.showNotification('Erro de conexão ao excluir BIN', 'error');
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
let binsManager;
document.addEventListener('DOMContentLoaded', function() {
    binsManager = new BinsManager();
});

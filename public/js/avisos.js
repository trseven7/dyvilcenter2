document.addEventListener('DOMContentLoaded', () => {
    // Função para escapar HTML e prevenir XSS
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    // Elementos DOM
    const loadingAvisos = document.getElementById('loading-avisos');
    const listaAvisosContainer = document.getElementById('lista-avisos-container');
    const semAvisos = document.getElementById('sem-avisos');
    const modalAviso = document.getElementById('modal-aviso');
    const btnCriarAviso = document.getElementById('btn-criar-aviso');
    const closeButton = document.querySelector('.close-button');
    const cancelarAviso = document.getElementById('cancelar-aviso');
    const formAviso = document.getElementById('form-aviso');
    
    // Filtros
    const filtrosBtns = document.querySelectorAll('.filtro-btn');
    const filtroCategoria = document.getElementById('filtro-categoria');
    
    // Estatísticas
    const totalAvisos = document.getElementById('total-avisos');
    const altaPrioridade = document.getElementById('alta-prioridade');
    const avisosFixados = document.getElementById('avisos-fixados');
    const totalViews = document.getElementById('total-views');
    
    // Estado da aplicação
    let avisos = [];
    let filtroAtivo = 'todos';
    let categoriaAtiva = 'todas';
    let avisosLidos = new Set();
    
    // Inicialização
    init();
    
    function init() {
        carregarAvisos();
        setupEventListeners();
        setupFiltros();
    }
    
    function setupEventListeners() {
        // Botão criar aviso
        btnCriarAviso?.addEventListener('click', () => {
            abrirModalCriar();
        });
        
        // Fechar modal
        closeButton?.addEventListener('click', fecharModal);
        cancelarAviso?.addEventListener('click', fecharModal);
        
        // Formulário
        formAviso?.addEventListener('submit', handleSubmitAviso);
        
        // Fechar modal ao clicar fora
        modalAviso?.addEventListener('click', (e) => {
            if (e.target === modalAviso) {
                fecharModal();
            }
        });
    }
    
    function setupFiltros() {
        // Botões de filtro
        filtrosBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filtro = btn.dataset.filtro;
                aplicarFiltro(filtro);
                
                // Atualizar estado ativo
                filtrosBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filtroAtivo = filtro;
            });
        });
        
        // Filtro de categoria
        filtroCategoria?.addEventListener('change', (e) => {
            categoriaAtiva = e.target.value;
            aplicarFiltros();
        });
    }
    
    async function carregarAvisos() {
        try {
            mostrarLoading(true);
            
            console.log('Carregando avisos...');
            
            // Fazer requisição para a API
            const response = await fetch('../backend/api.php?action=getAnnouncements');
            
            console.log('Resposta da API:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Dados recebidos:', data);
            
            if (data.success) {
                avisos = data.announcements || [];
                console.log('Avisos carregados:', avisos);
                
                await carregarAvisosLidos();
                atualizarEstatisticas();
                renderizarAvisos();
                
                if (avisos.length === 0) {
                    console.log('Nenhum aviso encontrado');
                }
            } else {
                console.error('Erro ao carregar avisos:', data.message);
                mostrarErro('Erro ao carregar avisos: ' + data.message);
            }
        } catch (error) {
            console.error('Erro ao carregar avisos:', error);
            mostrarErro('Erro de conexão: ' + error.message);
        } finally {
            mostrarLoading(false);
        }
    }
    
    async function carregarAvisosLidos() {
        try {
            // Buscar avisos lidos do localStorage ou fazer requisição para a API
            const lidos = localStorage.getItem('avisos_lidos');
            if (lidos) {
                avisosLidos = new Set(JSON.parse(lidos));
            }
        } catch (error) {
            console.error('Erro ao carregar avisos lidos:', error);
        }
    }
    
    function atualizarEstatisticas() {
        const total = avisos.length;
        const alta = avisos.filter(a => a.priority === 'high').length;
        const fixados = avisos.filter(a => a.pinned).length;
        const views = avisos.reduce((sum, a) => sum + (a.views || 0), 0);
        
        // Atualizar números principais
        totalAvisos.textContent = total;
        altaPrioridade.textContent = alta;
        avisosFixados.textContent = fixados;
        totalViews.textContent = views;
        
        // Atualizar estatísticas adicionais se existirem
        const hoje = new Date().toDateString();
        const avisosHoje = avisos.filter(a => {
            const dataAviso = new Date(a.created_at).toDateString();
            return dataAviso === hoje;
        }).length;
        
        const percentualAlta = total > 0 ? Math.round((alta / total) * 100) : 0;
        const mediaViews = total > 0 ? Math.round(views / total) : 0;
        
        // Atualizar elementos adicionais se existirem
        const avisosHojeElement = document.getElementById('avisos-hoje');
        const percentualAltaElement = document.getElementById('percentual-alta');
        const mediaViewsElement = document.getElementById('media-views');
        
        if (avisosHojeElement) avisosHojeElement.textContent = avisosHoje;
        if (percentualAltaElement) percentualAltaElement.textContent = `${percentualAlta}%`;
        if (mediaViewsElement) mediaViewsElement.textContent = mediaViews;
    }
    
    function renderizarAvisos() {
        const avisosFiltrados = getAvisosFiltrados();
        
        if (avisosFiltrados.length === 0) {
            listaAvisosContainer.style.display = 'none';
            semAvisos.style.display = 'block';
            return;
        }
        
        semAvisos.style.display = 'none';
        listaAvisosContainer.style.display = 'block';
        
        // Ordenar: fixados primeiro, depois por data de criação
        const avisosOrdenados = avisosFiltrados.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        listaAvisosContainer.innerHTML = avisosOrdenados.map(aviso => 
            criarElementoAviso(aviso)
        ).join('');
        
        // Adicionar event listeners para marcar como lido
        document.querySelectorAll('.aviso-item').forEach(item => {
            item.addEventListener('click', () => {
                const avisoId = item.dataset.avisoId;
                marcarComoLido(avisoId);
            });
        });
    }
    
    function getAvisosFiltrados() {
        return avisos.filter(aviso => {
            // Filtro por tipo
            if (filtroAtivo === 'fixados' && !aviso.pinned) return false;
            if (filtroAtivo === 'alta' && aviso.priority !== 'high') return false;
            if (filtroAtivo === 'media' && aviso.priority !== 'medium') return false;
            if (filtroAtivo === 'baixa' && aviso.priority !== 'low') return false;
            
            // Filtro por categoria
            if (categoriaAtiva !== 'todas' && aviso.category !== categoriaAtiva) return false;
            
            return true;
        });
    }
    
    function criarElementoAviso(aviso) {
        const isLido = avisosLidos.has(aviso.id);
        const isFixado = aviso.pinned;
        
        const classes = ['aviso-item'];
        if (isLido) classes.push('lido');
        if (isFixado) classes.push('fixado');
        
        const iconClass = getIconClass(aviso.category);
        const prioridadeClass = getPrioridadeClass(aviso.priority);
        const prioridadeText = getPrioridadeText(aviso.priority);
        const categoriaText = getCategoriaText(aviso.category);
        
        return `
            <div class="${classes.join(' ')}" data-aviso-id="${escapeHTML(aviso.id)}">
                <div class="aviso-header">
                    <div class="aviso-icon ${iconClass}">
                        <i class="${getIcon(aviso.category)}"></i>
                    </div>
                    <div class="aviso-content">
                        <h3 class="aviso-title">
                            ${escapeHTML(aviso.title)}
                            ${isFixado ? '<i class="fas fa-thumbtack fixado-icon"></i>' : ''}
                        </h3>
                        <p class="aviso-mensagem">${escapeHTML(aviso.message)}</p>
                        <div class="aviso-meta">
                            <span class="aviso-badge ${prioridadeClass}">${prioridadeText}</span>
                            <span class="aviso-badge categoria">${categoriaText}</span>
                            <span class="aviso-info">
                                <i class="fas fa-calendar"></i>
                                ${formatarData(aviso.created_at)}
                            </span>
                            <span class="aviso-info">
                                <i class="fas fa-eye"></i>
                                ${aviso.views || 0} visualizações
                            </span>
                        </div>
                    </div>
                    <div class="aviso-actions">
                        <button class="delete-aviso-btn" data-aviso-id="${escapeHTML(aviso.id)}" title="Excluir aviso">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    function bindDeleteEvents() {
        document.querySelectorAll('.delete-aviso-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const avisoId = btn.dataset.avisoId;
                confirmarExclusao(avisoId);
            });
        });
    }
    
    function confirmarExclusao(avisoId) {
        const aviso = avisos.find(a => a.id === avisoId);
        if (!aviso) return;
        
        if (confirm(`Tem certeza que deseja excluir o aviso "${aviso.title}"? Esta ação não pode ser desfeita.`)) {
            excluirAviso(avisoId);
        }
    }
    
    async function excluirAviso(avisoId) {
        try {
            const sessionToken = getCookie('session_token');
            const response = await fetch('../backend/api.php?action=deleteAnnouncement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionToken
                },
                body: JSON.stringify({ id: avisoId })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Remover da lista local
                avisos = avisos.filter(a => a.id !== avisoId);
                renderizarAvisos();
                mostrarNotificacao('Aviso excluído com sucesso!', 'success');
            } else {
                mostrarNotificacao('Erro ao excluir aviso: ' + (result.error || 'Erro desconhecido'), 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir aviso:', error);
            mostrarNotificacao('Erro de conexão ao excluir aviso', 'error');
        }
    }
    
    function mostrarNotificacao(mensagem, tipo = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${tipo}`;
        
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const icon = document.createElement('i');
        icon.className = `fas ${getNotificationIcon(tipo)}`;
        
        const span = document.createElement('span');
        span.textContent = mensagem;
        
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
        switch (tipo) {
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
    
    function getNotificationIcon(tipo) {
        switch (tipo) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
    
    function renderizarAvisos() {
        const container = document.getElementById('lista-avisos-container');
        const loading = document.getElementById('loading-avisos');
        const semAvisos = document.getElementById('sem-avisos');
        
        const avisosFiltrados = getAvisosFiltrados();
        
        if (avisosFiltrados.length === 0) {
            container.style.display = 'none';
            loading.style.display = 'none';
            semAvisos.style.display = 'block';
            return;
        }
        
        container.innerHTML = avisosFiltrados.map(criarElementoAviso).join('');
        container.style.display = 'block';
        loading.style.display = 'none';
        semAvisos.style.display = 'none';
        
        bindAvisoEvents();
        bindDeleteEvents(); // Adicionar eventos de exclusão
    }
                    </div>
                </div>
            </div>
        `;
    }
    
    function getIconClass(categoria) {
        const classes = {
            'alert': 'alert',
            'maintenance': 'maintenance',
            'update': 'update',
            'promotion': 'promotion',
            'news': 'news'
        };
        return classes[categoria] || '';
    }
    
    function getIcon(categoria) {
        const icons = {
            'alert': 'fas fa-exclamation-triangle',
            'maintenance': 'fas fa-tools',
            'update': 'fas fa-sync-alt',
            'promotion': 'fas fa-gift',
            'news': 'fas fa-newspaper'
        };
        return icons[categoria] || 'fas fa-info-circle';
    }
    
    function getPrioridadeClass(prioridade) {
        const classes = {
            'high': 'prioridade-alta',
            'medium': 'prioridade-media',
            'low': 'prioridade-baixa'
        };
        return classes[prioridade] || '';
    }
    
    function getPrioridadeText(prioridade) {
        const texts = {
            'high': 'ALTA',
            'medium': 'MÉDIA',
            'low': 'BAIXA'
        };
        return texts[prioridade] || prioridade.toUpperCase();
    }
    
    function getCategoriaText(categoria) {
        const texts = {
            'news': 'NOTÍCIAS',
            'update': 'ATUALIZAÇÕES',
            'maintenance': 'MANUTENÇÃO',
            'promotion': 'PROMOÇÕES',
            'alert': 'ALERTAS',
            'other': 'OUTROS'
        };
        return texts[categoria] || categoria.toUpperCase();
    }
    
    function formatarData(dataString) {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    function aplicarFiltro(filtro) {
        filtroAtivo = filtro;
        aplicarFiltros();
    }
    
    function aplicarFiltros() {
        renderizarAvisos();
    }
    
    async function marcarComoLido(avisoId) {
        if (avisosLidos.has(avisoId)) {
            return; // Já foi lido
        }
        
        try {
            // Marcar como lido localmente
            avisosLidos.add(avisoId);
            localStorage.setItem('avisos_lidos', JSON.stringify([...avisosLidos]));
            
            // Incrementar visualizações
            await incrementarVisualizacoes(avisoId);
            
            // Atualizar interface
            renderizarAvisos();
            atualizarEstatisticas();
            
        } catch (error) {
            console.error('Erro ao marcar como lido:', error);
        }
    }
    
    async function incrementarVisualizacoes(avisoId) {
        try {
            const response = await fetch('../backend/api.php?action=incrementViews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ announcement_id: avisoId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Atualizar o aviso local
                const aviso = avisos.find(a => a.id === avisoId);
                if (aviso) {
                    aviso.views = (aviso.views || 0) + 1;
                }
            }
        } catch (error) {
            console.error('Erro ao incrementar visualizações:', error);
        }
    }
    
    function abrirModalCriar() {
        document.getElementById('modal-titulo').textContent = 'Criar Aviso';
        formAviso.reset();
        modalAviso.style.display = 'flex';
        modalAviso.classList.add('active');
    }
    
    function fecharModal() {
        modalAviso.classList.remove('active');
        setTimeout(() => {
            modalAviso.style.display = 'none';
        }, 250);
    }
    
    async function handleSubmitAviso(e) {
        e.preventDefault();
        
        // Obter valores dos campos
        const titulo = document.getElementById('aviso-titulo').value.trim();
        const mensagem = document.getElementById('aviso-mensagem').value.trim();
        const prioridade = document.getElementById('aviso-prioridade').value;
        const categoria = document.getElementById('aviso-categoria').value;
        const expira = document.getElementById('aviso-expira').value;
        const tipoUsuario = document.getElementById('aviso-tipo-usuario').value;
        const fixado = document.getElementById('aviso-fixado').checked;
        
        // Validação básica
        if (!titulo || !mensagem) {
            mostrarErro('Título e mensagem são obrigatórios');
            return;
        }
        
        const avisoData = {
            title: titulo,
            message: mensagem,
            priority: prioridade,
            category: categoria,
            expires_at: expira || null,
            target_user_type: tipoUsuario,
            pinned: fixado
        };
        
        console.log('Enviando aviso:', avisoData);
        
                        try {
                    // Função para obter cookies
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
                    
                    // Obter token de autenticação dos cookies
                    const sessionToken = getCookie('session_token');
                    const userRole = getCookie('user_role');
                    
                    if (!sessionToken || userRole !== 'admin') {
                        mostrarErro('Usuário não autenticado');
                        return;
                    }
                    
                    const response = await fetch('../backend/api.php?action=createAnnouncement', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + sessionToken
                        },
                        body: JSON.stringify(avisoData)
                    });
            
            console.log('Resposta da API:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Dados da resposta:', data);
            
            if (data.success) {
                mostrarSucesso('Aviso criado com sucesso!');
                fecharModal();
                await carregarAvisos(); // Recarregar avisos
            } else {
                mostrarErro(data.message || 'Erro ao criar aviso');
            }
        } catch (error) {
            console.error('Erro ao criar aviso:', error);
            mostrarErro('Erro de conexão: ' + error.message);
        }
    }
    
    function mostrarLoading(show) {
        if (show) {
            loadingAvisos.style.display = 'flex';
            listaAvisosContainer.style.display = 'none';
            semAvisos.style.display = 'none';
        } else {
            loadingAvisos.style.display = 'none';
        }
    }
    
    function mostrarSucesso(mensagem) {
        console.log('Sucesso:', mensagem);
        
        // Criar notificação visual
        const notificacao = document.createElement('div');
        notificacao.className = 'notificacao sucesso';
        notificacao.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${escapeHTML(mensagem)}</span>
        `;
        
        document.body.appendChild(notificacao);
        
        // Mostrar notificação
        setTimeout(() => notificacao.classList.add('show'), 100);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notificacao.classList.remove('show');
            setTimeout(() => notificacao.remove(), 300);
        }, 3000);
    }
    
    function mostrarErro(mensagem) {
        console.error('Erro:', mensagem);
        
        // Criar notificação visual
        const notificacao = document.createElement('div');
        notificacao.className = 'notificacao erro';
        notificacao.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${escapeHTML(mensagem)}</span>
        `;
        
        document.body.appendChild(notificacao);
        
        // Mostrar notificação
        setTimeout(() => notificacao.classList.add('show'), 100);
        
        // Remover após 5 segundos
        setTimeout(() => {
            notificacao.classList.remove('show');
            setTimeout(() => notificacao.remove(), 300);
        }, 5000);
    }
    
    // Adicionar campos ao formulário
    function setupFormFields() {
        const form = document.getElementById('form-aviso');
        if (form) {
            form.innerHTML = `
                <div class="form-group">
                    <label>Título</label>
                    <input id="aviso-titulo" name="aviso-titulo" required>
                </div>
                <div class="form-group">
                    <label>Mensagem</label>
                    <textarea id="aviso-mensagem" name="aviso-mensagem" rows="4" required></textarea>
                </div>
                <div class="form-group">
                    <label>Prioridade</label>
                    <select id="aviso-prioridade" name="aviso-prioridade" required>
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Categoria</label>
                    <select id="aviso-categoria" name="aviso-categoria" required>
                        <option value="news">Notícias</option>
                        <option value="update">Atualizações</option>
                        <option value="maintenance">Manutenção</option>
                        <option value="promotion">Promoções</option>
                        <option value="alert">Alertas</option>
                        <option value="other">Outros</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Data de Expiração</label>
                    <input id="aviso-expira" name="aviso-expira" type="datetime-local">
                </div>
                <div class="form-group">
                    <label>Tipo de Usuário</label>
                    <select id="aviso-tipo-usuario" name="aviso-tipo-usuario">
                        <option value="all">Todos</option>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="vip">VIP</option>
                    </select>
                </div>
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="aviso-fixado" name="aviso-fixado">
                        Fixar aviso
                    </label>
                </div>
                <div class="modal-actions">
                    <button type="button" id="cancelar-aviso" class="btn ghost">Cancelar</button>
                    <button type="submit" class="btn primary">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            `;
        }
    }
    
    // Configurar campos do formulário
    setupFormFields();
});

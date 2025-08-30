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
    
    const searchInput = document.getElementById('buscar-usuarios');
    const filterPlan = document.getElementById('filtro-plano');
    const filterStatus = document.getElementById('filtro-status');
    const sortBy = document.getElementById('ordenar-por');
    const sortOrder = document.getElementById('ordem');
    const usersTableBody = document.querySelector('#tabela-usuarios tbody');
    const menuToggle = document.querySelector('.menu-toggle');
    
    let usersData = [];

    const createUserBtn = document.getElementById('btn-criar-usuario');
    const createUserForm = document.getElementById('modal-criar-usuario');
    const cancelCreateUserBtn = document.getElementById('cancelar-criacao-usuario');
    const userForm = document.getElementById('form-criar-usuario');

    // Toggle do menu horizontal para mobile (se necessário)
    menuToggle?.addEventListener('click', () => {
      // Por enquanto, o menu horizontal é sempre visível
      // Pode ser implementado um toggle para mobile se necessário
    });

    // Buscar usuários da API
    const fetchUsers = async () => {
        try {
            const response = await fetch('../backend/api.php?action=getUsers');
            const data = await response.json();
            usersData = Array.isArray(data) ? data : [];
            renderUsers();
        } catch (e) {
            console.error('Erro ao buscar usuários:', e);
            usersData = [];
            renderUsers();
        }
    };

    // Renderizar linhas (desktop: ícones inline | mobile: menu 3 pontos)
    const renderUsers = (lista = usersData) => {
        usersTableBody.innerHTML = '';
        if (!lista.length) {
            usersTableBody.innerHTML = '<tr><td colspan="7">Nenhum usuário encontrado.</td></tr>';
            return;
        }
        lista.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Usuário">${escapeHTML(user.username)}</td>
                <td data-label="Plano">${escapeHTML(user.plan || 'free')}</td>
                <td data-label="Créditos">${escapeHTML(user.credits)}</td>
                <td data-label="Status">${escapeHTML(user.status)}</td>
                <td data-label="IP">${escapeHTML(user.ip || 'N/A')}</td>
                <td data-label="Telegram ID">${escapeHTML(user.telegram_id || 'N/A')}</td>
                <td data-label="Ações">
                    <div class="acoes-desktop">
                        <button class="icon-button ver-btn" data-user-id="${escapeHTML(user.id)}" title="Visualizar"><i class="fas fa-eye"></i></button>
                        <button class="icon-button editar-btn" data-user-id="${escapeHTML(user.id)}" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="icon-button excluir-btn" data-user-id="${escapeHTML(user.id)}" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                    <div class="acoes-mobile dropdown">
                        <button class="icon-button mais-btn" title="Mais ações"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="dropdown-menu">
                            <button class="dropdown-item ver-btn" data-user-id="${escapeHTML(user.id)}"><i class="fas fa-eye"></i> Visualizar</button>
                            <button class="dropdown-item editar-btn" data-user-id="${escapeHTML(user.id)}"><i class="fas fa-pencil-alt"></i> Editar</button>
                            <button class="dropdown-item excluir-btn" data-user-id="${escapeHTML(user.id)}"><i class="fas fa-trash"></i> Excluir</button>
                        </div>
                    </div>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    };

    // Filtro e ordenação, com busca por username, email, telegram_id, telegram_username
    const filtrarOrdenar = () => {
        let termo = (searchInput?.value || '').toLowerCase().trim();
        let plano = filterPlan?.value || 'all';
        let status = filterStatus?.value || 'all';

        let filtrados = usersData.filter(u => {
            const campoBusca = [
                (u.username || '').toLowerCase(),
                (u.email || '').toLowerCase(),
                (u.telegram_id || '').toString().toLowerCase(),
                (u.telegram_username || '').toLowerCase(),
            ].join(' ');
            const okBusca = termo === '' || campoBusca.includes(termo);
            const okPlano = plano === 'all' || u.plan === plano;
            const okStatus = status === 'all' || u.status === status;
            return okBusca && okPlano && okStatus;
        });

        const chave = sortBy?.value || 'username';
        const ordem = sortOrder?.value || 'asc';
        filtrados.sort((a,b)=>{
            let A = a[chave]; let B = b[chave];
            if (chave === 'created_at' || chave === 'last_login') { A = new Date(A); B = new Date(B); }
            if (A < B) return ordem === 'asc' ? -1 : 1;
            if (A > B) return ordem === 'asc' ? 1 : -1;
            return 0;
        });

        renderUsers(filtrados);
    };

    searchInput?.addEventListener('input', filtrarOrdenar);
    filterPlan?.addEventListener('change', filtrarOrdenar);
    filterStatus?.addEventListener('change', filtrarOrdenar);
    sortBy?.addEventListener('change', filtrarOrdenar);
    sortOrder?.addEventListener('change', filtrarOrdenar);

    // Delegar cliques (inclui menu 3 pontos no mobile)
    usersTableBody.addEventListener('click', (event) => {
        if (event.target.closest('.ver-btn')) handleViewUser(event);
        if (event.target.closest('.editar-btn')) handleEditUser(event);
        if (event.target.closest('.excluir-btn')) handleDeleteUser(event);
        if (event.target.closest('.mais-btn')) {
            const dropdown = event.target.closest('.dropdown').querySelector('.dropdown-menu');
            dropdown.classList.toggle('aberto');
        }
    });

    // Helpers de modal
    const openModal = (modal) => { if (!modal) return; modal.style.display = 'flex'; setTimeout(()=>modal.classList.add('active'),10); };
    const closeModal = (modal) => { if (!modal) return; modal.classList.remove('active'); setTimeout(()=>modal.style.display='none',300); };

    // Abrir modal de criação
    createUserBtn?.addEventListener('click', () => openModal(createUserForm));
    cancelCreateUserBtn?.addEventListener('click', () => { closeModal(createUserForm); userForm.reset(); });

    // Criar usuário (IP é atribuído no backend)
    userForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        const credits = document.getElementById('credits').value;
        const plan = document.getElementById('plan').value;
        const telegramId = document.getElementById('create-telegram-id')?.value || '';
        const telegramUsername = document.getElementById('create-telegram-username')?.value || '';

        try {
            const resp = await fetch('../backend/api.php?action=createUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, email, password, role, credits, plan,
                    status: 'active', telegram_id: telegramId, telegram_username: telegramUsername
                })
            });
            const result = await resp.json();
            if (result.success) {
                showNotification('Usuário criado com sucesso!', 'success');
                closeModal(createUserForm); userForm.reset(); fetchUsers();
            } else {
                showNotification(result.error || 'Erro ao criar usuário', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Erro na requisição de criação.', 'error');
        }
    });

    // Visualizar
    const handleViewUser = (event) => {
        const btn = event.target.closest('.ver-btn');
        const id = btn.dataset.userId;
        const user = usersData.find(u => u.id === id);
        if (!user) return;
        const modal = document.getElementById('modal-ver-usuario');
        const container = document.getElementById('container-detalhes-usuario');
        if (!modal || !container) return;
        container.innerHTML = `
            <div class="user-detail-grid">
                ${['id','username','email','role','status','plan','credits','ip','created_at','last_login','telegram_id','telegram_username','affiliate_code']
                .map(k => `<div class="detail-item"><span class="detail-label">${escapeHTML(k.replace('_',' ').toUpperCase())}:</span><span class="detail-value">${escapeHTML(user[k] ?? 'N/A')}</span></div>`).join('')}
            </div>`;
        openModal(modal);
        modal.querySelector('.close-button')?.addEventListener('click', ()=>closeModal(modal));
        document.getElementById('fechar-ver-usuario')?.addEventListener('click', ()=>closeModal(modal));
    };

    // Editar
    const handleEditUser = (event) => {
        const btn = event.target.closest('.editar-btn');
        const id = btn.dataset.userId;
        const user = usersData.find(u => u.id === id);
        if (!user) return;
        const modal = document.getElementById('modal-editar-usuario');
        if (!modal) return;
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-username').value = user.username ?? '';
        document.getElementById('edit-email').value = user.email ?? '';
        document.getElementById('edit-role').value = user.role ?? 'user';
        document.getElementById('edit-status').value = user.status ?? 'active';
        document.getElementById('edit-plan').value = user.plan ?? 'free';
        document.getElementById('edit-credits').value = user.credits ?? 0;
        document.getElementById('edit-telegram-id').value = user.telegram_id ?? '';
        document.getElementById('edit-telegram-username').value = user.telegram_username ?? '';
        document.getElementById('edit-affiliate-code').value = user.affiliate_code ?? '';
        document.getElementById('edit-password').value = '';
        openModal(modal);
    };

    document.getElementById('cancelar-edicao-usuario')?.addEventListener('click', ()=>{
        const modal = document.getElementById('modal-editar-usuario'); closeModal(modal);
    });

    document.getElementById('form-editar-usuario')?.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const btnSalvar = document.getElementById('salvar-edicao-usuario');
        const original = btnSalvar ? btnSalvar.innerHTML : '';
        if (btnSalvar) { btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; btnSalvar.disabled = true; }

        const payload = {
            id: document.getElementById('edit-user-id').value,
            username: document.getElementById('edit-username').value,
            email: document.getElementById('edit-email').value,
            password: document.getElementById('edit-password').value,
            role: document.getElementById('edit-role').value,
            credits: document.getElementById('edit-credits').value,
            status: document.getElementById('edit-status').value,
            plan: document.getElementById('edit-plan').value,
            telegram_id: document.getElementById('edit-telegram-id').value,
            telegram_username: document.getElementById('edit-telegram-username').value
        };
        if (!payload.password) delete payload.password;

        try {
            const resp = await fetch('../backend/api.php?action=updateUser', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify(payload)
            });
            const result = await resp.json();
            if (result.success) {
                showNotification('Usuário atualizado com sucesso!', 'success');
                const modal = document.getElementById('modal-editar-usuario'); closeModal(modal); fetchUsers();
            } else {
                showNotification(result.message || 'Erro ao atualizar usuário', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Erro na requisição de atualização.', 'error');
        } finally {
            if (btnSalvar) { btnSalvar.innerHTML = original; btnSalvar.disabled = false; }
        }
    });

    // Excluir com modal estilizado
    const handleDeleteUser = async (event) => {
        const btn = event.target.closest('.excluir-btn');
        const id = btn.dataset.userId;

        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal';
        confirmModal.innerHTML = `
            <div class="modal-content card confirm">
                <div class="modal-header">
                    <h3><i class="fas fa-triangle-exclamation"></i> Confirmar Exclusão</h3>
                    <button class="close-button">&times;</button>
                </div>
                <p class="confirm-text">Tem certeza que deseja excluir este usuário?</p>
                <div class="modal-actions">
                    <button id="confirm-delete" class="btn danger"><i class="fas fa-trash"></i> Sim, Excluir</button>
                    <button id="cancel-delete" class="btn ghost">Cancelar</button>
                </div>
            </div>`;
        document.body.appendChild(confirmModal);
        openModal(confirmModal);
        confirmModal.querySelector('.close-button')?.addEventListener('click', ()=>{ closeModal(confirmModal); confirmModal.remove(); });
        document.getElementById('cancel-delete').addEventListener('click', ()=>{ closeModal(confirmModal); confirmModal.remove(); });
        document.getElementById('confirm-delete').addEventListener('click', async ()=>{
            try {
                const resp = await fetch('../backend/api.php?action=deleteUser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `id=${encodeURIComponent(id)}`
                });
                const res = await resp.json();
                if (res.success) {
                    closeModal(confirmModal); confirmModal.remove();
                    showNotification('Usuário excluído com sucesso!', 'success'); fetchUsers();
                } else {
                    showNotification(res.message || 'Erro ao excluir', 'error');
                }
            } catch (e) {
                console.error(e); showNotification('Erro na requisição de exclusão.', 'error');
            }
        });
    };

    // Notificações
    const showNotification = (message, type='info') => {
        const div = document.createElement('div');
        div.className = `notification ${type}`;
        div.textContent = message; // Usar textContent para prevenir XSS
        document.body.appendChild(div);
        setTimeout(()=>{ div.style.opacity='1'; div.style.transform='translateY(0)'; },10);
        setTimeout(()=>{ div.style.opacity='0'; div.style.transform='translateY(-20px)'; setTimeout(()=>div.remove(),300); },3000);
    };

    // Start
    fetchUsers();
});
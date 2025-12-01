// ========================================
// PARTE 1: CONFIGURAÇÃO INICIAL
// ========================================

// Variáveis Globais
let transactions = [];
let filteredTransactions = [];
let goals = [];
let isFirebaseConnected = false;
let currentUser = null;
// Variáveis para o Dashboard melhorado
let financialFeedInterval = null;
let recognition = null;

// Referências dos elementos do DOM - Login
const loginContainer = document.getElementById("login-container");
const appContainer = document.getElementById("app-container");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout");

// Referências dos elementos do DOM - Dashboard
const totalReceitasEl = document.getElementById("total-receitas");
const totalDespesasEl = document.getElementById("total-despesas");
const saldoEl = document.getElementById("saldo");

// Referências dos elementos do DOM - Transações
const transactionForm = document.getElementById("transaction-form");
const tableBody = document.getElementById("transaction-table-body");
const emptyState = document.getElementById("empty-state");
const filterTypeEl = document.getElementById("filter-type");
const filterMonthEl = document.getElementById("filter-month");
const clearFiltersBtn = document.getElementById("clear-filters");
const addTransactionBtn = document.getElementById("add-transaction-btn");
const transactionModal = document.getElementById("transaction-modal");
const closeModal = document.getElementById("close-modal");

// Referências dos elementos do DOM - Conexão
const connectionStatusEl = document.getElementById("connection-status");

// Referências dos elementos do DOM - Lucro Mensal
const monthlyProfitCard = document.getElementById("monthly-profit-card");
const monthReceitasEl = document.getElementById("month-receitas");
const monthDespesasEl = document.getElementById("month-despesas");
const monthProfitEl = document.getElementById("month-profit");

// Email do administrador (IMPORTANTE: Troque pelo seu email)
const ADMIN_EMAIL = 'borgescarlos030@gmail.com';

console.log('✅ Variáveis globais inicializadas');
// ========================================
// PARTE 2: AUTENTICAÇÃO
// ========================================

// Monitor de autenticação do Firebase
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        // Usuário não está logado
        loginContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        console.log('❌ Usuário não autenticado');
        return;
    }

    // PROTEÇÃO: Verifica se é o administrador autorizado
    if (user.email !== ADMIN_EMAIL) {
        console.warn('🚫 Tentativa de acesso não autorizado:', user.email);
        
        loginContainer.classList.add('hidden');
        appContainer.classList.add('hidden');
        
        alert('🚫 ACESSO NEGADO\n\nEste sistema é exclusivo para administradores.\n\nVocê será redirecionado.');
        
        await auth.signOut();
        window.location.href = 'vendas.html';
        return;
    }

    // ✅ Usuário autorizado
    currentUser = user;
    console.log('✅ Usuário autenticado:', user.email);
    
    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // Testa conexão e carrega dados
    const connected = await testFirebaseConnection();
    if (connected) {
        await loadTransactions();
        await loadGoals();
    }
});

// Função de Login
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    
    if (!email || !password) {
        showToast('Preencha todos os campos', 'warning');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Login realizado com sucesso!', 'success', 2000);
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        let errorMessage = 'Erro ao fazer login';
        
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Usuário não encontrado';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Senha incorreta';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
                break;
        }
        
        showToast(errorMessage, 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    }
});

// Função de Logout
logoutBtn.addEventListener("click", async () => {
    try {
        await auth.signOut();
        showToast('Logout realizado', 'info', 2000);
        document.getElementById("email").value = '';
        document.getElementById("password").value = '';
        console.log('✅ Logout realizado');
    } catch (error) {
        console.error('❌ Erro no logout:', error);
        showToast('Erro ao fazer logout', 'error');
    }
});

console.log('✅ Sistema de autenticação configurado');

// ========================================
// PARTE 3: SISTEMA DE NOTIFICAÇÕES (TOAST)
// ========================================

function showToast(message, type = 'success', duration = 4000) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // Ícones para cada tipo de notificação
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="toast-icon ${icons[type]}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    toastContainer.appendChild(toast);
    
    // Animação de entrada
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove automaticamente após a duração
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

console.log('✅ Sistema de notificações configurado');

// ========================================
// PARTE 4: STATUS DE CONEXÃO
// ========================================

function updateConnectionStatus(status, message) {
    connectionStatusEl.className = `connection-status ${status}`;
    
    const icons = {
        connected: 'fa-wifi',
        disconnected: 'fa-wifi-slash',
        connecting: 'fa-spinner fa-spin'
    };
    
    connectionStatusEl.innerHTML = `
        <i class="fas ${icons[status] || 'fa-wifi'}"></i>
        <span>${message}</span>
    `;
    
    // Esconde o status após conectar com sucesso
    if (status === 'connected') {
        setTimeout(() => {
            connectionStatusEl.style.opacity = '0';
            setTimeout(() => {
                connectionStatusEl.style.display = 'none';
            }, 300);
        }, 2000);
    } else {
        connectionStatusEl.style.display = 'flex';
        connectionStatusEl.style.opacity = '1';
    }
}

// Testa a conexão com o Firebase
async function testFirebaseConnection() {
    updateConnectionStatus('connecting', 'Verificando conexão...');
    
    try {
        // Tenta fazer uma query simples
        await db.collection('transactions').limit(1).get();
        
        isFirebaseConnected = true;
        updateConnectionStatus('connected', 'Conectado ao Firebase');
        console.log('✅ Conexão com Firebase estabelecida');
        return true;
        
    } catch (error) {
        console.error('❌ Erro na conexão com Firebase:', error);
        
        isFirebaseConnected = false;
        updateConnectionStatus('disconnected', 'Erro de conexão');
        
        showToast('Erro ao conectar com o banco de dados', 'error');
        return false;
    }
}

console.log('✅ Sistema de status de conexão configurado');

// ========================================
// PARTE 5: NAVEGAÇÃO ENTRE PÁGINAS
// ========================================

// Seleciona todos os botões de navegação
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

// Função para trocar de página
function navigateToPage(pageName) {
    // Remove a classe 'active' de todos os botões
    navItems.forEach(item => item.classList.remove('active'));
    
    // Remove a classe 'active' de todas as páginas
    pages.forEach(page => page.classList.remove('active'));
    
    // Adiciona 'active' no botão clicado
    const activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Adiciona 'active' na página correspondente
    const activePage = document.getElementById(`${pageName}-page`);
    if (activePage) {
        activePage.classList.add('active');
    }
    
    console.log(`📄 Navegou para: ${pageName}`);
    
    // Carrega dados específicos da página
    loadPageData(pageName);
}

// Adiciona evento de clique em cada botão de navegação
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageName = item.getAttribute('data-page');
        navigateToPage(pageName);
    });
});

// Função para carregar dados específicos de cada página
function loadPageData(pageName) {
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'reports':
            renderReportsCharts();
            break;
        case 'goals':
            renderGoals();
            break;
        case 'ai-assistant':
            // A IA já está carregada
            break;
    }
}

console.log('✅ Sistema de navegação configurado');

// ========================================
// PARTE 6: CONTROLE DE MODAIS
// ========================================

// Modal de Transação
addTransactionBtn.addEventListener('click', () => {
    transactionModal.classList.remove('hidden');
    document.getElementById('desc').focus();
});

closeModal.addEventListener('click', () => {
    transactionModal.classList.add('hidden');
    transactionForm.reset();
});

// Fecha modal ao clicar fora
transactionModal.addEventListener('click', (e) => {
    if (e.target === transactionModal) {
        transactionModal.classList.add('hidden');
        transactionForm.reset();
    }
});

// Fecha modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!transactionModal.classList.contains('hidden')) {
            transactionModal.classList.add('hidden');
            transactionForm.reset();
        }
        
        const goalModal = document.getElementById('goal-modal');
        if (goalModal && !goalModal.classList.contains('hidden')) {
            goalModal.classList.add('hidden');
            document.getElementById('goal-form').reset();
        }
    }
});

console.log('✅ Sistema de modais configurado');

// ========================================
// PARTE 7: CARREGAMENTO DE TRANSAÇÕES
// ========================================

async function loadTransactions() {
    if (!isFirebaseConnected || !currentUser) {
        console.warn('⚠️ Não é possível carregar transações sem conexão ou autenticação');
        transactions = [];
        filteredTransactions = [];
        renderTransactions();
        return;
    }

    console.log('📥 Carregando transações do Firebase...');
    
    try {
        const snapshot = await db.collection("transactions")
            .orderBy("timestamp", "desc")
            .get();

        transactions = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                ...data
            });
        });

        filteredTransactions = [...transactions];
        
        console.log(`✅ ${transactions.length} transações carregadas`);
        
        // Atualiza a interface
        populateMonthFilter();
        renderTransactions();
        
        if (transactions.length > 0) {
            showToast(`${transactions.length} transações carregadas`, 'info', 2000);
            updateDashboard(); // ADICIONADO
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar transações:', error);
        
        if (error.code === 'permission-denied') {
            showToast('Sem permissão para acessar dados', 'error');
        } else {
            showToast('Erro ao carregar transações', 'error');
        }
        
        transactions = [];
        filteredTransactions = [];
        renderTransactions();
    }
}

console.log('✅ Função de carregamento de transações configurada');

// ========================================
// PARTE 8: ADICIONAR TRANSAÇÃO
// ========================================

transactionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const desc = document.getElementById("desc").value.trim();
    const reason = document.getElementById("reason").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    
    // Validação
    if (!desc || isNaN(amount) || amount <= 0) {
        showToast('Preencha todos os campos corretamente', 'warning');
        return;
    }

    if (!isFirebaseConnected || !currentUser) {
        showToast('Você precisa estar autenticado', 'warning');
        return;
    }

    console.log('💾 Salvando nova transação...');

    try {
        const transaction = {
            desc,
            reason: reason || '',
            amount: Number(amount),
            type,
            date: new Date().toLocaleDateString('pt-BR'),
            timestamp: Date.now(),
            userId: currentUser.uid
        };
        
        // Salva no Firebase
        const docRef = await db.collection("transactions").add(transaction);
        
        // Adiciona o ID da transação
        transaction.id = docRef.id;
        
        // Adiciona na lista local
        transactions.unshift(transaction);
        filteredTransactions = [...transactions];
        
        // Atualiza a interface
        populateMonthFilter();
        renderTransactions();
        
        // Fecha o modal e limpa o formulário
        transactionModal.classList.add('hidden');
        transactionForm.reset();
        
        // Feedback ao usuário
        const typeText = type === 'receita' ? 'Receita' : 'Despesa';
        const formattedAmount = amount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        showToast(`${typeText} de R$ ${formattedAmount} adicionada!`, 'success');
        console.log('✅ Transação salva com sucesso:', transaction.id);
        
    } catch (error) {
        console.error('❌ Erro ao salvar transação:', error);
        
        if (error.code === 'permission-denied') {
            showToast('Sem permissão para adicionar transação', 'error');
        } else {
            showToast('Erro ao salvar transação', 'error');
        }
    }
});

console.log('✅ Função de adicionar transação configurada');

// ========================================
// PARTE 9: DELETAR TRANSAÇÃO
// ========================================

async function deleteTransaction(id) {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) {
        return;
    }

    if (!isFirebaseConnected || !currentUser) {
        showToast('Você precisa estar autenticado', 'error');
        return;
    }

    console.log('🗑️ Deletando transação:', id);

    try {
        // Deleta do Firebase
        await db.collection("transactions").doc(id).delete();
        
        // Remove da lista local
        transactions = transactions.filter(t => t.id !== id);
        filteredTransactions = filteredTransactions.filter(t => t.id !== id);
        
        // Atualiza a interface
        populateMonthFilter();
        renderTransactions();
        
        showToast('Transação excluída com sucesso', 'success', 2000);
        console.log('✅ Transação deletada:', id);
        
    } catch (error) {
        console.error('❌ Erro ao excluir transação:', error);
        
        if (error.code === 'permission-denied') {
            showToast('Sem permissão para excluir transação', 'error');
        } else {
            showToast('Erro ao excluir transação', 'error');
        }
    }
}

// Torna a função global para ser chamada pelo HTML
window.deleteTransaction = deleteTransaction;

console.log('✅ Função de deletar transação configurada');

// ========================================
// PARTE 10: SISTEMA DE FILTROS
// ========================================

// Popula o filtro de meses com base nas transações
function populateMonthFilter() {
    if (transactions.length === 0) {
        filterMonthEl.innerHTML = '<option value="">Todos os meses</option>';
        return;
    }
    
    // Extrai todos os meses únicos das transações
    const months = [...new Set(transactions.map(t => {
        const date = new Date(t.timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }))].sort().reverse();

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    filterMonthEl.innerHTML = '<option value="">Todos os meses</option>';
    
    months.forEach(month => {
        const [year, monthNum] = month.split('-');
        const monthName = monthNames[parseInt(monthNum) - 1];
        const option = document.createElement('option');
        option.value = month;
        option.textContent = `${monthName} ${year}`;
        filterMonthEl.appendChild(option);
    });
    
    console.log(`✅ Filtro de meses atualizado: ${months.length} meses disponíveis`);
}

// Aplica os filtros selecionados
function applyFilters() {
    const typeFilter = filterTypeEl.value;
    const monthFilter = filterMonthEl.value;
    
    console.log('🔍 Aplicando filtros:', { tipo: typeFilter || 'todos', mês: monthFilter || 'todos' });
    
    filteredTransactions = transactions.filter(transaction => {
        // Filtro por tipo
        let matchesType = !typeFilter || transaction.type === typeFilter;
        
        // Filtro por mês
        let matchesMonth = true;
        if (monthFilter) {
            const transactionDate = new Date(transaction.timestamp);
            const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            matchesMonth = transactionMonth === monthFilter;
        }
        
        return matchesType && matchesMonth;
    });
    
    console.log(`✅ Filtros aplicados: ${filteredTransactions.length} transações encontradas`);
    renderTransactions();
}

// Limpa todos os filtros
function clearFilters() {
    filterTypeEl.value = '';
    filterMonthEl.value = '';
    filteredTransactions = [...transactions];
    renderTransactions();
    showToast('Filtros limpos', 'info', 2000);
    console.log('✅ Filtros limpos');
}

// Event Listeners dos filtros
filterTypeEl.addEventListener('change', applyFilters);
filterMonthEl.addEventListener('change', applyFilters);
clearFiltersBtn.addEventListener('click', clearFilters);

console.log('✅ Sistema de filtros configurado');

// ========================================
// PARTE 11: CÁLCULO DE LUCRO MENSAL
// ========================================

function updateMonthlyProfitCard() {
    const selectedMonth = filterMonthEl.value;
    
    // Se nenhum mês foi selecionado, esconde o card
    if (!selectedMonth) {
        monthlyProfitCard.style.display = 'none';
        return;
    }
    
    console.log('📊 Calculando lucro do mês:', selectedMonth);
    
    let monthReceitas = 0;
    let monthDespesas = 0;
    
    // Calcula receitas e despesas do mês filtrado
    filteredTransactions.forEach(t => {
        if (t.type === 'receita') {
            monthReceitas += Number(t.amount);
        } else {
            monthDespesas += Number(t.amount);
        }
    });
    
    const monthProfit = monthReceitas - monthDespesas;
    
    // Atualiza os valores na tela
    monthReceitasEl.textContent = monthReceitas.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
    
    monthDespesasEl.textContent = monthDespesas.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
    
    monthProfitEl.textContent = monthProfit.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
    
    // Muda a cor do card de lucro baseado no valor
    const profitCard = document.getElementById('month-profit-card-inner');
    const profitValueEl = profitCard.querySelector('.summary-value');
    const profitIconEl = profitCard.querySelector('.summary-icon');

    if (monthProfit > 0) {
        profitValueEl.style.color = 'var(--success-color)';
        profitIconEl.style.color = 'var(--success-color)';
    } else if (monthProfit < 0) {
        profitValueEl.style.color = 'var(--danger-color)';
        profitIconEl.style.color = 'var(--danger-color)';
    } else {
        profitValueEl.style.color = 'var(--text-light)';
        profitIconEl.style.color = 'var(--primary-color)';
    }
    
    monthlyProfitCard.style.display = 'block';
    
    console.log('✅ Lucro mensal calculado:', {
        receitas: monthReceitas,
        despesas: monthDespesas,
        lucro: monthProfit
    });
}

console.log('✅ Função de cálculo de lucro mensal configurada');

// ========================================
// PARTE 12: RENDERIZAÇÃO DE TRANSAÇÕES
// ========================================

function renderTransactions() {
    console.log('🎨 Renderizando transações...');
    
    tableBody.innerHTML = '';
    
    // Calcula totais gerais (de todas as transações, não filtradas)
    let totalReceitas = 0;
    let totalDespesas = 0;
    
    transactions.forEach(t => {
        if (t.type === 'receita') {
            totalReceitas += Number(t.amount);
        } else {
            totalDespesas += Number(t.amount);
        }
    });

    // Se não houver transações filtradas, mostra estado vazio
    if (filteredTransactions.length === 0) {
        emptyState.classList.remove("hidden");
        document.querySelector(".table").style.display = "none";
    } else {
        emptyState.classList.add("hidden");
        document.querySelector(".table").style.display = "table";
        
        // Renderiza cada transação filtrada
        filteredTransactions.forEach(t => {
            const row = document.createElement("tr");
            
            const formattedAmount = Number(t.amount).toLocaleString('pt-BR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
            
            row.innerHTML = `
                <td style="text-align:left; font-weight:500;">${t.desc}</td>
                <td style="text-align:left;">${t.reason || '—'}</td>
                <td style="font-weight:700; color:${t.type === 'receita' ? 'var(--success-color)' : 'var(--danger-color)'};">
                    R$ ${formattedAmount}
                </td>
                <td>
                    <span class="type-badge ${t.type}">
                        ${t.type === 'receita' ? '💰 Receita' : '💸 Despesa'}
                    </span>
                </td>
                <td style="color:var(--text-gray);">${t.date}</td>
                <td>
                    <button onclick="deleteTransaction('${t.id}')" class="btn btn-danger btn-small">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    // Atualiza os cards de resumo (sempre com totais gerais)
    updateSummaryCards(totalReceitas, totalDespesas);
    
    // Atualiza o card de lucro mensal (se houver filtro de mês)
    updateMonthlyProfitCard();
    
    console.log('✅ Transações renderizadas:', filteredTransactions.length);
}

console.log('✅ Função de renderização de transações configurada');

// ========================================
// PARTE 13: ATUALIZAÇÃO DOS CARDS DE RESUMO
// ========================================

function updateSummaryCards(totalReceitas, totalDespesas) {
    // Formata e atualiza receitas
    const totalReceitasEl = document.getElementById('total-receitas');
    if (totalReceitasEl) {
        totalReceitasEl.textContent = totalReceitas.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }
    
    // Formata e atualiza despesas
    const totalDespesasEl = document.getElementById('total-despesas');
    if (totalDespesasEl) {
        totalDespesasEl.textContent = totalDespesas.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }
    
    // Calcula e formata o saldo
    const saldo = totalReceitas - totalDespesas;
    const saldoEl = document.getElementById('saldo');
    if (saldoEl) {
        saldoEl.textContent = saldo.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }
    
    // Atualiza a cor do card de saldo baseado no valor
    const saldoCard = document.getElementById('saldo-card');
    if (saldoCard) {
        const saldoValueEl = saldoCard.querySelector('.summary-value-compact');
        const saldoIconEl = saldoCard.querySelector('.summary-icon-compact');
        
        if (saldoValueEl && saldoIconEl) {
            if (saldo > 0) {
                saldoCard.classList.add('receitas');
                saldoCard.classList.remove('despesas');
                saldoValueEl.style.color = 'var(--success-color)';
                saldoIconEl.style.color = 'var(--success-color)';
            } else if (saldo < 0) {
                saldoCard.classList.add('despesas');
                saldoCard.classList.remove('receitas');
                saldoValueEl.style.color = 'var(--danger-color)';
                saldoIconEl.style.color = 'var(--danger-color)';
            } else {
                saldoCard.classList.remove('receitas', 'despesas');
                saldoValueEl.style.color = 'var(--text-light)';
                saldoIconEl.style.color = 'var(--primary-color)';
            }
        }
    }
    
    console.log('✅ Cards de resumo atualizados:', {
        receitas: totalReceitas,
        despesas: totalDespesas,
        saldo: saldo
    });
}

console.log('✅ Função de atualização de cards de resumo configurada');

// ========================================
// PARTE 14: SISTEMA DE METAS - CARREGAMENTO
// ========================================

async function loadGoals() {
    if (!isFirebaseConnected || !currentUser) {
        console.warn('⚠️ Não é possível carregar metas sem conexão ou autenticação');
        goals = [];
        renderGoals();
        return;
    }

    console.log('📥 Carregando metas do Firebase...');
    
    try {
        const snapshot = await db.collection("goals")
            .where("userId", "==", currentUser.uid)
            .orderBy("createdAt", "desc")
            .get();

        goals = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            goals.push({
                id: doc.id,
                ...data
            });
        });

        console.log(`✅ ${goals.length} metas carregadas`);
        renderGoals();
        
    } catch (error) {
        console.error('❌ Erro ao carregar metas:', error);
        
        if (error.code === 'permission-denied') {
            showToast('Sem permissão para acessar metas', 'error');
        } else {
            showToast('Erro ao carregar metas', 'error');
        }
        
        goals = [];
        renderGoals();
    }
}

console.log('✅ Função de carregamento de metas configurada');

// ========================================
// PARTE 15: MODAL DE METAS
// ========================================

const addGoalBtn = document.getElementById('add-goal-btn');
const goalModal = document.getElementById('goal-modal');
const closeGoalModal = document.getElementById('close-goal-modal');
const goalForm = document.getElementById('goal-form');

// Abre o modal de metas
addGoalBtn.addEventListener('click', () => {
    goalModal.classList.remove('hidden');
    document.getElementById('goal-title').focus();
});

// Fecha o modal de metas
closeGoalModal.addEventListener('click', () => {
    goalModal.classList.add('hidden');
    goalForm.reset();
});

// Fecha modal ao clicar fora
goalModal.addEventListener('click', (e) => {
    if (e.target === goalModal) {
        goalModal.classList.add('hidden');
        goalForm.reset();
    }
});

console.log('✅ Modal de metas configurado');

// ========================================
// PARTE 16: ADICIONAR NOVA META
// ========================================
// PARTE 19: GRÁFICO RÁPIDO (DASHBOARD) - MELHORADO
// ========================================

function renderQuickChart() {
    console.log('📊 Renderizando gráfico rápido do dashboard...');
    
    const ctx = document.getElementById('quick-chart');
    if (!ctx) return;
    
    // Destrói o gráfico anterior se existir
    if (quickChart) {
        quickChart.destroy();
    }
    
    // Calcula totais
    let totalReceitas = 0;
    let totalDespesas = 0;
    
    transactions.forEach(t => {
        if (t.type === 'receita') {
            totalReceitas += Number(t.amount);
        } else {
            totalDespesas += Number(t.amount);
        }
    });
    
    // Cria o gráfico
    quickChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                data: [totalReceitas, totalDespesas],
                backgroundColor: [
                    'rgba(37, 211, 102, 0.8)',
                    'rgba(220, 53, 69, 0.8)'
                ],
                borderColor: [
                    'rgba(37, 211, 102, 1)',
                    'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 14
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return label + ': R$ ' + value.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico rápido renderizado');
}


console.log('✅ Função de gráfico rápido configurada');

// ========================================
// PARTE 20: GRÁFICO MENSAL (RECEITAS vs DESPESAS)
// ========================================

let monthlyChart = null;

function renderMonthlyChart() {
    console.log('📊 Renderizando gráfico mensal...');
    
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;
    
    // Destrói o gráfico anterior se existir
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // Agrupa transações por mês
    const monthlyData = {};
    
    transactions.forEach(t => {
        const date = new Date(t.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                receitas: 0,
                despesas: 0
            };
        }
        
        if (t.type === 'receita') {
            monthlyData[monthKey].receitas += Number(t.amount);
        } else {
            monthlyData[monthKey].despesas += Number(t.amount);
        }
    });
    
    // Ordena os meses
    const sortedMonths = Object.keys(monthlyData).sort();
    
    // Nomes dos meses
    const monthNames = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    // Prepara os dados para o gráfico
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return `${monthNames[parseInt(month) - 1]}/${year}`;
    });
    
    const receitasData = sortedMonths.map(m => monthlyData[m].receitas);
    const despesasData = sortedMonths.map(m => monthlyData[m].despesas);
    
    // Cria o gráfico
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: receitasData,
                    backgroundColor: 'rgba(37, 211, 102, 0.7)',
                    borderColor: 'rgba(37, 211, 102, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Despesas',
                    data: despesasData,
                    backgroundColor: 'rgba(220, 53, 69, 0.7)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return label + ': R$ ' + value.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico mensal renderizado');
}

console.log('✅ Função de gráfico mensal configurada');

// ========================================
// PARTE 21: GRÁFICO DE PIZZA (DESPESAS)
// ========================================

let expensesPieChart = null;

function renderExpensesPieChart() {
    console.log('📊 Renderizando gráfico de distribuição de despesas...');
    
    const ctx = document.getElementById('expenses-pie-chart');
    if (!ctx) return;
    
    // Destrói o gráfico anterior se existir
    if (expensesPieChart) {
        expensesPieChart.destroy();
    }
    
    // Agrupa despesas por descrição
    const expensesData = {};
    
    transactions.forEach(t => {
        if (t.type === 'despesa') {
            if (!expensesData[t.desc]) {
                expensesData[t.desc] = 0;
            }
            expensesData[t.desc] += Number(t.amount);
        }
    });
    
    // Pega as top 5 despesas
    const sortedExpenses = Object.entries(expensesData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (sortedExpenses.length === 0) {
        ctx.parentElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-pie"></i>
                <h3>Nenhuma despesa cadastrada</h3>
            </div>
        `;
        return;
    }
    
    const labels = sortedExpenses.map(e => e[0]);
    const data = sortedExpenses.map(e => e[1]);
    
    // Cores variadas
    const colors = [
        'rgba(220, 53, 69, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(0, 212, 255, 0.8)',
        'rgba(156, 39, 176, 0.8)',
        'rgba(255, 152, 0, 0.8)'
    ];
    
    // Cria o gráfico
    expensesPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return label + ': R$ ' + value.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }) + ` (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico de pizza de despesas renderizado');
}

console.log('✅ Função de gráfico de pizza configurada');

// ========================================
// PARTE 22: TABELA DE MAIORES GASTOS
// ========================================

function renderTopExpenses() {
    console.log('📊 Renderizando tabela de maiores gastos...');
    
    const tbody = document.getElementById('top-expenses-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Filtra apenas despesas e ordena por valor
    const expenses = transactions
        .filter(t => t.type === 'despesa')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // Top 10
    
    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-gray);">
                    Nenhuma despesa cadastrada
                </td>
            </tr>
        `;
        return;
    }
    
    expenses.forEach((expense, index) => {
        const row = document.createElement('tr');
        
        const formattedAmount = Number(expense.amount).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        row.innerHTML = `
            <td style="text-align: left;">
                <strong>${index + 1}.</strong> ${expense.desc}
            </td>
            <td style="font-weight: 700; color: var(--danger-color);">
                R$ ${formattedAmount}
            </td>
            <td style="color: var(--text-gray);">
                ${expense.date}
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('✅ Tabela de maiores gastos renderizada');
}

console.log('✅ Função de maiores gastos configurada');

// ========================================
// PARTE 23: ANÁLISE DE MELHORES E PIORES MESES
// ========================================

function renderBestAndWorstMonths() {
    console.log('📊 Analisando melhores e piores meses...');
    
    // Agrupa transações por mês
    const monthlyData = {};
    
    transactions.forEach(t => {
        const date = new Date(t.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                receitas: 0,
                despesas: 0
            };
        }
        
        if (t.type === 'receita') {
            monthlyData[monthKey].receitas += Number(t.amount);
        } else {
            monthlyData[monthKey].despesas += Number(t.amount);
        }
    });
    
    if (Object.keys(monthlyData).length === 0) {
        // Sem dados
        document.getElementById('best-revenue-month').textContent = 'Sem dados';
        document.getElementById('best-revenue-value').textContent = '0,00';
        document.getElementById('worst-expense-month').textContent = 'Sem dados';
        document.getElementById('worst-expense-value').textContent = '0,00';
        return;
    }
    
    // Nomes dos meses
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Encontra o mês com maior receita
    let bestRevenueMonth = null;
    let bestRevenueValue = 0;
    
    Object.entries(monthlyData).forEach(([month, data]) => {
        if (data.receitas > bestRevenueValue) {
            bestRevenueValue = data.receitas;
            bestRevenueMonth = month;
        }
    });
    
    // Encontra o mês com maior despesa
    let worstExpenseMonth = null;
    let worstExpenseValue = 0;
    
    Object.entries(monthlyData).forEach(([month, data]) => {
        if (data.despesas > worstExpenseValue) {
            worstExpenseValue = data.despesas;
            worstExpenseMonth = month;
        }
    });
    
    // Formata e exibe o melhor mês de receita
    if (bestRevenueMonth) {
        const [year, month] = bestRevenueMonth.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        document.getElementById('best-revenue-month').textContent = `${monthName} ${year}`;
        document.getElementById('best-revenue-value').textContent = bestRevenueValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    // Formata e exibe o pior mês de despesa
    if (worstExpenseMonth) {
        const [year, month] = worstExpenseMonth.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        document.getElementById('worst-expense-month').textContent = `${monthName} ${year}`;
        document.getElementById('worst-expense-value').textContent = worstExpenseValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    console.log('✅ Análise de meses concluída:', {
        melhorReceita: bestRevenueMonth,
        valorReceita: bestRevenueValue,
        piorDespesa: worstExpenseMonth,
        valorDespesa: worstExpenseValue
    });
}

console.log('✅ Função de análise de meses configurada');

// ========================================
// PARTE 24: RENDERIZAÇÃO COMPLETA DE RELATÓRIOS
// ========================================

function renderReportsCharts() {
    console.log('📊 Renderizando todos os gráficos de relatórios...');
    
    if (transactions.length === 0) {
        console.warn('⚠️ Nenhuma transação disponível para gerar relatórios');
        showToast('Adicione transações para visualizar os relatórios', 'info', 3000);
        return;
    }
    
    // Renderiza todos os gráficos e análises
    renderMonthlyChart();
    renderExpensesPieChart();
    renderTopExpenses();
    renderBestAndWorstMonths();
    
    console.log('✅ Todos os relatórios renderizados com sucesso');
}

console.log('✅ Função principal de relatórios configurada');

// ========================================
// PARTE 25: ASSISTENTE DE IA - CONFIGURAÇÃO
// ========================================

const aiChat = document.getElementById('ai-chat');
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiSuggestionBtns = document.querySelectorAll('.ai-suggestion-btn');

// Adiciona mensagem do usuário ao chat
function addUserMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message ai-user';
    messageDiv.innerHTML = `
        <div class="ai-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="ai-content">
            <p>${message}</p>
        </div>
    `;
    aiChat.appendChild(messageDiv);
    aiChat.scrollTop = aiChat.scrollHeight;
}

// Adiciona mensagem do assistente ao chat
function addAssistantMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message ai-system';
    messageDiv.innerHTML = `
        <div class="ai-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-content">
            ${message}
        </div>
    `;
    aiChat.appendChild(messageDiv);
    aiChat.scrollTop = aiChat.scrollHeight;
}

// Adiciona mensagem de loading
function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message ai-system ai-loading';
    messageDiv.innerHTML = `
        <div class="ai-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-content">
            <p><i class="fas fa-spinner fa-spin"></i> Analisando...</p>
        </div>
    `;
    aiChat.appendChild(messageDiv);
    aiChat.scrollTop = aiChat.scrollHeight;
    return messageDiv;
}

console.log('✅ Funções de mensagens da IA configuradas');

// ========================================
// PARTE 26: ASSISTENTE DE IA - ANÁLISES
// ========================================

function analyzeFinances() {
    console.log('🤖 IA analisando finanças...');
    
    if (transactions.length === 0) {
        return '<p>Você ainda não tem transações cadastradas. Comece adicionando suas receitas e despesas para que eu possa fazer uma análise completa.</p>';
    }
    
    // Calcula totais
    let totalReceitas = 0;
    let totalDespesas = 0;
    
    transactions.forEach(t => {
        if (t.type === 'receita') {
            totalReceitas += Number(t.amount);
        } else {
            totalDespesas += Number(t.amount);
        }
    });
    
    const saldo = totalReceitas - totalDespesas;
    const percentualDespesas = totalReceitas > 0 ? (totalDespesas / totalReceitas * 100) : 0;
    
    // Análise
    let analysis = '<p><strong>📊 Análise Financeira Completa:</strong></p><ul>';
    
    analysis += `<li><strong>Receitas Totais:</strong> R$ ${totalReceitas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</li>`;
    analysis += `<li><strong>Despesas Totais:</strong> R$ ${totalDespesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</li>`;
    analysis += `<li><strong>Saldo Atual:</strong> R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</li>`;
    analysis += `<li><strong>Percentual de Despesas:</strong> ${percentualDespesas.toFixed(1)}%</li>`;
    analysis += '</ul>';
    
    // Recomendações
    analysis += '<p><strong>💡 Recomendações:</strong></p><ul>';
    
    if (saldo < 0) {
        analysis += '<li>⚠️ <strong>Atenção!</strong> Suas despesas estão maiores que suas receitas. É importante reduzir gastos ou aumentar receitas.</li>';
    } else if (saldo > 0 && saldo < totalReceitas * 0.1) {
        analysis += '<li>⚠️ Seu saldo está positivo, mas baixo. Tente economizar mais para criar uma reserva de emergência.</li>';
    } else {
        analysis += '<li>✅ Excelente! Você está com saldo positivo. Continue assim e considere investir o excedente.</li>';
    }
    
    if (percentualDespesas > 80) {
        analysis += '<li>⚠️ Suas despesas representam mais de 80% das receitas. Tente reduzir gastos desnecessários.</li>';
    } else if (percentualDespesas < 50) {
        analysis += '<li>✅ Ótimo controle de gastos! Você está gastando menos de 50% de suas receitas.</li>';
    }
    
    analysis += '</ul>';
    
    return analysis;
}

function provideSavingsTips() {
    console.log('🤖 IA fornecendo dicas de economia...');
    
    let tips = '<p><strong>💰 Dicas para Economizar Mais:</strong></p><ul>';
    
    tips += '<li><strong>Regra 50-30-20:</strong> Destine 50% para necessidades, 30% para desejos e 20% para poupança/investimentos.</li>';
    tips += '<li><strong>Corte gastos pequenos:</strong> Café fora, assinaturas não utilizadas e compras por impulso somam muito no fim do mês.</li>';
    tips += '<li><strong>Compare preços:</strong> Antes de comprar, pesquise em diferentes lojas e online.</li>';
    tips += '<li><strong>Prepare refeições:</strong> Cozinhar em casa é muito mais econômico que comer fora.</li>';
    tips += '<li><strong>Crie metas:</strong> Use a aba de Metas para definir objetivos financeiros claros.</li>';
    tips += '<li><strong>Automatize sua poupança:</strong> Separe uma quantia fixa assim que receber.</li>';
    tips += '<li><strong>Evite dívidas caras:</strong> Cartão de crédito e cheque especial têm juros altíssimos.</li>';
    tips += '</ul>';
    
    return tips;
}

function findBiggestExpense() {
    console.log('🤖 IA buscando maiores gastos...');
    
    if (transactions.length === 0) {
        return '<p>Você ainda não tem despesas cadastradas.</p>';
    }
    
    const expenses = transactions
        .filter(t => t.type === 'despesa')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    
    if (expenses.length === 0) {
        return '<p>Você não tem despesas cadastradas ainda.</p>';
    }
    
    let response = '<p><strong>💸 Seus Maiores Gastos:</strong></p><ul>';
    
    expenses.forEach((expense, index) => {
        const formattedAmount = Number(expense.amount).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        response += `<li><strong>${index + 1}.</strong> ${expense.desc} - R$ ${formattedAmount} (${expense.date})</li>`;
    });
    
    response += '</ul>';
    response += '<p>💡 <strong>Dica:</strong> Analise se esses gastos são realmente necessários ou se podem ser reduzidos.</p>';
    
    return response;
}

console.log('✅ Funções de análise da IA configuradas');

// ========================================
// PARTE 27: PROCESSAMENTO DE PERGUNTAS DA IA
// ========================================

function processAIQuestion(question) {
    console.log('🤖 Processando pergunta:', question);
    
    const lowerQuestion = question.toLowerCase();
    
    // Analise de finanças
    if (lowerQuestion.includes('analisa') || lowerQuestion.includes('análise') || 
        lowerQuestion.includes('finanças') || lowerQuestion.includes('financeiro')) {
        return analyzeFinances();
    }
    
    // Dicas de economia
    if (lowerQuestion.includes('economizar') || lowerQuestion.includes('economia') || 
        lowerQuestion.includes('poupar') || lowerQuestion.includes('dicas')) {
        return provideSavingsTips();
    }
    
    // Maiores gastos
    if (lowerQuestion.includes('maior') || lowerQuestion.includes('gasto') || 
        lowerQuestion.includes('despesa') || lowerQuestion.includes('gastei')) {
        return findBiggestExpense();
    }
    
    // Saldo
    if (lowerQuestion.includes('saldo') || lowerQuestion.includes('quanto tenho')) {
        let totalReceitas = 0;
        let totalDespesas = 0;
        
        transactions.forEach(t => {
            if (t.type === 'receita') {
                totalReceitas += Number(t.amount);
            } else {
                totalDespesas += Number(t.amount);
            }
        });
        
        const saldo = totalReceitas - totalDespesas;
        
        return `<p>Seu saldo atual é de <strong>R$ ${saldo.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}</strong>.</p>`;
    }
    
    // Metas
    if (lowerQuestion.includes('meta') || lowerQuestion.includes('objetivo')) {
        if (goals.length === 0) {
            return '<p>Você ainda não tem metas cadastradas. Acesse a aba <strong>Metas</strong> para criar suas primeiras metas financeiras!</p>';
        }
        
        let response = '<p><strong>🎯 Suas Metas:</strong></p><ul>';
        
        goals.forEach(goal => {
            const percentage = Math.min((goal.current / goal.target) * 100, 100);
            const status = goal.current >= goal.target ? '✅ Concluída' : '⏳ Em andamento';
            response += `<li><strong>${goal.title}:</strong> ${goal.current}/${goal.target} ${goal.unit} (${percentage.toFixed(1)}%) - ${status}</li>`;
        });
        
        response += '</ul>';
        return response;
    }
    
    // Receitas
    if (lowerQuestion.includes('receita') || lowerQuestion.includes('ganho') || 
        lowerQuestion.includes('entrada')) {
        const totalReceitas = transactions
            .filter(t => t.type === 'receita')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        return `<p>Suas receitas totais são de <strong>R$ ${totalReceitas.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}</strong>.</p>`;
    }
    
    // Resposta padrão
    return `<p>Desculpe, não entendi sua pergunta. Posso ajudá-lo com:</p>
            <ul>
                <li>Análise das suas finanças</li>
                <li>Dicas para economizar</li>
                <li>Informações sobre maiores gastos</li>
                <li>Consulta de saldo e receitas</li>
                <li>Acompanhamento de metas</li>
            </ul>
            <p>Tente fazer uma pergunta sobre esses tópicos!</p>`;
}

console.log('✅ Função de processamento de perguntas da IA configurada');

// ========================================
// PARTE 28: EVENT LISTENERS DA IA
// ========================================

// Enviar mensagem ao pressionar Enter
aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendAIMessage();
    }
});

// Enviar mensagem ao clicar no botão
aiSendBtn.addEventListener('click', () => {
    sendAIMessage();
});

// Função para enviar mensagem
function sendAIMessage() {
    const message = aiInput.value.trim();
    
    if (!message) {
        showToast('Digite uma pergunta', 'warning', 2000);
        return;
    }
    
    console.log('📤 Enviando mensagem para IA:', message);
    
    // Adiciona mensagem do usuário
    addUserMessage(message);
    
    // Limpa o input
    aiInput.value = '';
    
    // Mostra loading
    const loadingMsg = addLoadingMessage();
    
    // Simula processamento (pode adicionar delay para parecer mais real)
    setTimeout(() => {
        // Remove loading
        loadingMsg.remove();
        
        // Processa e adiciona resposta
        const response = processAIQuestion(message);
        addAssistantMessage(response);
        
        console.log('✅ Resposta da IA enviada');
    }, 1000);
}

// Botões de sugestão
aiSuggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const question = btn.getAttribute('data-question');
        aiInput.value = question;
        sendAIMessage();
    });
});

console.log('✅ Event listeners da IA configurados');

// ========================================
// PARTE 29: INICIALIZAÇÃO DO SISTEMA
// ========================================

// Função de inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Sistema Financeiro Dev Digital BR...');
    console.log('📅 Data atual:', new Date().toLocaleDateString('pt-BR'));
    
    // Verifica se o Firebase está inicializado
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase não está carregado!');
        showToast('Erro ao carregar Firebase', 'error');
        return;
    }
    
    console.log('✅ Firebase detectado');
    
    // ADICIONADO: Inicializa reconhecimento de voz e dashboard
    initVoiceRecognition();
    loadDashboard();
    
    console.log('✅ Sistema pronto para uso');
    // Mensagem de boas-vindas no console
    console.log('%c💰 Sistema Financeiro Dev Digital BR', 'color: #00d4ff; font-size: 20px; font-weight: bold;');
    console.log('%c🔐 Sistema protegido com autenticação Firebase', 'color: #25d366; font-size: 12px;');
    console.log('%c📊 Recursos: Dashboard, Transações, Relatórios, Metas e IA', 'color: #ffc107; font-size: 12px;');
    console.log('%c🎤 Reconhecimento de voz ativado!', 'color: #764ba2; font-size: 12px;');
});

console.log('✅ Sistema de inicialização configurado');

// ========================================
// PARTE 30: FUNÇÕES AUXILIARES
// ========================================

// Formata valor em reais
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Formata data
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
}

// Formata data com hora
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR');
}

// Calcula porcentagem
function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return (value / total) * 100;
}

// Valida email
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Gera ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Debounce (útil para otimizar pesquisas)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Log personalizado
function logSuccess(message) {
    console.log('%c✅ ' + message, 'color: #25d366; font-weight: bold;');
}

function logError(message) {
    console.error('%c❌ ' + message, 'color: #dc3545; font-weight: bold;');
}

function logInfo(message) {
    console.log('%c📌 ' + message, 'color: #00d4ff; font-weight: bold;');
}

console.log('✅ Funções auxiliares configuradas');

// ========================================
// PARTE 31: FINALIZAÇÃO
// ========================================

// Exporta funções globais necessárias
window.deleteTransaction = deleteTransaction;
window.updateGoalProgress = updateGoalProgress;
window.deleteGoal = deleteGoal;

// Previne fechamento acidental com dados não salvos
window.addEventListener('beforeunload', (e) => {
    // Só avisa se houver dados no formulário
    const transactionFormFilled = document.getElementById('desc').value || 
                                  document.getElementById('amount').value;
    const goalFormFilled = document.getElementById('goal-title') && 
                          document.getElementById('goal-title').value;
    
    if (transactionFormFilled || goalFormFilled) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Log final
console.log('%c🎉 SISTEMA TOTALMENTE CARREGADO E PRONTO!', 'color: #00d4ff; font-size: 16px; font-weight: bold;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00d4ff;');
console.log('%c💰 Dev Digital BR - Sistema Financeiro', 'color: #ffffff; font-size: 14px;');
console.log('%c📊 Funcionalidades Ativas:', 'color: #ffc107; font-weight: bold;');
console.log('%c  ✅ Autenticação Firebase', 'color: #25d366;');
console.log('%c  ✅ Dashboard com Resumo', 'color: #25d366;');
console.log('%c  ✅ Gerenciamento de Transações', 'color: #25d366;');
console.log('%c  ✅ Filtros por Tipo e Mês', 'color: #25d366;');
console.log('%c  ✅ Relatórios com Gráficos', 'color: #25d366;');
console.log('%c  ✅ Sistema de Metas', 'color: #25d366;');
console.log('%c  ✅ Assistente de IA', 'color: #25d366;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00d4ff;');

// FIM DO ARQUIVO JAVASCRIPT
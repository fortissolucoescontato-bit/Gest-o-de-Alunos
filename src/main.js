import './style.css';
import { createIcons, LayoutDashboard, Users, Receipt, Calendar, FileBarChart, Eye, Trash2, ExternalLink, Pencil } from 'lucide';
import { Chart, registerables } from 'chart.js';
import { state, getters, actions, loadInitialData } from './state.js';

Chart.register(...registerables);

// Initialize Icons
const initIcons = () => {
  createIcons({
    icons: { LayoutDashboard, Users, Receipt, Calendar, FileBarChart, Eye, Trash2, ExternalLink, Pencil }
  });
};

// --- View Rendering ---

const renderDashboard = () => {
  const container = document.getElementById('view-container');
  const arrecadado = getters.getTotalArrecadado();
  const gasto = getters.getTotalGasto();
  const saldo = getters.getSaldo();

  container.innerHTML = `
    <div class="stats-grid">
      <div class="glass-card stat-card">
        <div class="label">Total Arrecadado</div>
        <div class="value" style="color: var(--success)">R$ ${arrecadado.toLocaleString()}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="label">Total Gasto</div>
        <div class="value" style="color: var(--error)">R$ ${gasto.toLocaleString()}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="label">Saldo em Conta</div>
        <div class="value" style="color: var(--accent-gold)">R$ ${saldo.toLocaleString()}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="label">Inadimplentes</div>
        <div class="value">${getters.getPendingStudents()}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
      <div class="glass-card">
        <h3>Progresso Financeiro</h3>
        <canvas id="mainChart" height="200"></canvas>
      </div>
      <div class="glass-card">
        <h3>Últimos Lançamentos</h3>
        <ul style="list-style: none; margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
          ${state.students
      .filter(s => s.installments.length > 0)
      .slice(0, 5)
      .map(s => {
        const lastInst = s.installments[s.installments.length - 1];
        const amount = typeof lastInst === 'object' ? lastInst.amount : lastInst;
        return `
                <li style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                  <span>${s.name}</span>
                  <span style="color: var(--success)">+ R$ ${amount.toLocaleString()}</span>
                </li>
              `;
      }).join('')}
          ${state.students.filter(s => s.installments.length > 0).length === 0 ? '<li style="color: var(--text-secondary); font-size: 0.875rem;">Nenhum lançamento recente</li>' : ''}
        </ul>
      </div>
    </div>
  `;

  // Init Chart
  const ctx = document.getElementById('mainChart').getContext('2d');
  const monthlyArrecadacao = getters.getMonthlyArrecadacao();
  const target = state.config.targetAmount;

  // Create a linear target line
  const targetData = new Array(12).fill(0).map((_, i) => (target / 12) * (i + 1));

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      datasets: [
        {
          label: 'Arrecadação Real',
          data: monthlyArrecadacao,
          borderColor: '#1e293b',
          backgroundColor: 'rgba(30, 41, 59, 0.05)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Meta',
          data: targetData,
          borderColor: '#94a3b8',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: { color: '#64748b', font: { size: 12, weight: '600' } }
        }
      },
      scales: {
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            color: '#64748b',
            callback: (value) => 'R$ ' + value.toLocaleString()
          }
        },
        x: { grid: { display: false }, ticks: { color: '#64748b' } }
      }
    }
  });
};

const renderStudents = () => {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="glass-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h3>Lista de Alunos</h3>
        <button class="btn-primary" id="add-student-btn">Adicionar Aluno</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Total Contratado</th>
            <th>Total Pago</th>
            <th>Pendente</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${state.students.map(s => `
            <tr>
              <td>${s.name}</td>
              <td>R$ ${s.total}</td>
              <td>R$ ${s.paid}</td>
              <td style="color: var(--error)">R$ ${s.total - s.paid}</td>
              <td><span class="status-badge status-${s.status}">${s.status.toUpperCase()}</span></td>
              <td style="display: flex; gap: 0.5rem;">
                <button class="btn-icon" onclick="window.viewStudent('${s.id}')">
                  <i data-lucide="eye"></i> Ver
                </button>
                <button class="btn-icon delete-btn" onclick="window.removeStudent('${s.id}')">
                  <i data-lucide="trash-2"></i> Excluir
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  initIcons();

  document.getElementById('add-student-btn').onclick = () => {
    const name = prompt('Nome do Aluno:');
    const total = prompt('Valor do Contrato (R$):', '2000');
    if (name && total) {
      actions.addStudent(name, parseInt(total)).then(() => renderStudents());
    }
  };
};

window.removeStudent = async (id) => {
  if (confirm('Tem certeza que deseja remover este aluno?')) {
    await actions.deleteStudent(id);
    renderStudents();
  }
};

window.viewStudent = (id) => {
  renderStudentDetails(id);
};

const renderStudentDetails = (id) => {
  const student = state.students.find(s => s.id === id);
  const container = document.getElementById('view-container');

  container.innerHTML = `
    <div class="fade-in">
      <button class="btn-secondary" onclick="window.switchView('students')" style="margin-bottom: 1.5rem;">
        ← Voltar para Lista
      </button>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div class="glass-card">
          <h3>Dados do Aluno</h3>
          <form id="edit-student-form" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">Nome Completo</label>
              <input type="text" name="name" value="${student.name}" class="ai-input" style="padding: 0.75rem;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">Valor Total Contratado (R$)</label>
              <input type="number" name="total" value="${student.total}" class="ai-input" style="padding: 0.75rem;">
            </div>
            <button type="submit" class="btn-primary">Salvar Alterações</button>
          </form>
        </div>
        
        <div class="glass-card">
          <h3>Comprovantes de Pagamento</h3>
          <div style="margin-top: 1rem;">
             <div class="drop-zone" id="receipt-drop-zone">
               <p>Arraste arquivos para cá ou <br> <span style="color: var(--accent-gold); cursor: pointer;">clique para selecionar</span></p>
               <input type="file" id="receipt-input" style="display: none;">
             </div>
             
             <ul style="list-style: none; margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
               ${student.receipts.length === 0 ? '<li style="color: var(--text-secondary); text-align: center;">Nenhum comprovante anexado</li>' : ''}
               ${student.receipts.map(r => `
                 <li class="glass-card" style="padding: 0.75rem; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                   <div style="flex: 1;">
                     <div style="font-weight: 600;">${r.filename}</div>
                     <div style="font-size: 0.75rem; color: var(--text-secondary)">${r.date}</div>
                   </div>
                   <div style="display: flex; gap: 0.5rem;">
                     <a href="${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/comprovantes/${r.filename}" target="_blank" class="btn-icon">
                       <i data-lucide="external-link"></i> Abrir
                     </a>
                     <button class="btn-icon delete-btn" onclick="window.removeReceipt('${student.id}', '${r.id}')">
                       <i data-lucide="trash-2" style="width: 16px;"></i> Excluir
                     </button>
                   </div>
                 </li>
               `).join('')}
             </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  initIcons();

  // Define removeReceipt globally
  window.removeReceipt = async (studentId, receiptId) => {
    if (confirm('Deseja remover este comprovante?')) {
      await actions.deleteStudentReceipt(receiptId);
      renderStudentDetails(studentId);
    }
  };

  // Handle Edit Submit
  const form = document.getElementById('edit-student-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      await actions.updateStudent(id, {
        name: formData.get('name'),
        total: parseInt(formData.get('total'))
      });
      renderStudentDetails(id);
    };
  }

  // Handle Receipt Upload
  const dropZone = document.getElementById('receipt-drop-zone');
  const fileInput = document.getElementById('receipt-input');

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = async (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        await actions.addStudentReceipt(id, file);
        renderStudentDetails(id);
      }
    };
  }
};

const renderExpenses = () => {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="glass-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h3>Controle de Despesas</h3>
        <button class="btn-primary" id="add-expense-btn">Nova Despesa</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th>Serviço</th>
            <th>Data</th>
            <th>Valor Total</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${state.expenses.map(e => `
            <tr>
              <td>${e.provider}</td>
              <td>${e.service}</td>
              <td>${e.date}</td>
              <td>R$ ${e.total}</td>
              <td><span class="status-badge status-${e.paid >= e.total ? 'paid' : 'pending'}">
                ${e.paid >= e.total ? 'PAGO' : 'PARCIAL'}
              </span></td>
              <td style="display: flex; gap: 0.5rem;">
                <button class="btn-icon" onclick="window.viewExpense('${e.id}')">
                  <i data-lucide="pencil" style="width: 16px;"></i> Editar
                </button>
                <button class="btn-icon delete-btn" onclick="window.removeExpense('${e.id}')">
                  <i data-lucide="trash-2" style="width: 16px;"></i> Excluir
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  initIcons();

  document.getElementById('add-expense-btn').onclick = () => {
    showModal('Lançar Nova Despesa', `
      <div class="form-group">
        <label>Fornecedor</label>
        <input type="text" id="modal-expense-provider" class="ai-input" placeholder="Ex: Buffet Imperial">
      </div>
      <div class="form-group">
        <label>Valor Total (R$)</label>
        <input type="number" id="modal-expense-total" class="ai-input">
      </div>
    `, async () => {
      const provider = document.getElementById('modal-expense-provider').value;
      const total = document.getElementById('modal-expense-total').value;
      if (provider && total) {
        await actions.addExpense(provider, parseInt(total));
        renderExpenses();
        return true;
      }
      return false;
    });
  };
};

window.viewExpense = (id) => {
  renderExpenseDetails(id);
};

const renderExpenseDetails = (id) => {
  const expense = state.expenses.find(e => e.id === id);
  const container = document.getElementById('view-container');

  container.innerHTML = `
    <div class="fade-in">
      <button class="btn-secondary" onclick="window.switchView('expenses')" style="margin-bottom: 1.5rem;">
        ← Voltar para Lista
      </button>
      
      <div class="glass-card" style="max-width: 600px; margin: 0 auto;">
        <h3>Editar Despesa</h3>
        <form id="edit-expense-form" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">Fornecedor</label>
            <input type="text" name="provider" value="${expense.provider}" class="ai-input" style="padding: 0.75rem;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">Serviço</label>
            <input type="text" name="service" value="${expense.service}" class="ai-input" style="padding: 0.75rem;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">Valor Total (R$)</label>
              <input type="number" name="total" value="${expense.total}" class="ai-input" style="padding: 0.75rem;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">Valor Pago (R$)</label>
              <input type="number" name="paid" value="${expense.paid}" class="ai-input" style="padding: 0.75rem;">
            </div>
          </div>
          <button type="submit" class="btn-primary">Atualizar Despesa</button>
        </form>
      </div>
    </div>
  `;

  initIcons();

  const form = document.getElementById('edit-expense-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      await actions.updateExpense(id, {
        provider: formData.get('provider'),
        service: formData.get('service'),
        total: parseInt(formData.get('total')),
        paid: parseInt(formData.get('paid'))
      });
      renderExpenses();
    };
  }
};

window.removeExpense = async (id) => {
  if (confirm('Remover esta despesa?')) {
    await actions.deleteExpense(id);
    renderExpenses();
  }
};

const renderCalendar = (selectedMonth = new Date().getMonth()) => {
  const container = document.getElementById('view-container');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Combined all financial events and custom events
  const year = 2026;
  const financialEvents = [
    ...state.expenses.map(e => ({ title: `Pagar: ${e.provider} `, date: e.date, type: 'expense', value: e.total })),
    ...state.students.filter(s => s.status === 'late').map(s => ({ title: `Atraso: ${s.name} `, date: '2026-02-28', type: 'late', value: s.total - s.paid })),
    ...state.events.map(ev => ({ ...ev, type: 'custom' }))
  ];

  const filteredEvents = financialEvents.filter(e => new Date(e.date).getMonth() === selectedMonth);

  container.innerHTML = `
    <div class="glass-card fade-in">
       <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h3>Calendário de Eventos</h3>
          <button class="btn-primary" id="add-calendar-event">Novo Evento</button>
       </div>

       <div style="display: flex; gap: 0.75rem; margin-bottom: 2.5rem; overflow-x: auto; padding-bottom: 1rem; scrollbar-width: thin;">
          ${months.map((m, i) => `
            <div class="glass-card ${i === selectedMonth ? 'active' : ''}" 
                 onclick="window.switchMonth(${i})"
                 style="min-width: 120px; text-align: center; cursor: pointer; padding: 1rem; flex-shrink: 0;">
              <div style="font-weight: 700;">${m}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary)">2026</div>
            </div>
          `).join('')}
       </div>

       <h3>Eventos de ${months[selectedMonth]} ${year}</h3>
       <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
          ${filteredEvents.length === 0 ? '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Sem eventos programados para este mês.</p>' : ''}
          ${filteredEvents.map(e => `
            <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${e.type === 'late' ? 'var(--error)' : (e.type === 'expense' ? 'var(--accent-gold)' : '#3b82f6')}">
              <div style="flex: 1;">
                <div style="font-weight: 700;">${e.title}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary)">
                  ${new Date(e.date).toLocaleDateString('pt-BR')} 
                  ${e.description ? `• ${e.description}` : ''}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="font-weight: 800; color: ${e.type === 'late' ? 'var(--error)' : 'var(--text-primary)'}">
                  ${e.value ? `R$ ${e.value.toLocaleString()}` : ''}
                </div>
                ${e.type === 'custom' ? `
                  <button class="btn-icon delete-btn" onclick="window.removeEvent('${e.id}')">
                    <i data-lucide="trash-2" style="width: 16px;"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
       </div>
    </div>
  `;

  initIcons();

  document.getElementById('add-calendar-event').onclick = () => {
    showModal('Novo Evento no Calendário', `
      <div class="form-group">
        <label>Título do Evento</label>
        <input type="text" id="modal-event-title" class="ai-input" placeholder="Ex: Reunião de Formatura">
      </div>
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="modal-event-date" class="ai-input">
      </div>
      <div class="form-group">
        <label>Descrição (opcional)</label>
        <input type="text" id="modal-event-desc" class="ai-input" placeholder="Ex: No auditório da escola">
      </div>
    `, async () => {
      const title = document.getElementById('modal-event-title').value;
      const date = document.getElementById('modal-event-date').value;
      const desc = document.getElementById('modal-event-desc').value;
      if (title && date) {
        await actions.addEvent(title, date, desc);
        renderCalendar(new Date(date).getMonth());
        return true;
      }
      return false;
    });
  };
};

window.switchMonth = (index) => renderCalendar(index);

window.removeEvent = async (id) => {
  if (confirm('Deseja remover este evento?')) {
    await actions.deleteEvent(id);
    const activeMonth = document.querySelector('.glass-card.active')?.getAttribute('onclick')?.match(/\d+/)?.[0] || 0;
    renderCalendar(parseInt(activeMonth));
  }
};

// --- Routing ---

window.switchView = (viewId) => {
  const titles = {
    dashboard: ['Dashboard Financeiro', 'Visão geral da formatura 2026'],
    students: ['Gestão de Alunos', 'Controle de mensalidades e contratos'],
    expenses: ['Fornecedores & Despesas', 'Controle de pagamentos de serviços'],
    calendar: ['Calendário Financeiro', 'Próximos vencimentos e eventos'],
    reports: ['Prestação de Contas', 'Relatórios detalhados para pais e comissão']
  };

  const container = document.getElementById('view-container');
  if (!container) return;

  const viewData = titles[viewId];
  if (viewData) {
    document.getElementById('view-title').textContent = viewData[0];
    document.getElementById('view-subtitle').textContent = viewData[1];
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  if (viewId === 'dashboard') renderDashboard();
  else if (viewId === 'students') renderStudents();
  else if (viewId === 'expenses') renderExpenses();
  else if (viewId === 'calendar') renderCalendar();
  else {
    container.innerHTML = `
    <div class="glass-card" style="text-align: center; padding: 4rem;">
        <i data-lucide="construction" style="width: 48px; height: 48px; color: var(--accent-gold); margin-bottom: 1rem;"></i>
        <h2>Módulo em Desenvolvimento</h2>
        <p style="color: var(--text-secondary)">Esta funcionalidade estará disponível em breve.</p>
      </div>
  `;
    initIcons();
  }
};

// --- AI Command Processor ---

const processCommand = async (command) => {
  const cmd = command.trim();
  if (!cmd) return;

  if (cmd.toLowerCase() === 'reset' || cmd.toLowerCase() === 'reiniciar' || cmd.toLowerCase() === 'limpar tudo') {
    if (confirm('ATENÇÃO: Isso irá apagar todos os dados e restaurar a lista inicial de alunos. Continuar?')) {
      localStorage.clear();
      location.reload();
      return;
    }
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    alert('Erro: Chave da API do Groq não configurada no arquivo .env');
    return;
  }

  // Show a simple loading state in the input if possible, or just proceed
  const aiInput = document.getElementById('ai-command-bar');
  const originalPlaceholder = aiInput.placeholder;
  aiInput.disabled = true;
  aiInput.placeholder = "Processando com IA...";

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente financeiro de uma comissão de formatura. 
            Sua tarefa é extrair ações de comandos de texto.
            As ações possíveis são:
            1. 'payment': Quando um aluno paga algo. Extraia 'name' (string) e 'amount' (number).
            2. 'expense': Quando a comissão paga um fornecedor/serviço. Extraia 'provider' (string) e 'amount' (number).
            
            Responda APENAS com um objeto JSON puro, sem markdown, no formato:
            {"action": "payment", "name": "Nome", "amount": 100} ou {"action": "expense", "provider": "Nome", "amount": 100}
            Se não entender, responda: {"error": "Não entendi"}`
          },
          { role: 'user', content: cmd }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const resultJson = JSON.parse(data.choices[0].message.content);

    if (resultJson.error) {
      alert('IA: ' + resultJson.error);
    } else {
      let actionResult = null;
      if (resultJson.action === 'payment') {
        actionResult = await actions.addPayment(resultJson.name, resultJson.amount);
      } else if (resultJson.action === 'expense') {
        actionResult = await actions.addExpense(resultJson.provider, resultJson.amount);
      }

      if (actionResult) {
        alert(actionResult.message);
        const activeView = document.querySelector('.nav-item.active').dataset.view;
        switchView(activeView);
      }
    }
  } catch (error) {
    console.error('Groq Error:', error);
    alert('Erro ao processar comando com Groq. Verifique sua conexão ou chave de API.');
  } finally {
    aiInput.disabled = false;
    aiInput.placeholder = originalPlaceholder;
    aiInput.focus();
  }
};

const showModal = (title, content, onConfirm) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content fade-in">
      <h2 style="margin-bottom: 1.5rem; color: var(--accent-gold); font-weight: 800;">${title}</h2>
      <div>${content}</div>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-confirm">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('modal-cancel').onclick = () => document.body.removeChild(modal);
  document.getElementById('modal-confirm').onclick = async () => {
    if (await onConfirm()) {
      document.body.removeChild(modal);
    }
  };
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
  initIcons();

  // Show Loading state
  const container = document.getElementById('view-container');
  if (container) {
    container.innerHTML = `<div style="text-align: center; padding: 4rem;"><h3>Carregando dados do Supabase...</h3></div>`;
  }

  await loadInitialData();
  renderDashboard();

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  const aiInput = document.getElementById('ai-command-bar');
  aiInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      await processCommand(aiInput.value);
      aiInput.value = '';
    }
  });
});

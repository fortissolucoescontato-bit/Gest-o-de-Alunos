import './style.css';
import {
  createIcons, LayoutDashboard, Users, Receipt, Calendar, FileBarChart,
  Eye, Trash2, ExternalLink, Pencil, TrendingUp, TrendingDown, Wallet,
  AlertCircle, CheckCircle, Clock, Plus, Construction, ArrowLeft, UploadCloud, Save,
  DownloadCloud, PieChart, FileText, FileSpreadsheet
} from 'lucide';
import { Chart, registerables } from 'chart.js';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { state, getters, actions, loadInitialData } from './state.js';

Chart.register(...registerables);

// Initialize Icons
const initIcons = () => {
  createIcons({
    icons: {
      LayoutDashboard, Users, Receipt, Calendar, FileBarChart,
      Eye, Trash2, ExternalLink, Pencil, TrendingUp, TrendingDown,
      Wallet, AlertCircle, CheckCircle, Clock, Plus, Construction, ArrowLeft, UploadCloud, Save,
      DownloadCloud, PieChart, FileText, FileSpreadsheet
    }
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
        <div class="label" style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="trending-up" style="width: 16px; color: var(--success)"></i> Total Arrecadado
        </div>
        <div class="value" style="color: var(--text-primary)">R$ ${arrecadado.toLocaleString()}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="label" style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="trending-down" style="width: 16px; color: var(--error)"></i> Total Gasto
        </div>
        <div class="value" style="color: var(--text-primary)">R$ ${gasto.toLocaleString()}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="label" style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="wallet" style="width: 16px; color: var(--accent-gold)"></i> Saldo em Conta
        </div>
        <div class="value" style="color: var(--accent-gold)">R$ ${saldo.toLocaleString()}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="label" style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="alert-circle" style="width: 16px; color: var(--warning)"></i> Inadimplentes
        </div>
        <div class="value" style="color: var(--text-primary)">${getters.getPendingStudents()}</div>
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
                <li style="display: flex; justify-content: space-between; font-size: 0.95rem; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.02);">
                  <span style="font-weight: 500;">${s.name}</span>
                  <span style="color: var(--success); font-weight: 700; font-family: var(--font-display);">+ R$ ${amount.toLocaleString()}</span>
                </li>
              `;
      }).join('')}
          ${state.students.filter(s => s.installments.length > 0).length === 0 ? '<li style="color: var(--text-secondary); font-size: 0.95rem;">Nenhum lançamento recente</li>' : ''}
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
          borderColor: '#e2c044', /* Accent Gold */
          backgroundColor: 'rgba(226, 192, 68, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0a0f1c',
          pointBorderColor: '#e2c044',
          pointBorderWidth: 2,
          pointRadius: 4
        },
        {
          label: 'Meta',
          data: targetData,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: { color: '#94a3b8', font: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: '500' } }
        }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: {
            color: '#94a3b8',
            font: { family: "'Plus Jakarta Sans', sans-serif" },
            callback: (value) => 'R$ ' + value.toLocaleString()
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: "'Plus Jakarta Sans', sans-serif" } }
        }
      }
    }
  });
};

const renderStudents = () => {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="glass-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h3>Lista de Alunos</h3>
        <button class="btn-primary" id="add-student-btn" style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="plus" style="width: 18px;"></i> Adicionar Aluno
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Contrato</th>
            <th>Pago</th>
            <th>Pendente</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${state.students.map(s => {
    let statusMarkup = '';
    if (s.status === 'paid') statusMarkup = `<span class="status-badge status-paid"><i data-lucide="check-circle" style="width: 12px;"></i> PAGO</span>`;
    else if (s.status === 'late') statusMarkup = `<span class="status-badge status-late"><i data-lucide="alert-circle" style="width: 12px;"></i> ATRASO</span>`;
    else statusMarkup = `<span class="status-badge status-pending"><i data-lucide="clock" style="width: 12px;"></i> PENDENTE</span>`;

    return `
            <tr>
              <td style="font-weight: 500;">${s.name}</td>
              <td style="font-family: var(--font-display); font-weight: 600;">R$ ${s.total}</td>
              <td style="font-family: var(--font-display); font-weight: 600;">R$ ${s.paid}</td>
              <td style="font-family: var(--font-display); font-weight: 600; color: ${s.total - s.paid > 0 ? 'var(--warning)' : 'var(--text-secondary)'}">R$ ${s.total - s.paid}</td>
              <td>${statusMarkup}</td>
              <td>
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn-icon" onclick="window.viewStudent('${s.id}')">
                    <i data-lucide="eye" style="width: 16px;"></i> Detalhes
                  </button>
                  <button class="btn-icon delete-btn" onclick="window.removeStudent('${s.id}')">
                    <i data-lucide="trash-2" style="width: 16px;"></i>
                  </button>
                </div>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `;
  initIcons();

  document.getElementById('add-student-btn').onclick = () => {
    showModal('Adicionar Novo Aluno', `
      <div class="form-group">
        <label>Nome Completo do Aluno</label>
        <input type="text" id="modal-student-name" class="ai-input" placeholder="Ex: Lucas Oliveira" autocomplete="off">
      </div>
      <div class="form-group" style="margin-top: 1.25rem;">
        <label>Valor do Contrato (R$)</label>
        <input type="number" id="modal-student-total" class="ai-input" value="500">
      </div>
    `, async () => {
      const name = document.getElementById('modal-student-name').value;
      const total = document.getElementById('modal-student-total').value;
      if (name && total) {
        await actions.addStudent(name, parseInt(total));
        renderStudents();
        return true;
      }
      return false;
    });
  };
};

window.removeStudent = (id) => {
  showConfirm('Remover Aluno', 'Tem certeza que deseja remover este aluno? Todos os pagamentos também serão excluídos.', async () => {
    await actions.deleteStudent(id);
    renderStudents();
    return true;
  });
};

window.viewStudent = (id) => {
  renderStudentDetails(id);
};

const renderStudentDetails = (id) => {
  const student = state.students.find(s => s.id === id);
  const container = document.getElementById('view-container');

  container.innerHTML = `
    <div class="fade-in">
      <button class="btn-secondary" onclick="window.switchView('students')" style="margin-bottom: 2rem; display: inline-flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="arrow-left" style="width: 18px;"></i> Voltar para Lista
      </button>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div class="glass-card">
          <h3 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">Editar Dados Cadastrais</h3>
          <form id="edit-student-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="form-group">
              <label>Nome Completo do Aluno</label>
              <input type="text" name="name" value="${student.name}" class="ai-input" style="padding: 1rem 1.25rem;">
            </div>
            <div class="form-group">
              <label>Valor Total Contratado (R$)</label>
              <input type="number" name="total" value="${student.total}" class="ai-input" style="padding: 1rem 1.25rem;">
            </div>
            <button type="submit" class="btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.5rem;">
              <i data-lucide="save" style="width: 18px;"></i> Salvar Alterações
            </button>
          </form>
        </div>
        
        <div class="glass-card">
          <h3 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">Comprovantes de Pagamento</h3>
          <div>
             <div class="drop-zone" id="receipt-drop-zone" style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
               <i data-lucide="upload-cloud" style="width: 48px; height: 48px; color: var(--accent-gold); opacity: 0.8;"></i>
               <p>Arraste arquivos para cá ou <br> <span style="color: var(--accent-gold); cursor: pointer; font-weight: 600;">clique para selecionar</span></p>
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
  window.removeReceipt = (studentId, receiptId) => {
    showConfirm('Remover Comprovante', 'Deseja realmente remover este comprovante?', async () => {
      await actions.deleteStudentReceipt(receiptId);
      renderStudentDetails(studentId);
      return true;
    });
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h3>Controle de Despesas</h3>
        <button class="btn-primary" id="add-expense-btn" style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="plus" style="width: 18px;"></i> Nova Despesa
        </button>
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
          ${state.expenses.map(e => {
    const isPaid = e.paid >= e.total;
    const statusClass = isPaid ? 'status-paid' : 'status-pending';
    const icon = isPaid ? 'check-circle' : 'clock';
    const text = isPaid ? 'PAGO' : 'PARCIAL';
    return `
            <tr>
              <td style="font-weight: 500;">${e.provider}</td>
              <td>${e.service}</td>
              <td style="color: var(--text-secondary);">${e.date}</td>
              <td style="font-family: var(--font-display); font-weight: 600;">R$ ${e.total}</td>
              <td>
                <span class="status-badge ${statusClass}">
                  <i data-lucide="${icon}" style="width: 12px;"></i> ${text}
                </span>
              </td>
              <td style="display: flex; gap: 0.5rem;">
                <button class="btn-icon" onclick="window.viewExpense('${e.id}')">
                  <i data-lucide="pencil" style="width: 16px;"></i> Editar
                </button>
                <button class="btn-icon delete-btn" onclick="window.removeExpense('${e.id}')">
                  <i data-lucide="trash-2" style="width: 16px;"></i>
                </button>
              </td>
            </tr>
          `}).join('')}
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
      <button class="btn-secondary" onclick="window.switchView('expenses')" style="margin-bottom: 2rem; display: inline-flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="arrow-left" style="width: 18px;"></i> Voltar para Lista
      </button>
      
      <div class="glass-card" style="max-width: 650px; margin: 0 auto;">
        <h3 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">Editar Lançamento de Despesa</h3>
        <form id="edit-expense-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div class="form-group">
            <label>Fornecedor (Empresa/Pessoa)</label>
            <input type="text" name="provider" value="${expense.provider}" class="ai-input" style="padding: 1rem 1.25rem;">
          </div>
          <div class="form-group">
            <label>Descrição do Serviço ou Produto</label>
            <input type="text" name="service" value="${expense.service}" class="ai-input" style="padding: 1rem 1.25rem;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div class="form-group">
              <label>Valor Total do Serviço (R$)</label>
              <input type="number" name="total" value="${expense.total}" class="ai-input" style="padding: 1rem 1.25rem;">
            </div>
            <div class="form-group">
              <label>Valor Já Pago (R$)</label>
              <input type="number" name="paid" value="${expense.paid}" class="ai-input" style="padding: 1rem 1.25rem;">
            </div>
          </div>
          <button type="submit" class="btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1rem;">
             <i data-lucide="save" style="width: 18px;"></i> Atualizar Despesa
          </button>
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

window.removeExpense = (id) => {
  showConfirm('Remover Despesa', 'Deseja realmente excluir permanentemente esta despesa?', async () => {
    await actions.deleteExpense(id);
    renderExpenses();
    return true;
  });
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
          <button class="btn-primary" id="add-calendar-event" style="display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="calendar" style="width: 18px;"></i> Novo Evento
          </button>
       </div>

       <div style="display: flex; gap: 0.75rem; margin-bottom: 2.5rem; overflow-x: auto; padding-bottom: 1rem; scrollbar-width: thin; -webkit-overflow-scrolling: touch;">
          ${months.map((m, i) => `
            <div class="glass-card ${i === selectedMonth ? 'active' : ''}" 
                 onclick="window.switchMonth(${i})"
                 style="min-width: 120px; text-align: center; cursor: pointer; padding: 1.25rem 1rem; flex-shrink: 0; box-shadow: none;">
              <div style="font-weight: 700; color: ${i === selectedMonth ? 'var(--accent-gold)' : 'var(--text-primary)'};">${m}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">2026</div>
            </div>
          `).join('')}
       </div>

       <h3 style="margin-bottom: 1.5rem; font-size: 1.25rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">Eventos de ${months[selectedMonth]} ${year}</h3>
       <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${filteredEvents.length === 0 ? '<p style="color: var(--text-secondary); text-align: center; padding: 3rem; background: rgba(255,255,255,0.02); border-radius: 16px;">Sem eventos programados para este mês.</p>' : ''}
          ${filteredEvents.map(e => `
            <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${e.type === 'late' ? 'var(--error)' : (e.type === 'expense' ? 'var(--accent-gold)' : 'var(--success)')}; padding: 1.25rem 1.5rem;">
              <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 1.05rem;">${e.title}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem; display: flex; align-items: center; gap: 0.5rem;">
                  <i data-lucide="clock" style="width: 12px; opacity: 0.7;"></i> ${new Date(e.date).toLocaleDateString('pt-BR')} 
                  ${e.description ? `<span style="opacity: 0.5;">•</span> ${e.description}` : ''}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="font-weight: 700; font-family: var(--font-display); font-size: 1.15rem; color: ${e.type === 'late' ? 'var(--error)' : 'var(--text-primary)'}">
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

window.removeEvent = (id) => {
  showConfirm('Remover Evento', 'Tem certeza que deseja remover este evento do calendário?', async () => {
    await actions.deleteEvent(id);
    const activeMonth = document.querySelector('.glass-card.active')?.getAttribute('onclick')?.match(/\d+/)?.[0] || 0;
    renderCalendar(parseInt(activeMonth));
    return true;
  });
};

const renderReports = () => {
  const container = document.getElementById('view-container');
  const pendingCount = getters.getPendingStudents();
  const totalAlunos = state.students.length;
  const inadiplenciaRate = totalAlunos > 0 ? Math.round((pendingCount / totalAlunos) * 100) : 0;

  const lateStudents = state.students.filter(s => s.status !== 'paid');

  container.innerHTML = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h3>Central de Relatórios</h3>
        <div style="display: flex; gap: 1rem;">
          <button class="btn-secondary" onclick="window.exportToExcel()" style="display: flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: rgba(16, 185, 129, 0.3);">
            <i data-lucide="file-spreadsheet" style="width: 18px;"></i> Exportar Excel
          </button>
          <button class="btn-secondary" onclick="window.exportToPDF()" style="display: flex; align-items: center; gap: 0.5rem; background: rgba(239, 68, 68, 0.1); color: var(--error); border-color: rgba(239, 68, 68, 0.3);">
            <i data-lucide="file-text" style="width: 18px;"></i> Exportar PDF
          </button>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom: 2rem;">
        <div class="glass-card stat-card" style="padding: 1.5rem;">
          <div class="label" style="display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="pie-chart" style="width: 16px; color: var(--accent-gold)"></i> Taxa de Inadimplência
          </div>
          <div class="value" style="color: ${inadiplenciaRate > 0 ? 'var(--error)' : 'var(--success)'}; font-size: 2.5rem;">${inadiplenciaRate}%</div>
        </div>
        <div class="glass-card stat-card" style="padding: 1.5rem;">
          <div class="label" style="display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="users" style="width: 16px; color: var(--accent-gold)"></i> Alunos com Pendência
          </div>
          <div class="value" style="color: var(--text-primary); font-size: 2.5rem;">${pendingCount} de ${totalAlunos}</div>
        </div>
      </div>

      <div class="glass-card">
        <h3 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">Detalhamento de Pendências</h3>
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Valor Pendente</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${lateStudents.length === 0 ? '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 3rem; background: rgba(255,255,255,0.02); border-radius: 16px;">Nenhum aluno com pendência! Excelentes notícias.</td></tr>' : ''}
            ${lateStudents.map(s => {
    const pendente = s.total - s.paid;
    return `
                <tr>
                  <td style="font-weight: 500;">${s.name}</td>
                  <td style="font-family: var(--font-display); font-weight: 600; color: ${pendente > 0 ? 'var(--warning)' : 'var(--text-secondary)'}">R$ ${pendente}</td>
                  <td><span class="status-badge ${s.status === 'late' ? 'status-late' : 'status-pending'}">
                    <i data-lucide="${s.status === 'late' ? 'alert-circle' : 'clock'}" style="width: 12px;"></i> ${s.status.toUpperCase()}
                  </span></td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  initIcons();
};

window.exportToExcel = () => {
  const data = state.students.map(s => ({
    'Nome do Aluno': s.name,
    'Contratado (R$)': s.total,
    'Pago (R$)': s.paid,
    'Aberto (R$)': s.total - s.paid,
    'Status Atual': s.status === 'paid' ? 'Pago' : (s.status === 'late' ? 'Atrasado' : 'Pendente Aberto')
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 30 }, // Name
    { wch: 20 }, // Total
    { wch: 20 }, // Paid
    { wch: 20 }, // Pending
    { wch: 20 }  // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório_Inadimplência');

  XLSX.writeFile(workbook, 'Relatorio-Financeiro-Formatura.xlsx');
  showAlert('Exportação Concluída', 'Seu relatório do Excel foi gerado perfeitamente formatado via SheetJS.');
};

window.exportToPDF = () => {
  const doc = new jsPDF();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(10, 15, 28);
  doc.text('Relatório Financeiro de Formatura', 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);

  const pendingCount = getters.getPendingStudents();
  const totalAlunos = state.students.length;
  const inadiplenciaRate = totalAlunos > 0 ? Math.round((pendingCount / totalAlunos) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(226, 192, 68);
  doc.text(`Resumo Geral:`, 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Taxa de Inadimplência: ${inadiplenciaRate}%  |  Alunos com pendência: ${pendingCount} de ${totalAlunos}`, 14, 48);

  const lateStudents = state.students.filter(s => s.status !== 'paid');

  const rows = lateStudents.map(s => [
    s.name,
    `R$ ${s.total.toLocaleString()}`,
    `R$ ${(s.total - s.paid).toLocaleString()}`,
    s.status === 'late' ? 'ATRASADO' : 'PENDENTE REGULAR'
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Aluno', 'Contratado', 'Valor em Aberto', 'Status']],
    body: rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [10, 15, 28], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 70 },
      2: { textColor: [220, 38, 38], fontStyle: 'bold' }
    }
  });

  doc.save('Relatorio-Inadimplentes-Formatura.pdf');
  showAlert('PDF Gerado', 'O Relatório em PDF com foco nos inadimplentes já foi baixado. Pronto para enviar pelo WhatsApp ou imprimir!');
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
  else if (viewId === 'reports') renderReports();
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
    showConfirm('Atenção Crítica', 'Isso irá apagar todos os dados e restaurar a lista inicial de alunos. Deseja continuar?', () => {
      localStorage.clear();
      location.reload();
      return true; // Although the page reloads anyway
    });
    return;
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    showAlert('Erro de API', 'Chave da API do Groq não configurada no arquivo .env');
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
      showAlert('Atenção', `A IA não conseguiu entender: ${resultJson.error}`);
    } else {
      let actionResult = null;
      if (resultJson.action === 'payment') {
        actionResult = await actions.addPayment(resultJson.name, resultJson.amount);
      } else if (resultJson.action === 'expense') {
        actionResult = await actions.addExpense(resultJson.provider, resultJson.amount);
      }

      if (actionResult) {
        showAlert('Sucesso', actionResult.message);
        const activeView = document.querySelector('.nav-item.active').dataset.view;
        switchView(activeView);
      }
    }
  } catch (error) {
    console.error('Groq Error:', error);
    showAlert('Erro de Processamento', 'Erro ao processar comando com Groq. Verifique sua conexão ou chave de API.');
  } finally {
    aiInput.disabled = false;
    aiInput.placeholder = originalPlaceholder;
    aiInput.focus();
  }
};

const showModal = (title, content, onConfirm, showCancel = true) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content fade-in">
      <h2 style="margin-bottom: 1.5rem; font-family: var(--font-display); color: var(--accent-gold); font-weight: 700; font-size: 1.5rem;">${title}</h2>
      <div>${content}</div>
      <div class="modal-actions">
        ${showCancel ? `<button class="btn-secondary" id="modal-cancel">Cancelar</button>` : ''}
        <button class="btn-primary" id="modal-confirm">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  if (showCancel) {
    document.getElementById('modal-cancel').onclick = () => document.body.removeChild(modal);
  }
  document.getElementById('modal-confirm').onclick = async () => {
    if (await onConfirm()) {
      document.body.removeChild(modal);
    }
  };
};

const showConfirm = (title, message, onConfirm) => {
  showModal(
    title,
    `<p style="color: var(--text-secondary); font-size: 1.05rem; line-height: 1.6;">${message}</p>`,
    onConfirm
  );
};

const showAlert = (title, message) => {
  showModal(
    title,
    `<p style="color: var(--text-secondary); font-size: 1.05rem; line-height: 1.6;">${message}</p>`,
    async () => { return true; },
    false
  );
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

import { supabase } from './supabase.js';

// --- State ---
export const state = {
  students: [],
  expenses: [],
  events: [],
  config: {
    targetAmount: 80000,
    perStudent: 2000,
  },
  loading: true,
  isAdmin: localStorage.getItem('isAdmin') === 'true'
};

// --- Initial Data Load ---
export const loadInitialData = async () => {
  state.loading = true;

  const [
    { data: students, error: sError },
    { data: expenses, error: exError },
    { data: events, error: evError },
    { data: config, error: cError }
  ] = await Promise.all([
    supabase.from('students').select('*, installments(*), receipts(*)'),
    supabase.from('expenses').select('*'),
    supabase.from('events').select('*'),
    supabase.from('config').select('*')
  ]);

  if (sError) console.error('Error loading students:', sError);
  if (exError) console.error('Error loading expenses:', exError);
  if (evError) console.error('Error loading events:', evError);
  if (cError) console.error('Error loading config:', cError);

  if (students) state.students = students;
  if (expenses) state.expenses = expenses;
  if (events) state.events = events;
  if (config) {
    const general = config.find(c => c.key === 'general');
    if (general) state.config = general.value;
  }

  state.loading = false;
  return state;
};

export const getters = {
  getTotalArrecadado: () => state.students.reduce((acc, s) => acc + (s.paid || 0), 0),
  getTotalGasto: () => state.expenses.reduce((acc, e) => acc + (e.paid || 0), 0),
  getSaldo: () => getters.getTotalArrecadado() - getters.getTotalGasto(),
  getPendingStudents: () => state.students.filter(s => s.status !== 'paid').length,
  getMonthlyArrecadacao: () => {
    const monthlyData = new Array(12).fill(0);
    state.students.forEach(s => {
      (s.installments || []).forEach(inst => {
        if (inst.date) {
          const month = new Date(inst.date).getMonth();
          monthlyData[month] += inst.amount;
        }
      });
    });
    let cumulative = 0;
    return monthlyData.map(val => {
      cumulative += val;
      return cumulative;
    });
  }
};

export const actions = {
  addPayment: async (studentName, amount) => {
    const student = state.students.find(s => s.name.toLowerCase().includes(studentName.toLowerCase()));
    if (student) {
      // O cálculo de 'paid' e 'status' agora é feito automaticamente via TRIGGER no Supabase.
      // Basta inserir a parcela para que o banco de dados recalcule o total de forma segura.
      const { error: iError } = await supabase
        .from('installments')
        .insert({ student_id: student.id, amount: amount });

      if (iError) {
        console.error('Add Payment Error:', iError);
        return { success: false, message: 'Erro ao registrar pagamento' };
      }

      await loadInitialData(); // Refresh state com dados recalculados pelo banco
      return { success: true, message: `Lançado R$ ${amount} para ${student.name}` };
    }
    return { success: false, message: `Aluno "${studentName}" não encontrado` };
  },

  addExpense: async (provider, amount) => {
    const { error } = await supabase
      .from('expenses')
      .insert({
        provider,
        total: amount,
        paid: amount,
        date: new Date().toISOString().split('T')[0]
      });

    if (error) return { success: false, message: 'Erro ao lançar despesa' };

    await loadInitialData();
    return { success: true, message: `Despesa de R$ ${amount} lançada para ${provider}` };
  },

  updateStudent: async (id, data) => {
    const { error } = await supabase
      .from('students')
      .update(data)
      .eq('id', id);

    if (error) return { success: false, message: 'Erro ao atualizar aluno' };

    await loadInitialData();
    return { success: true, message: `Dados atualizados` };
  },

  addStudentReceipt: async (studentId, file) => {
    // Sanitize filename: remove spaces, use timestamp for uniqueness
    const cleanFileName = file.name.replace(/\s+/g, '_');
    const filename = `${Date.now()}_${cleanFileName}`;

    // Upload actual file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('comprovantes')
      .upload(filename, file);

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return { success: false, message: `Erro no Supabase Storage: ${uploadError.message || 'Bucket não encontrado ou não público'}` };
    }

    const { error } = await supabase
      .from('receipts')
      .insert({
        student_id: studentId,
        filename,
        date: new Date().toISOString()
      });

    if (error) return { success: false, message: 'Erro ao registrar comprovante no banco' };

    await loadInitialData();
    return { success: true, message: `Comprovante enviado com sucesso` };
  },

  deleteStudentReceipt: async (receiptId) => {
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId);

    if (error) return { success: false, message: 'Erro ao remover comprovante' };

    await loadInitialData();
    return { success: true, message: 'Comprovante removido' };
  },

  addStudent: async (name, total) => {
    const { error } = await supabase
      .from('students')
      .insert({ name, total, paid: 0, status: 'pending' });

    if (error) return { success: false, message: 'Erro ao cadastrar aluno' };

    await loadInitialData();
    return { success: true, message: `Aluno ${name} cadastrado` };
  },

  deleteStudent: async (id) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) return { success: false, message: 'Erro ao remover aluno' };

    await loadInitialData();
    return { success: true, message: 'Aluno removido com sucesso' };
  },

  deleteExpense: async (id) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) return { success: false, message: 'Erro ao remover despesa' };

    await loadInitialData();
    return { success: true, message: 'Despesa removida' };
  },

  updateExpense: async (id, data) => {
    const { error } = await supabase
      .from('expenses')
      .update(data)
      .eq('id', id);

    if (error) return { success: false, message: 'Erro ao atualizar despesa' };

    await loadInitialData();
    return { success: true, message: 'Despesa atualizada' };
  },

  addEvent: async (title, date, description = '') => {
    const { error } = await supabase
      .from('events')
      .insert({ title, date, description });

    if (error) return { success: false, message: 'Erro ao adicionar evento' };

    await loadInitialData();
    return { success: true, message: 'Evento adicionado' };
  },

  loginAdmin: async (username, password) => {
    const { data, error } = await supabase.rpc('verify_admin_login', {
      p_username: username,
      p_password: password
    });

    if (error) {
      console.error('Login Error:', error);
      return { success: false, message: 'Falha na conexão com servidor auth.' };
    }

    if (data === true) {
      state.isAdmin = true;
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminEmail', username);
      return { success: true, message: 'Bem vindo, Administrador!' };
    }

    return { success: false, message: 'Usuário ou senha incorretos.' };
  },

  logoutAdmin: () => {
    state.isAdmin = false;
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminEmail');
    location.reload();
  },

  changeAdminPassword: async (currentPassword, newPassword) => {
    const email = localStorage.getItem('adminEmail') || 'admin@terceirao2026.com';
    const { data, error } = await supabase.rpc('update_admin_password', {
      p_username: email,
      p_current_password: currentPassword,
      p_new_password: newPassword
    });

    if (error) return { success: false, message: 'Erro na conexão com o servidor.' };
    return data; // { success: true/false, message: '...' }
  },

  deleteEvent: async (id) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) return { success: false, message: 'Erro ao remover evento' };

    await loadInitialData();
    return { success: true, message: 'Evento removido' };
  }
};

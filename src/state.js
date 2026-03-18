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

  try {
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

    if (sError) throw sError;
    if (exError) throw exError;
    if (evError) throw evError;
    if (cError) throw cError;

    if (students) state.students = students;
    if (expenses) state.expenses = expenses;
    if (events) state.events = events;
    if (config) {
      const general = config.find(c => c.key === 'general');
      if (general) state.config = general.value;
    }
  } catch (err) {
    console.error('Fatal data load error:', err);
  } finally {
    state.loading = false;
  }
  return state;
};

// --- Helper for Partial Updates ---
const refreshStudent = async (studentId) => {
  const { data, error } = await supabase
    .from('students')
    .select('*, installments(*), receipts(*)')
    .eq('id', studentId)
    .single();

  if (data && !error) {
    const index = state.students.findIndex(s => s.id === studentId);
    if (index !== -1) {
      state.students[index] = data;
    } else {
      state.students.push(data);
    }
    return true;
  }
  return false;
};

// HELPER: Obter Token de Sessão
const getSessionToken = () => localStorage.getItem('sessionToken');

export const getters = {
  getTotalArrecadado: () => state.students.reduce((acc, s) => acc + (parseFloat(s.paid) || 0), 0),
  getTotalGasto: () => state.expenses.reduce((acc, e) => acc + (parseFloat(e.paid) || 0), 0),
  getSaldo: () => getters.getTotalArrecadado() - getters.getTotalGasto(),
  getPendingStudents: () => state.students.filter(s => s.status !== 'paid').length,
  getMonthlyArrecadacao: () => {
    const monthlyData = new Array(12).fill(0);
    state.students.forEach(s => {
      (s.installments || []).forEach(inst => {
        if (inst.date) {
          const month = new Date(inst.date).getMonth();
          monthlyData[month] += (parseFloat(inst.amount) || 0);
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
    const token = getSessionToken();
    const student = state.students.find(s => s.name.toLowerCase().includes(studentName.toLowerCase()));
    if (student) {
      const { error: iError } = await supabase.rpc('rpc_add_payment', {
        p_token: token,
        p_student_id: student.id,
        p_amount: amount
      });

      if (iError) {
        console.error('Add Payment Error:', iError);
        return { success: false, message: 'Erro na autenticação de segurança' };
      }

      await refreshStudent(student.id);
      return { success: true, message: `Lançado R$ ${amount} para ${student.name}` };
    }
    return { success: false, message: `Aluno "${studentName}" não encontrado` };
  },

  addExpense: async (provider, amount) => {
    const token = getSessionToken();
    const { data: id, error } = await supabase.rpc('rpc_add_expense', {
        p_token: token,
        p_provider: provider,
        p_total: amount,
        p_paid: amount,
        p_date: new Date().toISOString().split('T')[0]
    });

    if (error) return { success: false, message: 'Acesso negado: Somente administradores' };

    const { data: newExpense } = await supabase.from('expenses').select('*').eq('id', id).single();
    if (newExpense) state.expenses.unshift(newExpense);
    
    return { success: true, message: `Despesa de R$ ${amount} lançada para ${provider}` };
  },

  updateStudent: async (id, data) => {
    const token = getSessionToken();
    const { error } = await supabase.rpc('rpc_update_student', {
        p_token: token,
        p_id: id,
        p_name: data.name,
        p_total: data.total
    });

    if (error) return { success: false, message: 'Erro na autenticação de segurança' };

    await refreshStudent(id);
    return { success: true, message: `Dados atualizados` };
  },

  addStudentReceipt: async (studentId, file) => {
    const token = getSessionToken();
    const cleanFileName = file.name.replace(/\s+/g, '_');
    const filename = `${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('comprovantes')
      .upload(filename, file);

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return { success: false, message: `Erro no Supabase Storage: ${uploadError.message}` };
    }

    const { error } = await supabase.rpc('rpc_add_receipt', {
        p_token: token,
        p_student_id: studentId,
        p_filename: filename
    });

    if (error) return { success: false, message: 'Erro ao registrar comprovante' };

    await refreshStudent(studentId);
    return { success: true, message: `Comprovante enviado com sucesso` };
  },

  deleteStudentReceipt: async (receiptId) => {
    const token = getSessionToken();
    const receipt = state.students.flatMap(s => s.receipts).find(r => r.id === receiptId);
    const studentId = receipt?.student_id;

    const { error } = await supabase.rpc('rpc_delete_receipt', {
        p_token: token,
        p_receipt_id: receiptId
    });

    if (error) return { success: false, message: 'Erro na auditoria de segurança' };

    if (studentId) await refreshStudent(studentId);
    return { success: true, message: 'Comprovante removido' };
  },

  addStudent: async (name, total) => {
    const token = getSessionToken();
    const { data: id, error } = await supabase.rpc('rpc_add_student', {
        p_token: token,
        p_name: name,
        p_total: total
    });

    if (error) return { success: false, message: 'Acesso Negado: Token Inválido' };

    await refreshStudent(id);
    return { success: true, message: `Aluno ${name} cadastrado` };
  },

  deleteStudent: async (id) => {
    const token = getSessionToken();
    const { error } = await supabase.rpc('rpc_delete_student', {
        p_token: token,
        p_id: id
    });

    if (error) return { success: false, message: 'Erro ao remover: Segurança Ativa' };

    state.students = state.students.filter(s => s.id !== id);
    return { success: true, message: 'Aluno removido com sucesso' };
  },

  deleteExpense: async (id) => {
    const token = getSessionToken();
    const { error } = await supabase.rpc('rpc_delete_expense', {
        p_token: token,
        p_id: id
    });

    if (error) return { success: false, message: 'Acesso negado para deleção' };

    state.expenses = state.expenses.filter(e => e.id !== id);
    return { success: true, message: 'Despesa removida' };
  },

  addEvent: async (title, date, description = '') => {
    const token = getSessionToken();
    const { error } = await supabase.rpc('rpc_add_event', {
        p_token: token,
        p_title: title,
        p_date: date,
        p_desc: description
    });

    if (error) return { success: false, message: 'Erro de autorização' };

    await loadInitialData();
    return { success: true, message: 'Evento adicionado' };
  },

  deleteEvent: async (id) => {
    const token = getSessionToken();
    const { error } = await supabase.rpc('rpc_delete_event', {
        p_token: token,
        p_id: id
    });

    if (error) return { success: false, message: 'Erro ao remover evento' };

    await loadInitialData();
    return { success: true, message: 'Evento removido' };
  },

  loginAdmin: async (username, password) => {
    const { data, error } = await supabase.rpc('verify_admin_login_secure', {
      p_username: username,
      p_password: password
    });

    if (error) {
      console.error('Login Error:', error);
      return { success: false, message: 'Falha na conexão com servidor auth.' };
    }

    if (data && data.success === true) {
      state.isAdmin = true;
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('sessionToken', data.session_token);
      localStorage.setItem('adminEmail', username);
      return { success: true, message: 'Bem vindo! (Sessão Blindada Iniciada)' };
    }

    return { success: false, message: 'Usuário ou senha incorretos.' };
  },

  logoutAdmin: () => {
    state.isAdmin = false;
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('adminEmail');
    location.reload();
  }
};

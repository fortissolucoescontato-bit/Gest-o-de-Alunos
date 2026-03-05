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
  loading: true
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
      const newPaid = (student.paid || 0) + amount;
      const newStatus = newPaid >= (student.total || 2000) ? 'paid' : 'pending';

      const { error: sError } = await supabase
        .from('students')
        .update({ paid: newPaid, status: newStatus })
        .eq('id', student.id);

      if (sError) return { success: false, message: 'Erro ao atualizar aluno' };

      const { error: iError } = await supabase
        .from('installments')
        .insert({ student_id: student.id, amount: amount });

      if (iError) return { success: false, message: 'Erro ao registrar pagamento' };

      await loadInitialData(); // Refresh state
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
    const filename = `${Date.now()}_${file.name}`;

    // Upload actual file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('comprovantes')
      .upload(filename, file);

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return { success: false, message: 'Erro ao fazer upload do arquivo' };
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

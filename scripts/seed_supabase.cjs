const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnxlsqgorgwsmdthtubc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueGxzcWdvcmd3c21kdGh0dWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3MDc0MCwiZXhwIjoyMDg4MDQ2NzQwfQ.mP6qZK8XmKJYbCFoPGTGylzDx4rIkNtTy0CIK4bzHeY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const students = [
    { name: "Ana Júlia Martins dias", total: 500, paid: 0, status: "pending" },
    { name: "Anna Beatriz Duarte Leite", total: 500, paid: 0, status: "pending" },
    { name: "Antônio Muniz Souza", total: 500, paid: 0, status: "pending" },
    { name: "Arthur Bastos Santos", total: 500, paid: 0, status: "pending" },
    { name: "Breno Cardoso da paz", total: 500, paid: 0, status: "pending" },
    { name: "Breno de Souza Rocha Moreira", total: 500, paid: 0, status: "pending" },
    { name: "Erik Gomes Silva", total: 500, paid: 0, status: "pending" },
    { name: "Esther Caroliny de Souza do Nascimento", total: 500, paid: 0, status: "pending" },
    { name: "Fernanda Silva Santana", total: 500, paid: 0, status: "pending" },
    { name: "Francisco Rodrigues Moura Neto", total: 500, paid: 0, status: "pending" },
    { name: "gabriela Borges Conceição de Jesus", total: 500, paid: 0, status: "pending" },
    { name: "Gabrielly Xavier Pinho dos Santos", total: 500, paid: 0, status: "pending" },
    { name: "Guilherme Pereira da Silva", total: 500, paid: 0, status: "pending" },
    { name: "Gustavo sobreira Bonfim do Nascimento", total: 500, paid: 0, status: "pending" },
    { name: "Ícaro da Cruz Oliveira", total: 500, paid: 0, status: "pending" },
    { name: "Isaac Ribeiro Reis dos Santos", total: 500, paid: 0, status: "pending" },
    { name: "João Vitor Ramos Conceição", total: 500, paid: 0, status: "pending" },
    { name: "Lucas Souza Costa", total: 500, paid: 0, status: "pending" },
    { name: "Maria Júlia Fernandes Carvalho", total: 500, paid: 0, status: "pending" },
    { name: "Mateus Inácio Cunha Moreira", total: 500, paid: 0, status: "pending" },
    { name: "Pedro Henrique Rebouças da Cruz", total: 500, paid: 0, status: "pending" },
    { name: "Rafaela Leite Gomes", total: 500, paid: 0, status: "pending" },
    { name: "Renato Pereira Cardoso Dos Santos Neto", total: 500, paid: 0, status: "pending" },
    { name: "Sophia Ferreira Santos Oliveira", total: 500, paid: 0, status: "pending" },
    { name: "Sophia Oliveira Lopes", total: 500, paid: 0, status: "pending" },
    { name: "Thiago José de Macedo neto", total: 500, paid: 0, status: "pending" },
    { name: "Victor dos Reis Oliveira", total: 500, paid: 0, status: "pending" },
    { name: "Vinícius Cosme Nunes", total: 500, paid: 0, status: "pending" },
];

async function seed() {
    // 1. Apaga todos os alunos existentes para evitar duplicatas
    console.log('Apagando alunos existentes...');
    const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // deleta todos

    if (deleteError) {
        console.error('Erro ao apagar alunos:', deleteError.message);
        process.exit(1);
    }
    console.log('Alunos anteriores removidos.');

    // 2. Insere a nova lista
    console.log(`Inserindo ${students.length} alunos...`);
    const { data, error } = await supabase.from('students').insert(students);

    if (error) {
        console.error('Erro ao inserir alunos:', error.message);
        process.exit(1);
    }

    console.log(`✅ ${students.length} alunos inseridos com sucesso! Cada um deve R$ 500,00.`);
}

seed();

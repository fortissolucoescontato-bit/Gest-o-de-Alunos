import { actions } from './src/state.js';
const students = ['Ana Júlia Martins dias', 'Antônio Muniz Souza', 'Arthur Bastos Santos', 'Breno Cardoso da paz', 'Breno de Souza Rocha Moreira', 'Erik Gomes Silva', 'Esther Caroliny de Souza do Nascimento', 'Fernanda Silva Santana', 'Francisco Rodrigues Moura Neto', 'gabriela Borges Conceição de Jesus', 'Gabrielly Xavier Pinho dos Santos', 'Guilherme Pereira da Silva', 'Gustavo sobreira Bonfim do Nascimento', 'Ícaro da Cruz Oliveira', 'Isaac Ribeiro Reis dos Santos', 'João Vitor Ramos Conceição', 'Lucas Souza Costa', 'Maria Júlia Fernandes Carvalho', 'Pedro Henrique Rebouças da Cruz', 'Rafaela Leite Gomes', 'Sophia Ferreira Santos Oliveira', 'Sophia Oliveira Lopes', 'Thiago José de Macedo neto', 'Victor dos Reis Oliveira', 'Vinícius Cosme Nunes'];
students.forEach(name => {
    actions.addStudent(name, 2000);
    actions.addPayment(name, 50);
});
console.log('Alunos adicionados com sucesso ao estado inicial!');

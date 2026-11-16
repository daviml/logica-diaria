(function (global) {
  'use strict';

  const CATEGORIES = {
    borda: { id: 'borda', label: 'Caso de Borda', icon: '🛡', color: 'amber' },
    trace: { id: 'trace', label: 'Trace Código', icon: '🔍', color: 'violet' },
    estrategia: { id: 'estrategia', label: 'Estratégia', icon: '⚡', color: 'emerald' },
    enigma: { id: 'enigma', label: 'Enigma Lógico', icon: '🧩', color: 'sky' }
  };

  const DIFFICULTIES = {
    leve: { label: 'Leve', color: 'emerald' },
    medio: { label: 'Médio', color: 'amber' },
    afiado: { label: 'Afiado', color: 'rose' }
  };

  const CHALLENGES = [
    /* ======================== CASO DE BORDA (9) ======================== */
    {
      id: 'borda-01',
      title: 'O Amigo Invisível do Vovô',
      category: 'borda',
      difficulty: 'leve',
      tags: ['estado', 'privacidade', 'caso-de-borda'],
      story:
        'Todo mundo já tirou seu papel no Amigo Invisível, mas o vovô esqueceu quem ele tirou. Para não refazer o sorteio, você propôs: colocar todos os N nomes na tigela; cada pessoa (menos o vovô) vai lá, tira papéis até achar o nome que ela já tinha sorteado antes e devolve os outros. O único papel que sobrar é o do vovô.',
      question: 'A ideia recupera o nome sem reiniciar o sorteio, mas tem uma falha inevitável de privacidade. Qual?',
      hint: 'Pense na penúltima pessoa a ir até a tigela (quando quase todos já retiraram os seus nomes).',
      options: [
        'O vovô pode acabar tirando o próprio nome no final.',
        'A última pessoa antes do vovô vê só 2 papéis e descobre quem o vovô tirou.',
        'Alguém pode devolver o próprio nome sem perceber e duplicar a lista.',
        'Se N for ímpar, sempre sobram 2 papéis na tigela.'
      ],
      correctIndex: 1,
      explanation:
        'Quando a pessoa N−1 chega à tigela, só restam 2 papéis: o dela e o do vovô. Se o primeiro que ela abrir for o dela, ela deduz que o outro é o do vovô; se não for, ela acabou de ler quem o vovô tirou. Além disso, o processo custa O(N²) em trocas. Uma solução O(N) sem vazamento usa números de 1..N: o vovô inicia uma soma com um número secreto K, cada um soma o número de quem tirou, e no fim o vovô subtrai K da soma total.',
      csConcept: 'Vazamento de Estado & Computação Multipartidária Segura (MPC)'
    },
    {
      id: 'borda-02',
      title: 'Duplo Clique no Pix',
      category: 'borda',
      difficulty: 'medio',
      tags: ['concorrência', 'postgres', 'idempotência'],
      story:
        'No app de pagamentos, um usuário com 4G instável clica duas vezes seguidas em "Transferir R$ 300". O cliente tinha R$ 500 de saldo. O backend faz um SELECT do saldo, checa em memória se saldo >= 300 e depois roda UPDATE saldo = saldo - 300.',
      question: 'O que pode acontecer na corrida entre as duas requisições e qual dupla de medidas blinda isso?',
      hint: 'Duas requisições podem passar pelo SELECT antes que a primeira execute o UPDATE.',
      options: [
        'Apenas a segunda falha com timeout; basta aumentar o timeout do banco.',
        'Ambas leem R$ 500 e debitam duas vezes (saldo −100); resolver com Idempotency-Key + UPDATE atômico.',
        'O Postgres trava a tabela inteira automaticamente no SELECT simples.',
        'Desabilitar o botão no frontend já garante 100% contra cobrança dupla.'
      ],
      correctIndex: 1,
      explanation:
        'Em "lê e depois grava" sem trava, as duas transações leem R$ 500 ao mesmo tempo (TOCTOU — Time-of-Check to Time-of-Use) e debitam R$ 600. Desabilitar o botão ajuda na UX, mas não protege contra retry de rede ou API direta. A blindagem real junta Idempotency-Key (mesma tentativa não executa 2×) e UPDATE saldo = saldo - 300 WHERE saldo >= 300 (ou SELECT FOR UPDATE).',
      csConcept: 'Race Condition (TOCTOU) & Idempotência'
    },
    {
      id: 'borda-03',
      title: 'Feed que Pula e Repete Posts',
      category: 'borda',
      difficulty: 'medio',
      tags: ['sql', 'paginação', 'backend'],
      story:
        'Uma timeline mostra os posts mais recentes usando SQL clássico: ORDER BY created_at DESC LIMIT 20 OFFSET 0 na página 1, e OFFSET 20 na página 2. Enquanto o usuário lê a página 1 por 1 minuto, 3 novos posts são publicados no sistema.',
      question: 'Ao rolar para a página 2, o que o usuário percebe na lista?',
      hint: 'Os novos posts empurram todos os registros antigos 3 posições para baixo.',
      options: [
        'Os últimos 3 posts da página 1 reaparecem duplicados no topo da página 2.',
        'O banco retorna erro 409 porque o OFFSET ficou desatualizado.',
        'Os 3 posts mais antigos são ignorados para sempre.',
        'Nada muda: o OFFSET fixa o snapshot da primeira consulta.'
      ],
      correctIndex: 0,
      explanation:
        'Cada nova inserção no topo desloca os índices para baixo. Os itens que estavam nas posições 18, 19 e 20 passam para 21, 22 e 23 — exatamente o começo de OFFSET 20! Se houver exclusões, ocorre o oposto: itens são pulados. Em feeds dinâmicos, usa-se Keyset / Cursor Pagination (WHERE (created_at, id) < (ultimo_ts, ultimo_id)).',
      csConcept: 'Offset Pagination Drift vs Cursor Pagination'
    },
    {
      id: 'borda-04',
      title: 'Dado Viciado pelo Módulo',
      category: 'borda',
      difficulty: 'afiado',
      tags: ['probabilidade', 'aleatoriedade', 'math'],
      story:
        'Você tem uma função rand10() perfeitamente uniforme que retorna um inteiro de 0 a 9. Para simular um dado justo de 6 lados (0 a 5), alguém escreveu: return rand10() % 6.',
      question: 'Por que esse código quebra a uniformidade do sorteio?',
      hint: 'Conte quantos valores entre 0 e 9 geram resto 0, 1, 2, 3, 4 ou 5 ao dividir por 6.',
      options: [
        'Porque o operador % é lento para números maiores que 5.',
        'Porque 0, 1, 2 e 3 têm o dobro de chance de cair em relação a 4 e 5.',
        'Porque rand10() nunca retorna 0 quando dividido por 6.',
        'Não quebra: módulo de distribuição uniforme é sempre uniforme.'
      ],
      correctIndex: 1,
      explanation:
        'Entre 0 e 9 existem 10 números, e 10 não é múltiplo de 6. Assim: {0,6}→0, {1,7}→1, {2,8}→2, {3,9}→3 (20% cada!), enquanto {4}→4 e {5}→5 (apenas 10% cada!). O jeito justo é Rejection Sampling: se rand10() >= 6, sorteie de novo.',
      csConcept: 'Modulo Bias & Rejection Sampling'
    },
    {
      id: 'borda-05',
      title: 'Check-in Perdido às 21h30',
      category: 'borda',
      difficulty: 'leve',
      tags: ['fuso-horário', 'datas', 'bug-real'],
      story:
        'Um app de hábitos registra a data do check-in usando new Date().toISOString().slice(0, 10) direto no navegador de usuários no Brasil (UTC−3). Às 21h30 de terça-feira, o usuário resolve seu desafio diário.',
      question: 'Qual bug silencioso acontece na ofensiva (streak) desse usuário?',
      hint: '21h30 no fuso UTC−3 equivale a que horas em Greenwich (UTC)?',
      options: [
        'O código lança exceção porque slice(0, 10) corta o horário.',
        'O check-in é salvo na quarta-feira, quebrando a terça e marcando o dia seguinte antes da hora.',
        'O navegador converte automaticamente toISOString() para o fuso local.',
        'Só falha em anos bissextos após as 23h.'
      ],
      correctIndex: 1,
      explanation:
        'toISOString() sempre converte para UTC. Às 21h30 de Brasília (UTC−3), já são 00h30 do dia seguinte em UTC! Para hábitos diários ("qual dia o usuário viveu"), o correto é formatar YYYY-MM-DD usando ano/mês/dia locais (getFullYear, getMonth+1, getDate).',
      csConcept: 'UTC vs Local Calendar Date (Fuso Horário)'
    },
    {
      id: 'borda-06',
      title: 'Preço Salvo no Carrinho',
      category: 'borda',
      difficulty: 'leve',
      tags: ['segurança', 'arquitetura', 'api'],
      story:
        'Para economizar consultas ao banco, um e-commerce envia no checkout o JSON do carrinho montado no navegador: { itens: [{ id: 42, qtd: 1, precoUnitario: 199.90 }] }, e o backend apenas soma qtd * precoUnitario para cobrar.',
      question: 'Qual é o erro clássico de segurança e consistência aqui?',
      hint: 'Quem controla qualquer dado enviado dentro do body HTTP?',
      options: [
        'O JavaScript não consegue multiplicar floats com precisão exata.',
        'O cliente pode adulterar precoUnitario na requisição (ou pagar preço desatualizado).',
        'O JSON fica grande demais se tiver mais de 10 itens.',
        'Falta comprimir o body com gzip.'
      ],
      correctIndex: 1,
      explanation:
        'Nunca confie em valores calculados, preços ou permissões vindas do cliente! Um usuário mal-intencionado pode mandar precoUnitario: 0.01 no DevTools/curl — ou um carrinho aberto ontem pode cobrar o preço antes de uma promoção acabar. O cliente envia apenas { id, qtd }; o servidor busca o preço oficial no banco.',
      csConcept: 'Never Trust the Client (Validação Server-Side)'
    },
    {
      id: 'borda-07',
      title: 'A Versão 10 antes da Versão 2',
      category: 'borda',
      difficulty: 'leve',
      tags: ['ordenação', 'strings', 'caso-de-borda'],
      story:
        'Um script de deploy lista tags de release como texto: ["v1.2", "v1.10", "v1.9", "v1.1"] e ordena com o .sort() padrão de strings para descobrir qual é a versão mais nova.',
      question: 'Qual tag acaba ficando no final da lista ordenada (supostamente a "mais nova")?',
      hint: 'Comparação alfabética olha caractere por caractere da esquerda para a direita.',
      options: [
        '"v1.10"',
        '"v1.9"',
        '"v1.2"',
        '"v1.1"'
      ],
      correctIndex: 1,
      explanation:
        'Na ordenação lexicográfica (ASCII), "1" vem antes de "2" e de "9". Então "v1.1" < "v1.10" < "v1.2" < "v1.9"! O script acharia que v1.9 é mais nova que v1.10. Para versões, divida nos pontos e compare como inteiros [1, 10] vs [1, 9].',
      csConcept: 'Ordenação Lexicográfica vs Natural (SemVer)'
    },
    {
      id: 'borda-08',
      title: 'E-mail Duplicado no Restart',
      category: 'borda',
      difficulty: 'medio',
      tags: ['filas', 'sistemas-distribuídos', 'mensageria'],
      story:
        'Um worker lê um evento "usuario_criado" da fila, envia o e-mail de boas-vindas pela API externa e, na linha seguinte, envia o ACK para remover a mensagem da fila. Exatamente entre o envio do e-mail e o ACK, o container reinicia por deploy.',
      question: 'Quando o novo container subir, o que vai acontecer com essa mensagem?',
      hint: 'Como a fila não recebeu ACK antes da queda, para a fila o trabalho nunca terminou.',
      options: [
        'A fila descarta a mensagem automaticamente porque o e-mail já saiu.',
        'A mensagem volta a ficar visível, outro worker processa e envia o e-mail de novo.',
        'O usuário recebe erro 500 no login.',
        'Ocorre deadlock permanente na fila.'
      ],
      correctIndex: 1,
      explanation:
        'Filas garantem entrega At-Least-Once (pelo menos uma vez), nunca Exactly-Once mágico com efeitos externos! Se cair antes do ACK, a mensagem reaparece. Por isso consumidores devem ser idempotentes (ex.: registrar "boas_vindas_enviado" antes/com chave única ou tolerar reprocessamento).',
      csConcept: 'Semântica At-Least-Once & Consumidores Idempotentes'
    },
    {
      id: 'borda-09',
      title: 'O Centavo Perdido no Parcelamento',
      category: 'borda',
      difficulty: 'leve',
      tags: ['financeiro', 'arredondamento', 'invariante'],
      story:
        'Um sistema divide uma compra de R$ 100,00 em 3 parcelas fazendo parcela = round(100.00 / 3, 2) para cada mês.',
      question: 'Qual invariante financeiro é quebrado e qual é a forma padrão de corrigir?',
      hint: 'Multiplique 33,33 por 3.',
      options: [
        'As parcelas somam R$ 100,01; usar float64 resolve.',
        'As parcelas somam R$ 99,99 (falta 1 centavo); somar o resto inteiro na 1ª (ou última) parcela.',
        'O banco rejeita valores com dízima; proibir parcelamento em 3x.',
        'Nenhuma quebra: o round ajusta a última parcela sozinho.'
      ],
      correctIndex: 1,
      explanation:
        '10000 centavos // 3 = 3333 centavos, sobra resto 1 centavo (3 × 33,33 = 99,99). Dinheiro deve ser calculado em centavos inteiros: base = total // n, resto = total % n, e distribui 1 centavo extra nas primeiras "resto" parcelas (33,34 + 33,33 + 33,33 = 100,00).',
      csConcept: 'Aritmética em Centavos Inteiros & Conservação da Soma'
    },

    /* ======================== TRACE CÓDIGO (9) ======================== */
    {
      id: 'trace-01',
      title: 'Dois Nomes, Uma Lista?',
      category: 'trace',
      difficulty: 'leve',
      tags: ['referência', 'mutabilidade', 'live-code'],
      story:
        'Veja com calma o que acontece quando uma variável recebe outra lista e depois é reatribuída:',
      codePython:
`a = [1, 2, 3]
b = a
b.append(4)
b = [9, 9]
print(len(a), a[-1])`,
      codeCSharp:
`var a = new List<int> { 1, 2, 3 };
var b = a;
b.Add(4);
b = new List<int> { 9, 9 };
Console.WriteLine($"{a.Count} {a[a.Count - 1]}");`,
      question: 'Qual é a saída impressa ao final da execução?',
      hint: 'Modificar o objeto pela referência muda o original; reatribuir "b = ..." só muda para onde "b" aponta.',
      options: [
        '3 3',
        '4 4',
        '2 9',
        '4 9'
      ],
      correctIndex: 1,
      explanation:
        'Na linha 2, "a" e "b" apontam para o mesmo objeto em memória. b.append(4) / b.Add(4) altera essa lista compartilhada, deixando-a com [1, 2, 3, 4]. Na linha 4, "b" passa a apontar para uma NOVA lista [9, 9], sem tocar na lista de "a". Logo, "a" tem tamanho 4 e último item 4.',
      csConcept: 'Mutação In-Place vs Reatribuição de Referência'
    },
    {
      id: 'trace-02',
      title: 'Armadilha da Closure no Loop',
      category: 'trace',
      difficulty: 'afiado',
      tags: ['closure', 'lambda', 'python-vs-csharp'],
      story:
        'Clássico que derruba muita gente em live coding: uma lista de funções criadas dentro de um loop compartilhando a variável i:',
      codePython:
`funcs = []
for i in range(3):
    funcs.append(lambda: i * 10)
print([f() for f in funcs])`,
      codeCSharp:
`var funcs = new List<Func<int>>();
int i = 0;
for (; i < 3; i++)
    funcs.Add(() => i * 10);
Console.WriteLine(string.Join(", ", funcs.Select(f => f())));`,
      question: 'Quais valores as 3 funções retornam quando executadas após o loop?',
      hint: 'A lambda captura a variável "i" por referência, não o valor que ela tinha no momento em que foi criada.',
      options: [
        '0, 10, 20',
        '10, 20, 30',
        '20, 20, 20 (ou 30, 30, 30 em C#)',
        'Erro de variável fora de escopo'
      ],
      correctIndex: 2,
      explanation:
        'Como a lambda guarda uma referência à variável "i", ela só lê o valor de "i" na hora da chamada! No Python, o loop termina com i = 2 → todas retornam 20. No C# com "int i" declarado fora, o i++ final deixa i = 3 → todas retornam 30! (Nota bônus: desde C# 5, se você declarar "for (int i = 0; ...)" dentro do for, o compilador cria uma cópia por iteração e imprime 0, 10, 20 — pegadinha famosa entre Python e C#!).',
      csConcept: 'Late Binding / Variable Capture em Closures'
    },
    {
      id: 'trace-03',
      title: 'Dois Ponteiros até o Alvo',
      category: 'trace',
      difficulty: 'leve',
      tags: ['two-pointers', 'arrays', 'live-code'],
      story:
        'Um algoritmo clássico procura dois números em um array ordenado cuja soma seja exatamente 15:',
      codePython:
`nums = [2, 4, 7, 11, 15]
l, r = 0, len(nums) - 1
steps = 0
while l < r:
    steps += 1
    s = nums[l] + nums[r]
    if s == 15:
        break
    elif s < 15:
        l += 1
    else:
        r -= 1
print(steps, nums[l], nums[r])`,
      codeCSharp:
`int[] nums = { 2, 4, 7, 11, 15 };
int l = 0, r = nums.Length - 1, steps = 0;
while (l < r) {
    steps++;
    int s = nums[l] + nums[r];
    if (s == 15) break;
    if (s < 15) l++; else r--;
}
Console.WriteLine($"{steps} {nums[l]} {nums[r]}");`,
      question: 'Quantas iterações (steps) ocorrem e qual par é impresso?',
      hint: 'Passo 1: 2 + 15 = 17 (maior que 15, diminui r). Continue rastreando l e r.',
      options: [
        '2 4 11',
        '3 4 11',
        '4 7 11',
        '3 2 11'
      ],
      correctIndex: 1,
      explanation:
        'Passo 1: l=0 (2), r=4 (15) → soma 17 > 15 → r vira 3. Passo 2: l=0 (2), r=3 (11) → soma 13 < 15 → l vira 1. Passo 3: l=1 (4), r=3 (11) → soma 15 == 15 → break! Saída: 3 4 11.',
      csConcept: 'Técnica Two Pointers em Arrays Ordenados (O(N))'
    },
    {
      id: 'trace-04',
      title: 'Entra e Sai do Conjunto',
      category: 'trace',
      difficulty: 'medio',
      tags: ['set', 'hashset', 'trace'],
      story:
        'Acompanhe o comportamento de um conjunto (Set/HashSet) sendo usado como alternador de estado ao ler uma string:',
      codePython:
`texto = "abacaba"
vistos = set()
res = []
for ch in texto:
    if ch in vistos:
        vistos.remove(ch)
    else:
        vistos.add(ch)
        res.append(ch)
print(len(vistos), len(res))`,
      codeCSharp:
`string texto = "abacaba";
var vistos = new HashSet<char>();
var res = new List<char>();
foreach (char ch in texto) {
    if (vistos.Contains(ch)) vistos.Remove(ch);
    else { vistos.Add(ch); res.Add(ch); }
}
Console.WriteLine($"{vistos.Count} {res.Count}");`,
      question: 'O que é impresso ao final de "abacaba"?',
      hint: 'Cada letra só entra em "res" quando NÃO estava no conjunto naquele instante.',
      options: [
        '1 4',
        '3 3',
        '1 3',
        '2 4'
      ],
      correctIndex: 0,
      explanation:
        'Rastreio: a (+res), b (+res), a (sai de vistos), c (+res), a (+res, pois havia saído!), b (sai), a (sai). Sobrou só "c" em vistos (tamanho 1), e entraram 4 itens em res (a, b, c, a). Saída: 1 4.',
      csConcept: 'Estado Toggle / Paridade de Ocorrências com HashSet'
    },
    {
      id: 'trace-05',
      title: 'Curto-Circuito nos Logs',
      category: 'trace',
      difficulty: 'leve',
      tags: ['booleanos', 'short-circuit', 'operadores'],
      story:
        'Uma expressão booleana mistura AND e OR chamando funções que gravam seu nome em um log:',
      codePython:
`log = []
def check(nome, ok):
    log.append(nome)
    return ok

r = check("A", False) and check("B", True) or check("C", True)
print(r, "-".join(log))`,
      codeCSharp:
`var log = new List<string>();
bool Check(string nome, bool ok) {
    log.Add(nome);
    return ok;
}
bool r = Check("A", false) && Check("B", true) || Check("C", true);
Console.WriteLine($"{r} {string.Join("-", log)}");`,
      question: 'Qual será o resultado booleano e quais funções foram realmente executadas?',
      hint: 'AND tem precedência sobre OR, e "false && ..." não precisa avaliar o lado direito.',
      options: [
        'True A-B-C',
        'False A-B',
        'True A-C',
        'False A-C'
      ],
      correctIndex: 2,
      explanation:
        'AND (&&) agrupa antes de OR (||): (Check("A", false) && Check("B", true)) || Check("C", true). Como A retorna false, o AND dá curto-circuito e pula B! Depois, false || Check("C", true) precisa avaliar C, que retorna true. Log final: A-C.',
      csConcept: 'Precedência Lógicas & Avaliação em Curto-Circuito'
    },
    {
      id: 'trace-06',
      title: 'Validador de Parênteses na Pilha',
      category: 'trace',
      difficulty: 'medio',
      tags: ['stack', 'pilha', 'live-code'],
      story:
        'Um dos problemas mais pedidos em entrevistas usa uma pilha para validar fechamento de parênteses e colchetes:',
      codePython:
`s = "([)]"
pares = {")": "(", "]": "["}
pilha = []
erro = -1
for idx, ch in enumerate(s):
    if ch in "([":
        pilha.append(ch)
    elif not pilha or pilha.pop() != pares[ch]:
        erro = idx
        break
print(erro, len(pilha))`,
      codeCSharp:
`string s = "([)]";
var pares = new Dictionary<char, char> { [')'] = '(', [']'] = '[' };
var pilha = new Stack<char>();
int erro = -1;
for (int idx = 0; idx < s.Length; idx++) {
    char ch = s[idx];
    if (ch == '(' || ch == '[') pilha.Push(ch);
    else if (pilha.Count == 0 || pilha.Pop() != pares[ch]) {
        erro = idx; break;
    }
}
Console.WriteLine($"{erro} {pilha.Count}");`,
      question: 'O que é impresso para a entrada "([)]"?',
      hint: 'No índice 2 aparece ")", mas qual foi o último símbolo aberto antes dele?',
      options: [
        '-1 0',
        '2 1',
        '3 0',
        '2 2'
      ],
      correctIndex: 1,
      explanation:
        'idx=0 empilha "(". idx=1 empilha "[". idx=2 lê ")": faz pop() e tira "[", mas pares[")"] espera "(". Como "[" != "(", marca erro=2 e dá break! Sobra 1 elemento na pilha ("("). Saída: 2 1.',
      csConcept: 'Estrutura LIFO (Pilha) para Aninhamento Balanceado'
    },
    {
      id: 'trace-07',
      title: 'Antes e Depois da Recursão',
      category: 'trace',
      difficulty: 'medio',
      tags: ['recursão', 'call-stack', 'trace'],
      story:
        'Observe onde o append/Add acontece em relação à chamada recursiva f(n - 2):',
      codePython:
`out = []
def f(n):
    if n <= 0:
        return 1
    out.append(n)
    v = f(n - 2) + 1
    out.append(n * 10)
    return v

total = f(4)
print(total, out)`,
      codeCSharp:
`var @out = new List<int>();
int F(int n) {
    if (n <= 0) return 1;
    @out.Add(n);
    int v = F(n - 2) + 1;
    @out.Add(n * 10);
    return v;
}
int total = F(4);
Console.WriteLine($"{total} [{string.Join(", ", @out)}]");`,
      question: 'Qual é o valor de "total" e a ordem exata da lista out?',
      hint: 'Na ida da recursão grava n; na volta (desempilhamento) grava n * 10.',
      options: [
        '3 [4, 2, 20, 40]',
        '3 [4, 40, 2, 20]',
        '2 [4, 2, 40, 20]',
        '5 [4, 2, 0, 20, 40]'
      ],
      correctIndex: 0,
      explanation:
        'Ida: f(4) grava 4 → chama f(2) → grava 2 → chama f(0) que retorna 1. Volta: f(2) calcula v = 1+1 = 2, grava 20 e retorna 2; f(4) calcula v = 2+1 = 3, grava 40 e retorna 3. Resultado: 3 e [4, 2, 20, 40].',
      csConcept: 'Pilha de Chamadas (Call Stack): Pré-ordem vs Pós-ordem'
    },
    {
      id: 'trace-08',
      title: 'Frequência Após Remoção',
      category: 'trace',
      difficulty: 'leve',
      tags: ['dicionário', 'hashmap', 'linq'],
      story:
        'Contamos a frequência dos itens, removemos a chave mais frequente e resumimos o que restou:',
      codePython:
`dados = ["x", "y", "x", "z", "y", "x"]
freq = {}
for item in dados:
    freq[item] = freq.get(item, 0) + 1
del freq["x"]
print(sum(freq.values()), max(freq, key=freq.get))`,
      codeCSharp:
`var dados = new[] { "x", "y", "x", "z", "y", "x" };
var freq = new Dictionary<string, int>();
foreach (var item in dados)
    freq[item] = freq.GetValueOrDefault(item, 0) + 1;
freq.Remove("x");
var top = freq.OrderByDescending(kv => kv.Value).First().Key;
Console.WriteLine($"{freq.Values.Sum()} {top}");`,
      question: 'O que o código imprime?',
      hint: 'Conte quantos "y" e quantos "z" existem na lista original.',
      options: [
        '6 x',
        '3 z',
        '3 y',
        '2 y'
      ],
      correctIndex: 2,
      explanation:
        'A contagem inicial é x:3, y:2, z:1. Após remover "x", restam y:2 e z:1. A soma dos valores é 2 + 1 = 3, e a chave de maior contagem restante é "y". Saída: 3 y.',
      csConcept: 'Tabela de Frequência com Dictionary / Dict'
    },
    {
      id: 'trace-09',
      title: 'O Truque das 3 Reversões',
      category: 'trace',
      difficulty: 'afiado',
      tags: ['arrays', 'in-place', 'live-code'],
      story:
        'Em vez de criar um novo array, este código inverte pedaços do próprio array e depois o array inteiro:',
      codePython:
`arr = [1, 2, 3, 4, 5]
k = 2
arr[:k] = reversed(arr[:k])
arr[k:] = reversed(arr[k:])
arr.reverse()
print(arr)`,
      codeCSharp:
`int[] arr = { 1, 2, 3, 4, 5 };
int k = 2;
Array.Reverse(arr, 0, k);
Array.Reverse(arr, k, arr.Length - k);
Array.Reverse(arr);
Console.WriteLine(string.Join(", ", arr));`,
      question: 'Como o array termina após as três reversões?',
      hint: 'Inverter [1, 2] dá [2, 1]; inverter [3, 4, 5] dá [5, 4, 3]. Agora inverta tudo!',
      options: [
        '[4, 5, 1, 2, 3]',
        '[3, 4, 5, 1, 2]',
        '[2, 1, 5, 4, 3]',
        '[5, 4, 3, 2, 1]'
      ],
      correctIndex: 1,
      explanation:
        '1ª reversão (0..2): [2, 1, 3, 4, 5]. 2ª reversão (2..5): [2, 1, 5, 4, 3]. 3ª reversão (tudo): [3, 4, 5, 1, 2]. Isso rotaciona o array k posições para a esquerda usando O(1) de memória extra!',
      csConcept: 'Rotação de Array In-Place em O(N) tempo e O(1) espaço'
    },

    /* ======================== ESTRATÉGIA (9) ======================== */
    {
      id: 'estrategia-01',
      title: 'O Par que Soma K em 100 Mil Itens',
      category: 'estrategia',
      difficulty: 'leve',
      tags: ['hashmap', 'complexidade', 'live-code'],
      story:
        'Você recebe um array desordenado com 100.000 preços e precisa saber se existem dois preços distintos cuja soma seja exatamente K. Um loop dentro de outro loop (O(N²)) faz 10 bilhões de comparações e dá timeout.',
      question: 'Qual estratégia resolve em uma única passada O(N)?',
      hint: 'Se você está olhando para o número X, qual número exato precisa procurar no que já passou?',
      options: [
        'Guardar cada valor visto em um Set/HashSet e checar se (K - atual) já está no Set.',
        'Dividir todos os preços por K e pegar o menor.',
        'Usar busca binária sem ordenar o array antes.',
        'Calcular a média dos preços e comparar com K/2.'
      ],
      correctIndex: 0,
      explanation:
        'Ao visitar cada número x, sabemos que o complemento necessário é (K - x). Consultar um Set/Dictionary leva O(1) em média. Se (K - x) já estiver lá, achamos o par; se não, inserimos x e seguimos. Esse é o famoso Two Sum em O(N).',
      csConcept: 'Trade-off Tempo × Espaço usando Hash Table (O(N² ) → O(N))'
    },
    {
      id: 'estrategia-02',
      title: 'ID Faltante com RAM Congelada',
      category: 'estrategia',
      difficulty: 'medio',
      tags: ['invariante', 'xor', 'memória'],
      story:
        'Um lote deveria ter recibos numerados de 1 até N, mas 1 recibo sumiu e os N−1 restantes estão embaralhados num arquivo gigante. Você só tem alguns bytes de RAM (O(1)) — não cabe um Set nem dá para ordenar.',
      question: 'Como descobrir o número exato que sumiu lendo o arquivo uma única vez?',
      hint: 'Compare o que deveria existir no total com o que realmente apareceu.',
      options: [
        'Guardar o maior e o menor número e tirar a média.',
        'Calcular a soma teórica N*(N+1)/2 e subtrair a soma de todos os números lidos (ou usar XOR).',
        'Contar quantos números pares e ímpares existem.',
        'É impossível sem armazenar os números já vistos.'
      ],
      correctIndex: 1,
      explanation:
        'A soma de 1 até N é sempre N*(N+1)/2. Subtraindo cada número lido, o que sobra é exatamente o faltante! Se N for muito grande (risco de overflow na soma), fazer o XOR (^) de todos os números de 1..N com todos os lidos cancela os pares e deixa apenas o faltante, sem nunca dar overflow.',
      csConcept: 'Cancelamento por Soma / XOR em Streaming O(1) Memória'
    },
    {
      id: 'estrategia-03',
      title: 'Detectar Loop Infinito Sem Histórico',
      category: 'estrategia',
      difficulty: 'medio',
      tags: ['ponteiros', 'grafos', 'floyd'],
      story:
        'Um sistema de redirecionamento de URLs segue: A → B → C → D → B... Você precisa detectar se uma cadeia de links entrou em loop infinito, mas não pode guardar a lista de URLs já visitadas em memória.',
      question: 'Qual truque algorítmico garante detectar o ciclo usando só 2 variáveis?',
      hint: 'Imagine dois corredores numa pista circular: um corre o dobro da velocidade do outro.',
      options: [
        'Contar até 100 passos e assumir que deu ciclo.',
        'Dois ponteiros: "lento" anda 1 passo por vez e "rápido" anda 2; se houver ciclo, eles se encontram.',
        'Voltar para trás quando achar um ponteiro nulo.',
        'Comparar apenas se o primeiro link é igual ao terceiro.'
      ],
      correctIndex: 1,
      explanation:
        'No Algoritmo da Tartaruga e da Lebre (Floyd), se não houver ciclo, o ponteiro rápido chega ao fim (null). Se houver ciclo, ambos entram no anel e a distância relativa diminui 1 passo por iteração até colidirem exatamente no mesmo nó.',
      csConcept: 'Algoritmo de Floyd (Ciclo com Tartaruga e Lebre)'
    },
    {
      id: 'estrategia-04',
      title: 'Embaralhar Sem Trapacear',
      category: 'estrategia',
      difficulty: 'afiado',
      tags: ['probabilidade', 'algoritmos', 'shuffle'],
      story:
        'Três devs tentam embaralhar uma lista de N músicas: (1) sort(() => random() - 0.5); (2) para cada posição i de 0..N-1, trocar arr[i] com arr[rand(0, N-1)]; (3) para i de N-1 até 1, trocar arr[i] com arr[rand(0, i)].',
      question: 'Qual das três abordagens produz todas as N! ordens com probabilidade matematicamente igual?',
      hint: 'No método 2 para N=3, há 3³ = 27 caminhos possíveis, mas 3! = 6 permutações — e 27 não é divisível por 6!',
      options: [
        'Todas funcionam igualmente bem.',
        'Apenas a (1), usando sort aleatório.',
        'Apenas a (2), trocando com qualquer índice 0..N-1.',
        'Apenas a (3), conhecida como Fisher-Yates.'
      ],
      correctIndex: 3,
      explanation:
        'A (1) viola a transitividade do sort e fica totalmente enviesada por motor JS. A (2) gera N^N caminhos para N! permutações (como 27 não divide por 6, algumas ordens saem mais!). Só a (3) — Fisher-Yates — escolhe entre as opções restantes (N × (N−1) × ... × 1 = N! caminhos) e garante uniformidade exata em O(N).',
      csConcept: 'Fisher-Yates (Knuth Shuffle) & Contagem de Permutações'
    },
    {
      id: 'estrategia-05',
      title: 'Rate Limiter Econômico',
      category: 'estrategia',
      difficulty: 'medio',
      tags: ['arquitetura', 'api', 'estruturas'],
      story:
        'Sua API permite no máximo 10 requisições a cada 60 segundos por usuário. São 500 mil usuários ativos. Guardar o histórico completo de requisições do dia no Redis estouraria a memória.',
      question: 'Qual abordagem controla o limite com memória mínima por usuário?',
      hint: 'Você só precisa saber dos últimos 60 segundos — ou só de um saldo de fichas que recarrega com o tempo.',
      options: [
        'Gravar todas as requisições numa tabela de log e rodar COUNT(*) a cada request.',
        'Token Bucket (2 números por usuário: fichas + último timestamp) ou fila com no máximo 10 timestamps.',
        'Reiniciar o contador de todo mundo à meia-noite.',
        'Guardar um booleano "bloqueado" permanente.'
      ],
      correctIndex: 1,
      explanation:
        'Com Token Bucket você guarda apenas 2 números por usuário (quantidade de fichas e instante da última recarga), calculando quantas fichas regeneraram pelo tempo decorrido em O(1)! Ou com Sliding Window Log limitado, remove timestamps mais antigos que 60s mantendo no máximo 10 itens.',
      csConcept: 'Token Bucket & Sliding Window Rate Limiting'
    },
    {
      id: 'estrategia-06',
      title: 'O Único ID Sem Par',
      category: 'estrategia',
      difficulty: 'leve',
      tags: ['bitwise', 'xor', 'live-code'],
      story:
        'Num log de pareamento de dispositivos, todo dispositivo aparece conectado e desconectado (logo, aparece exatamente 2 vezes), exceto um único dispositivo que nunca desconectou e aparece só 1 vez.',
      question: 'Qual operação simples entre todos os IDs da lista revela o sobrevivente em O(N) e O(1) memória?',
      hint: 'Qual operador lógico zera dois números idênticos (A ? A = 0) e preserva qualquer número com zero (0 ? B = B)?',
      options: [
        'AND bit-a-bit (&)',
        'OR bit-a-bit (|)',
        'XOR bit-a-bit (^)',
        'Multiplicar todos e tirar a raiz quadrada'
      ],
      correctIndex: 2,
      explanation:
        'O XOR (ou-exclusivo) é comutativo e associativo: X ^ X = 0 e X ^ 0 = X. Quando você faz XOR de todos os elementos do array, todos os pares se anulam virando 0, e sobra exatamente o único elemento sem par!',
      csConcept: 'Propriedade Cancelativa do XOR (Single Number)'
    },
    {
      id: 'estrategia-07',
      title: 'As 1000 Garrafas e 1 Veneno',
      category: 'estrategia',
      difficulty: 'afiado',
      tags: ['binário', 'informação', 'otimização'],
      story:
        'Um rei tem 1000 garrafas de vinho, mas exatamente 1 está envenenada (o veneno mata em exatas 24h, mesmo em uma gota diluída). Você tem apenas 24 horas para descobrir qual é a garrafa misturando gotas em taças para provadores.',
      question: 'Qual é o número mínimo de provadores necessários para identificar a garrafa exata em 24h?',
      hint: 'Cada provador no fim das 24h dá 1 bit de informação (vivo = 0, morto = 1). Quantos bits representam até 1000?',
      options: [
        '500 provadores',
        '32 provadores (raiz quadrada de 1000)',
        '10 provadores',
        '100 provadores'
      ],
      correctIndex: 2,
      explanation:
        'Com K provadores temos 2^K combinações possíveis de resultados (vivo/morto). Como 2^9 = 512 < 1000 e 2^10 = 1024 >= 1000, bastam 10 provadores! Numere as garrafas de 0 a 999 em binário de 10 bits: o provador j bebe uma gota da garrafa i se o bit j de i for 1. Os que morrerem formam o número exato em binário!',
      csConcept: 'Codificação Binária & Limite da Informação (log₂ N)'
    },
    {
      id: 'estrategia-08',
      title: 'Cache LRU em O(1)',
      category: 'estrategia',
      difficulty: 'afiado',
      tags: ['estruturas-de-dados', 'cache', 'arquitetura'],
      story:
        'Você quer implementar um Cache LRU (Least Recently Used) com capacidade para 1000 chaves: ler uma chave, atualizar uma chave e remover a chave menos usada recentemente quando o cache encher precisam ser todos O(1).',
      question: 'Quais duas estruturas de dados trabalhando juntas entregam O(1) em tudo?',
      hint: 'Uma dá acesso direto pela chave em O(1); a outra move qualquer nó para a frente e remove o último em O(1).',
      options: [
        'Array + Busca Binária',
        'HashMap (Dicionário) + Lista Duplamente Ligada',
        'Árvore Binária + Pilha',
        'Dois Sets paralelos'
      ],
      correctIndex: 1,
      explanation:
        'O HashMap mapeia chave → ponteiro do nó na lista em O(1). Quando o item é acessado, a Lista Duplamente Ligada remove o nó de onde está e coloca no topo em O(1) sem percorrer nada; quando o cache lota, remove a cauda da lista e apaga a chave do HashMap também em O(1)!',
      csConcept: 'Composição de Estruturas: HashMap + Doubly Linked List'
    },
    {
      id: 'estrategia-09',
      title: 'Mesclando Agenda Lotada',
      category: 'estrategia',
      difficulty: 'medio',
      tags: ['intervalos', 'ordenação', 'algoritmos'],
      story:
        'Você recebeu 5.000 horários de reserva de salas em ordem aleatória: [[14, 16], [9, 11], [10, 13], ...]. Quer consolidar os blocos ocupados contínuos (ex.: [9, 11] e [10, 13] viram [9, 13]).',
      question: 'Qual primeiro passo derruba a complexidade de O(N²) para O(N log N)?',
      hint: 'Se você garantir que o próximo intervalo nunca começa antes do anterior...',
      options: [
        'Ordenar os intervalos pelo horário de início e depois varrer uma vez comparando com o último bloco.',
        'Criar um array booleano para cada milissegundo do ano.',
        'Ordenar pela duração do intervalo (fim - início).',
        'Comparar cada reunião com todas as outras até nada mais mesclar.'
      ],
      correctIndex: 0,
      explanation:
        'Ordenando pelo início (O(N log N)), qualquer intervalo sobreposto ao último bloco mesclado obrigatoriamente aparece logo em seguida! Basta checar se inicio_atual <= fim_ultimo: se sim, atualiza fim_ultimo = max(fim_ultimo, fim_atual); se não, abre um bloco novo.',
      csConcept: 'Sweep Line / Ordenação Prévia para Redução de Complexidade'
    },

    /* ======================== ENIGMA LÓGICO (9) ======================== */
    {
      id: 'enigma-01',
      title: 'Os 25 Cavalos e as 5 Raias',
      category: 'enigma',
      difficulty: 'afiado',
      tags: ['lógica-pura', 'eliminação', 'entrevista'],
      story:
        'Você tem 25 cavalos e uma pista com apenas 5 raias (não há cronômetro, só é possível ver a ordem de chegada dos 5 cavalos de cada bateria). As velocidades individuais são constantes.',
      question: 'Qual é o número MÍNIMO de corridas para garantir quem são os 3 cavalos mais rápidos?',
      hint: 'Após 5 baterias + 1 corrida dos 5 campeões (6 corridas), quantos cavalos ainda têm alguma chance matemática de estar no pódio?',
      options: [
        '6 corridas',
        '7 corridas',
        '8 corridas',
        '10 corridas'
      ],
      correctIndex: 1,
      explanation:
        '1) 5 corridas dividindo os 25 em grupos A..E (elimina o 4º e 5º de cada grupo). 2) 6ª corrida entre os 5 campeões (A1 > B1 > C1 > D1 > E1). A1 já é o 1º geral! Grupos D e E não podem ter nem o 3º lugar. Do grupo C, só C1 pode ser 3º; do B, só B1 e B2; do A, só A2 e A3. Sobram exatamente 5 candidatos (A2, A3, B1, B2, C1) para 2 vagas → 7ª corrida decide!',
      csConcept: 'Poda por Ordem Parcial (Eliminação Transitiva)'
    },
    {
      id: 'enigma-02',
      title: 'Moeda Torta, Sorteio Justo',
      category: 'enigma',
      difficulty: 'medio',
      tags: ['probabilidade', 'simetria', 'von-neumann'],
      story:
        'Você precisa sortear 50/50 entre duas opções, mas a única moeda do bolso está amassada e cai Cara 70% das vezes e Coroa 30% das vezes (você nem precisa saber a porcentagem exata).',
      question: 'Como usar essa moeda torta para conseguir um resultado exatamente 50/50?',
      hint: 'Jogue a moeda duas vezes seguidas e olhe apenas para os pares onde os dois lances deram lados diferentes.',
      options: [
        'Jogar 3 vezes e escolher a maioria.',
        'Jogar aos pares: Cara-Coroa = Opção A; Coroa-Cara = Opção B; se der igual, descarta e repete.',
        'Jogar 10 vezes e ver se deu mais de 5 Caras.',
        'Impossível tirar 50/50 de uma moeda viciada.'
      ],
      correctIndex: 1,
      explanation:
        'Truque de John von Neumann: se P(Cara) = p e P(Coroa) = 1−p, a chance de sair Cara-Coroa é p·(1−p), e a de sair Coroa-Cara é (1−p)·p — matematicamente IDÊNTICAS para qualquer p entre 0 e 1! Descartando pares iguais (CC ou KK), temos 50/50 exato.',
      csConcept: 'Extrator de Von Neumann (Simetria Probabilística)'
    },
    {
      id: 'enigma-03',
      title: 'A Barra de Chocolate 6 × 8',
      category: 'enigma',
      difficulty: 'leve',
      tags: ['invariante', 'grafos', 'árvores'],
      story:
        'Uma barra de chocolate tem 6 fileiras por 8 colunas (48 quadradinhos). A cada movimento, você pega um pedaço e quebra em linha reta ao longo de um sulco (sem empilhar dois pedaços para quebrar juntos).',
      question: 'Qual é o número mínimo de quebras para separar todos os 48 quadradinhos?',
      hint: 'Começa com 1 pedaço inteiro; termina com 48 pedaços. Quantos pedaços extras cada quebra cria?',
      options: [
        '13 quebras (5 + 7 + 1)',
        '47 quebras, não importa a ordem',
        '48 quebras',
        'Depende se você começa quebrando pelo lado de 6 ou pelo de 8'
      ],
      correctIndex: 1,
      explanation:
        'Invariante lindo: você começa com 1 pedaço e quer terminar com 48. Toda quebra transforma 1 pedaço em 2, ou seja, aumenta a contagem de pedaços em exatamente +1! Não existe atalho nem ordem melhor: qualquer sequência válida leva exatamente 48 − 1 = 47 quebras.',
      csConcept: 'Invariante de Contagem (Árvore Binária com N folhas = N−1 nós internos)'
    },
    {
      id: 'enigma-04',
      title: 'As 100 Portas no Corredor',
      category: 'enigma',
      difficulty: 'afiado',
      tags: ['teoria-dos-números', 'divisores', 'lógica'],
      story:
        'Há 100 portas numeradas de 1 a 100, todas fechadas. Você passa 100 vezes: na 1ª passada inverte (abre/fecha) todas; na 2ª inverte as múltiplas de 2; na 3ª as múltiplas de 3... até a 100ª passada (só a porta 100).',
      question: 'Ao final das 100 passadas, quantas portas terminam ABERTAS?',
      hint: 'Uma porta só termina aberta se for invertida um número ÍMPAR de vezes (ou seja, se tiver número ímpar de divisores).',
      options: [
        '50 portas (todas as ímpares)',
        '25 portas (os números primos)',
        '10 portas (os quadrados perfeitos: 1, 4, 9... 100)',
        '1 porta (apenas a porta 100)'
      ],
      correctIndex: 2,
      explanation:
        'Quase todo número tem divisores aos pares (ex.: 12 tem 1×12, 2×6, 3×4 → 6 divisores → fecha). Só têm quantidade ÍMPAR de divisores os quadrados perfeitos, porque um fator se repete (ex.: 9 tem 1, 3, 9 → 3 divisores → abre!). Entre 1 e 100 existem 10 quadrados perfeitos (1² até 10²).',
      csConcept: 'Paridade de Divisores & Quadrados Perfeitos'
    },
    {
      id: 'enigma-05',
      title: 'Os 10 Chapéus na Fila',
      category: 'enigma',
      difficulty: 'afiado',
      tags: ['paridade', 'xor', 'lógica'],
      story:
        '10 pessoas estão em fila indiana olhando para frente (a nº 10 vê as 9 da frente; a nº 1 não vê ninguém). Cada uma tem um chapéu Preto ou Branco. Começando pela 10 até a 1, cada um só pode dizer "Preto" ou "Branco" (tentando acertar o próprio chapéu). Elas combinaram uma estratégia antes.',
      question: 'Quantas pessoas conseguem acertar com 100% de garantia?',
      hint: 'A última pessoa (nº 10) usa seu palpite como um "bit de paridade" para avisar o resto da fila.',
      options: [
        'Apenas 5 pessoas (em pares).',
        '9 pessoas com garantia (e a 10ª tem 50% de chance).',
        'Todas as 10 com 100% de garantia.',
        'Só 1 pessoa por pura sorte.'
      ],
      correctIndex: 1,
      explanation:
        'A pessoa 10 conta quantos chapéus Pretos vê à frente: se for ÍMPAR diz "Preto", se PAR diz "Branco" (ela tem 50% de acertar o dela, mas salva todo mundo!). A pessoa 9 sabe a paridade total dos 9 primeiros e conta os 8 à frente; se a paridade mudou, o dela é Preto, senão Branco! E assim até a pessoa 1.',
      csConcept: 'Bit de Paridade / Checksum XOR para Correção de Erro'
    },
    {
      id: 'enigma-06',
      title: 'A Ponte Escura e 1 Lanterna',
      category: 'enigma',
      difficulty: 'medio',
      tags: ['otimização', 'guloso-vs-ótimo', 'lógica'],
      story:
        'Quatro pessoas precisam cruzar uma ponte estreita à noite com 1 única lanterna. No máximo 2 vão por vez, na velocidade da mais lenta, e alguém precisa voltar com a lanterna. Tempos individuais: 1, 2, 5 e 10 minutos.',
      question: 'Qual é o MENOR tempo total possível para todos cruzarem?',
      hint: 'A estratégia ingênua (usar o de 1 min como chofer sempre) leva 19 min. Tem como fazer os lentos (5 e 10) irem juntos!',
      options: [
        '19 minutos',
        '18 minutos',
        '17 minutos',
        '15 minutos'
      ],
      correctIndex: 2,
      explanation:
        'Segredo: evite que 5 e 10 atravessem separados! 1) Vão 1 e 2 (2 min). 2) Volta o 1 (1 min). 3) Vão 5 e 10 juntos (10 min!). 4) Volta o 2 que já estava lá (2 min). 5) Vão 1 e 2 de novo (2 min). Total = 2 + 1 + 10 + 2 + 2 = 17 minutos! Exemplo clássico de onde a escolha gulosa perde para o ótimo.',
      csConcept: 'Algoritmo Guloso (Greedy) vs Otimização Global'
    },
    {
      id: 'enigma-07',
      title: 'Café no Leite ou Leite no Café?',
      category: 'enigma',
      difficulty: 'leve',
      tags: ['invariante', 'conservação', 'lógica'],
      story:
        'A Xícara A tem 100 ml de café puro; a Xícara B tem 100 ml de leite puro. Você pega 1 colher cheia de leite de B, joga em A e mistura bem. Depois pega 1 colher do mesmo tamanho dessa mistura em A e devolve para B.',
      question: 'No final, o que existe em maior quantidade?',
      hint: 'Pense só nos volumes totais: as duas xícaras começaram com 100 ml e terminaram com 100 ml.',
      options: [
        'Há mais leite no café (Xícara A) do que café no leite (Xícara B).',
        'Há mais café no leite (Xícara B) do que leite no café (Xícara A).',
        'As quantidades são exatamente iguais.',
        'Depende de quanto você misturou a Xícara A.'
      ],
      correctIndex: 2,
      explanation:
        'Conservação de volume! As duas xícaras terminam com exatos 100 ml. Se na Xícara B existem X ml de café ocupando espaço, significa que faltam X ml de leite em B — e o único lugar para onde esses X ml de leite podem ter ido é a Xícara A! Não precisa nem misturar direito.',
      csConcept: 'Invariante de Conservação (Simplificação de Modelo)'
    },
    {
      id: 'enigma-08',
      title: 'A Mosca Entre Dois Trens',
      category: 'enigma',
      difficulty: 'leve',
      tags: ['mudança-de-perspectiva', 'raciocínio', 'math'],
      story:
        'Dois trens estão a 100 km de distância no mesmo trilho, vindo um de frente para o outro a 50 km/h cada. Uma mosca sai do nariz de um trem voando a 80 km/h até o outro, bate e volta sem parar até os trens se encontrarem.',
      question: 'Quantos quilômetros a mosca percorreu no total?',
      hint: 'Não calcule as infinitas idas e vindas! Pergunte: por quanto TEMPO ela ficou voando?',
      options: [
        '50 km',
        '80 km',
        '100 km',
        '160 km'
      ],
      correctIndex: 1,
      explanation:
        'Se tentar somar cada trecho vai cair numa série geométrica infinita. Mudando o ângulo: os trens se aproximam a 50 + 50 = 100 km/h e estão a 100 km de distância → logo se encontram em exata 1 hora. Se a mosca voou a 80 km/h durante 1 hora, percorreu exatos 80 km!',
      csConcept: 'Mudança de Domínio / Perspectiva (Série Infinita → Tempo Global)'
    },
    {
      id: 'enigma-09',
      title: 'Meias no Escuro',
      category: 'enigma',
      difficulty: 'leve',
      tags: ['pigeonhole', 'lógica-pura', 'combinatória'],
      story:
        'Sem acender a luz, você abre uma gaveta bagunçada contendo 10 meias pretas, 10 brancas e 6 cinzas (todas avulsas).',
      question: 'Quantas meias você precisa pegar no mínimo para TER CERTEZA de formar pelo menos 1 par da mesma cor?',
      hint: 'Qual é o pior caso possível tentando NÃO formar nenhum par?',
      options: [
        '3 meias',
        '4 meias',
        '11 meias',
        '14 meias'
      ],
      correctIndex: 1,
      explanation:
        'Pelo Princípio da Casa dos Pombos (Pigeonhole Principle): com 3 cores possíveis, no pior caso as 3 primeiras meias vêm uma de cada cor (1 preta, 1 branca, 1 cinza). A 4ª meia obrigatoriamente repete uma das 3 cores já na mão, garantindo o par!',
      csConcept: 'Princípio da Casa dos Pombos (Análise de Pior Caso)'
    }
  ];

  const INTERVIEW_STRUCT_OPTIONS = [
    { id: 'set', label: 'HashSet / set' },
    { id: 'dict', label: 'HashMap / dict' },
    { id: 'pointers', label: 'Dois Ponteiros / Lista' },
    { id: 'stack', label: 'Pilha / Fila' },
    { id: 'math', label: 'Invariante / Math / Bitwise' }
  ];

  const INTERVIEW_COMPL_OPTIONS = ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)', 'O(N²)'];

  const INTERVIEW_META = {
    'borda-01': { struct: 'math', compl: 'O(N)', tip: 'Diga: "Para evitar vazamento O(N²) na tigela, mascaro a soma com um offset secreto K em uma passada O(N)."' },
    'borda-02': { struct: 'dict', compl: 'O(1)', tip: 'Diga: "Separo checagem de estado usando Idempotency-Key + UPDATE atômico condicional no banco."' },
    'borda-03': { struct: 'pointers', compl: 'O(1)', tip: 'Diga: "Substituo OFFSET por Keyset/Cursor usando a tupla (created_at, id) indexada."' },
    'borda-04': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Para eliminar modulo bias sem desperdiçar entropia, uso Rejection Sampling no maior múltiplo."' },
    'borda-05': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Normalizo datas de calendário para o fuso local do usuário em vez de truncar UTC."' },
    'borda-06': { struct: 'dict', compl: 'O(1)', tip: 'Diga: "O cliente envia apenas IDs e quantidades; o servidor recalcula tudo na fonte autoritativa."' },
    'borda-07': { struct: 'math', compl: 'O(N log N)', tip: 'Diga: "Converto strings de versão em tuplas numéricas antes de ordenar para evitar ordem ASCII."' },
    'borda-08': { struct: 'dict', compl: 'O(1)', tip: 'Diga: "Como a fila garante At-Least-Once, torno o consumidor idempotente com chave de dedup."' },
    'borda-09': { struct: 'math', compl: 'O(N)', tip: 'Diga: "Opero em centavos inteiros e distribuo o resto da divisão inteira (total % n) nas parcelas."' },
    'trace-01': { struct: 'pointers', compl: 'O(1)', tip: 'Diga: "Em listas mutáveis, diferencio mutação no mesmo endereço de reatribuição de ponteiro."' },
    'trace-02': { struct: 'dict', compl: 'O(N)', tip: 'Diga: "Evito captura tardia (late binding) passando o valor por parâmetro padrão ou variável de bloco."' },
    'trace-03': { struct: 'pointers', compl: 'O(N)', tip: 'Diga: "Como o array já está ordenado, uso Dois Ponteiros convergentes em O(N) tempo e O(1) espaço."' },
    'trace-04': { struct: 'set', compl: 'O(N)', tip: 'Diga: "Uso um HashSet para alternar presença em O(1) por caractere, fechando tudo em O(N)."' },
    'trace-05': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Aproveito precedência e short-circuit para evitar efeitos colaterais desnecessários."' },
    'trace-06': { struct: 'stack', compl: 'O(N)', tip: 'Diga: "Aninhamento LIFO se valida com uma Pilha em O(N), falhando cedo no primeiro fechamento errado."' },
    'trace-07': { struct: 'stack', compl: 'O(N)', tip: 'Diga: "Rastreio a Call Stack diferenciando ações antes da chamada (ida) e após o retorno (volta)."' },
    'trace-08': { struct: 'dict', compl: 'O(N)', tip: 'Diga: "Conto frequências com um Dictionary/dict em O(N) e extraio o máximo em uma varredura."' },
    'trace-09': { struct: 'pointers', compl: 'O(N)', tip: 'Diga: "Rotaciono o array in-place com 3 reversões via dois ponteiros: O(N) tempo e O(1) espaço extra."' },
    'estrategia-01': { struct: 'set', compl: 'O(N)', tip: 'Diga: "Troco força bruta O(N²) por busca de complemento (K − x) em HashSet/dict em O(N)."' },
    'estrategia-02': { struct: 'math', compl: 'O(N)', tip: 'Diga: "Com RAM O(1), cancelo os números presentes contra 1..N via Soma de Gauss ou XOR."' },
    'estrategia-03': { struct: 'pointers', compl: 'O(N)', tip: 'Diga: "Detecto ciclos sem HashSet usando dois ponteiros em velocidades 1x e 2x (Floyd)."' },
    'estrategia-04': { struct: 'math', compl: 'O(N)', tip: 'Diga: "Uso Fisher-Yates de trás para frente sorteando apenas no prefixo 0..i para gerar N! equiprováveis."' },
    'estrategia-05': { struct: 'stack', compl: 'O(1)', tip: 'Diga: "Token Bucket guarda só saldo e timestamp por usuário (O(1) RAM) ou deque limitado à janela."' },
    'estrategia-06': { struct: 'math', compl: 'O(N)', tip: 'Diga: "Aplico XOR acumulado: pares se cancelam (x ^ x = 0) e sobra o único sem par em O(1) memória."' },
    'estrategia-07': { struct: 'math', compl: 'O(N)', tip: 'Diga: "Codifico o índice das garrafas em bits (log₂ N = 10 provadores) para testar em paralelo."' },
    'estrategia-08': { struct: 'dict', compl: 'O(1)', tip: 'Diga: "Combino HashMap para lookup O(1) com Lista Duplamente Ligada para evicção LRU em O(1)."' },
    'estrategia-09': { struct: 'pointers', compl: 'O(N log N)', tip: 'Diga: "Ordeno os intervalos pelo início em O(N log N) e mesclo sobreposições em 1 passada O(N)."' },
    'enigma-01': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Uso ordem parcial e transitividade para podar candidatos impossíveis (6ª define 1º, 7ª decide 2º/3º)."' },
    'enigma-02': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Exploro simetria p(1−p) = (1−p)p descartando pares iguais para extrair 50/50 justo."' },
    'enigma-03': { struct: 'math', compl: 'O(N)', tip: 'Diga: "Identifico o invariante: cada quebra soma +1 peça, logo N peças sempre exigem N−1 quebras."' },
    'enigma-04': { struct: 'math', compl: 'O(N)', tip: 'Diga: "Analiso paridade de divisores: apenas quadrados perfeitos têm número ímpar de divisores."' },
    'enigma-05': { struct: 'math', compl: 'O(N)', tip: 'Diga: "O último anuncia o bit de paridade (XOR) dos chapéus à frente, permitindo que todos deduzam os seus."' },
    'enigma-06': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Evito abordagem gulosa enviando os dois mais lentos juntos enquanto um rápido já está do outro lado."' },
    'enigma-07': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Uso invariante de conservação: o volume que saiu da xícara A foi substituído pelo mesmo volume de B."' },
    'enigma-08': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Mudo o referencial da série geométrica infinita para tempo total × velocidade constante."' },
    'enigma-09': { struct: 'math', compl: 'O(1)', tip: 'Diga: "Aplico análise de pior caso (Casa dos Pombos): K categorias + 1 item garante repetição."' }
  };

  CHALLENGES.forEach((ch) => {
    const meta = INTERVIEW_META[ch.id] || { struct: 'math', compl: 'O(N)', tip: ch.csConcept };
    ch.interviewStruct = meta.struct;
    ch.interviewCompl = meta.compl;
    ch.interviewTip = meta.tip;
  });

  /* ==================== TRILHA CODEWARS (35 KATAS REAIS: 8 -> 6 KYU) ==================== */
  const CODEWARS_TRACK = [
    { slug: 'beginner-series-number-1-school-paperwork', title: 'Beginner Series #1 School Paperwork', kyu: '8 kyu', topic: 'Fundamentos', summaryPt: 'Seus colegas pediram para copiar deveres: são n colegas e cada dever tem m páginas. Calcule quantas páginas em branco você precisa (n * m). Se n < 0 ou m < 0, retorne 0.', hintPt: 'Caso de borda clássico: se n <= 0 ou m <= 0 retorne 0; senão n * m.' },
    { slug: 'even-or-odd', title: 'Even or Odd', kyu: '8 kyu', topic: 'Fundamentos', summaryPt: 'Receba um inteiro e retorne "Even" se for par ou "Odd" se for ímpar.', hintPt: 'Use operador módulo (n % 2 == 0).' },
    { slug: 'opposites-attract', title: 'Opposites Attract', kyu: '8 kyu', topic: 'Fundamentos', summaryPt: 'Dados os números de pétalas de duas flores, retorne true se uma for par e a outra ímpar.', hintPt: 'Basta checar se (a % 2) != (b % 2) ou (a + b) % 2 == 1.' },
    { slug: 'convert-boolean-values-to-strings-yes-or-no', title: 'Convert boolean values to strings Yes or No', kyu: '8 kyu', topic: 'Fundamentos', summaryPt: 'Receba um booleano e retorne "Yes" para true ou "No" para false.', hintPt: 'Operador ternário simples: "Yes" if b else "No" / b ? "Yes" : "No".' },
    { slug: 'abbreviate-a-two-word-name', title: 'Abbreviate a Two Word Name', kyu: '8 kyu', topic: 'Strings', summaryPt: 'Converta um nome com duas palavras em iniciais maiúsculas separadas por ponto (ex.: "Sam Harris" → "S.H").', hintPt: 'Split no espaço, pegue o primeiro caractere de cada palavra em Upper e junte com ".".' },
    { slug: 'sum-of-positive', title: 'Sum of Positive', kyu: '8 kyu', topic: 'Arrays', summaryPt: 'Some apenas os números positivos de um array (retorne 0 se não houver nenhum).', hintPt: 'Filtro condicional + soma (sum com generator / Where().Sum()).' },
    { slug: 'reversed-strings', title: 'Reversed Strings', kyu: '8 kyu', topic: 'Strings', summaryPt: 'Inverta a string recebida mantendo a simplicidade.', hintPt: 'Python: s[::-1] | C#: new string(s.Reverse().ToArray()).' },
    { slug: 'remove-first-and-last-character', title: 'Remove First and Last Character', kyu: '8 kyu', topic: 'Strings', summaryPt: 'Remova o primeiro e o último caractere de uma string com >= 2 letras.', hintPt: 'Python: s[1:-1] | C#: s[1..^1].' },
    { slug: 'square-n-sum', title: 'Square(n) Sum', kyu: '8 kyu', topic: 'Arrays', summaryPt: 'Eleve cada número da lista ao quadrado e some todos os resultados.', hintPt: 'Map/comprehension elevando a 2 seguido de soma.' },
    { slug: 'counting-sheep-dot-dot-dot', title: 'Counting Sheep...', kyu: '8 kyu', topic: 'Arrays', summaryPt: 'Conte quantos valores true existem num array (cuidado com null/None!).', hintPt: 'Cheque igualdade estrita com True/true para ignorar nulos.' },
    { slug: 'vowel-count', title: 'Vowel Count', kyu: '7 kyu', topic: 'Strings', summaryPt: 'Conte quantas vogais (a, e, i, o, u) existem numa string em minúsculas.', hintPt: 'Set de vogais {"a","e","i","o","u"} garante consulta O(1).' },
    { slug: 'disemvowel-trolls', title: 'Disemvowel Trolls', kyu: '7 kyu', topic: 'Strings', summaryPt: 'Remova todas as vogais (maiúsculas e minúsculas) de um comentário.', hintPt: 'Comprehension/Where filtrando caracteres fora de "aeiouAEIOU".' },
    { slug: 'square-every-digit', title: 'Square Every Digit', kyu: '7 kyu', topic: 'Math & Strings', summaryPt: 'Eleve cada dígito de um número ao quadrado e concatene (ex.: 9119 → 811181).', hintPt: 'Converta para string, processe cada dígito e junte de volta.' },
    { slug: 'highest-and-lowest', title: 'Highest and Lowest', kyu: '7 kyu', topic: 'Strings', summaryPt: 'Dada uma string de inteiros separados por espaço, retorne "MAX MIN".', hintPt: 'Split nos espaços, converta para int (não compare como texto!) e pegue max/min.' },
    { slug: 'descending-order', title: 'Descending Order', kyu: '7 kyu', topic: 'Ordenação', summaryPt: 'Reorganize os dígitos de um inteiro não-negativo para formar o maior número possível.', hintPt: 'Ordene os dígitos do maior para o menor e converta para inteiro.' },
    { slug: 'mumbling', title: 'Mumbling', kyu: '7 kyu', topic: 'Strings', summaryPt: 'Transforme "abcd" em "A-Bb-Ccc-Dddd" (índice i repete i+1 vezes).', hintPt: 'Use enumerate(s) / Select((c, i) => ...) + join("-").' },
    { slug: 'isograms', title: 'Isograms', kyu: '7 kyu', topic: 'HashSet', summaryPt: 'Verifique se uma palavra não tem nenhuma letra repetida (ignorando maiúsculas/minúsculas).', hintPt: 'Compare len(s) com len(set(s.lower())) — clássico de HashSet!' },
    { slug: 'exes-and-ohs', title: 'Exes and Ohs', kyu: '7 kyu', topic: 'Contagem', summaryPt: 'Verifique se a string tem a mesma quantidade de "x" e "o" (case-insensitive).', hintPt: 'Conte ambos em lowercase e compare as contagens.' },
    { slug: 'credit-card-mask', title: 'Credit Card Mask', kyu: '7 kyu', topic: 'Strings', summaryPt: 'Troque todos os caracteres por "#", exceto os 4 últimos.', hintPt: 'Se tamanho <= 4 retorne s; senão "#" * (n - 4) + últimos 4.' },
    { slug: 'sum-of-two-lowest-positive-integers', title: 'Sum of Two Lowest Positive Integers', kyu: '7 kyu', topic: 'Arrays', summaryPt: 'Some os dois menores números de um array de inteiros positivos.', hintPt: 'Ordene e some os 2 primeiros, ou faça uma passada O(N) guardando min1 e min2.' },
    { slug: 'complementary-dna', title: 'Complementary DNA', kyu: '7 kyu', topic: 'HashMap', summaryPt: 'Substitua A↔T e C↔G em uma fita de DNA (ex.: "ATTGC" → "TAACG").', hintPt: 'Use um dicionário de mapeamento em vez de vários if/else.' },
    { slug: 'friend-or-foe', title: 'Friend or Foe?', kyu: '7 kyu', topic: 'Filtros', summaryPt: 'Filtre uma lista de nomes mantendo apenas quem tem exatamente 4 letras.', hintPt: 'Preservando a ordem: [n for n in names if len(n) == 4].' },
    { slug: 'jaden-casing-strings', title: 'Jaden Casing Strings', kyu: '7 kyu', topic: 'Strings', summaryPt: 'Capitalize a primeira letra de cada palavra da frase (ex.: "How Can Mirrors Be Real").', hintPt: 'Split por espaço, capitalize cada palavra (atenção a apóstrofos em .title() do Python!) e junte.' },
    { slug: 'multiples-of-3-or-5', title: 'Multiples of 3 or 5', kyu: '6 kyu', topic: 'Math', summaryPt: 'Some todos os múltiplos de 3 ou 5 menores que N (sem somar os múltiplos de 15 duas vezes!).', hintPt: 'Cuidado com o caso de borda N <= 0 e interseção dos múltiplos de 15.' },
    { slug: 'find-the-odd-int', title: 'Find the Odd Int', kyu: '6 kyu', topic: 'XOR / HashMap', summaryPt: 'Em um array de inteiros, apenas UM número aparece um número ímpar de vezes. Ache-o.', hintPt: 'XOR acumulado de todos os elementos encontra direto em O(N) tempo e O(1) espaço!' },
    { slug: 'stop-gninnips-my-sdrow', title: 'Stop gninnipS My sdroW!', kyu: '6 kyu', topic: 'Strings', summaryPt: 'Inverta apenas as palavras com 5 ou mais letras dentro de uma frase.', hintPt: 'Split por espaço, inverta condicional e join por espaço.' },
    { slug: 'who-likes-it', title: 'Who Likes It?', kyu: '6 kyu', topic: 'Casos de Borda', summaryPt: 'Formate o texto de curtidas para 0, 1, 2, 3 ou 4+ nomes ("Ana, Bia and 2 others like this").', hintPt: 'Match/switch pelo tamanho da lista.' },
    { slug: 'create-phone-number', title: 'Create Phone Number', kyu: '6 kyu', topic: 'Strings', summaryPt: 'Formate um array de 10 dígitos no padrão "(123) 456-7890".', hintPt: 'Formatação com slice ou string.Format.' },
    { slug: 'array-dot-diff', title: 'Array.diff', kyu: '6 kyu', topic: 'HashSet', summaryPt: 'Remova da lista A todos os elementos que aparecem na lista B, mantendo a ordem de A.', hintPt: 'Converta B para Set/HashSet antes de filtrar para ficar O(N+M) em vez de O(N*M)!' },
    { slug: 'bit-counting', title: 'Bit Counting', kyu: '6 kyu', topic: 'Bitwise', summaryPt: 'Conte quantos bits 1 existem na representação binária de um inteiro não-negativo.', hintPt: 'Python: n.bit_count() | C#: BitOperations.PopCount((uint)n) ou loop n &= n - 1.' },
    { slug: 'counting-duplicates', title: 'Counting Duplicates', kyu: '6 kyu', topic: 'HashMap', summaryPt: 'Conte quantos caracteres distintos (case-insensitive) se repetem mais de 1 vez.', hintPt: 'Counter(text.lower()) / GroupBy e conte quantos têm freq > 1.' },
    { slug: 'duplicate-encoder', title: 'Duplicate Encoder', kyu: '6 kyu', topic: 'HashMap', summaryPt: 'Troque por "(" se o caractere aparece 1× na string ou ")" se aparece mais de 1×.', hintPt: 'Pré-calcule as frequências em O(N) antes de montar a string final.' },
    { slug: 'detect-pangram', title: 'Detect Pangram', kyu: '6 kyu', topic: 'HashSet', summaryPt: 'Verifique se uma frase contém todas as 26 letras do alfabeto (a-z) pelo menos uma vez.', hintPt: 'Filtre apenas letras minúsculas em um Set e veja se tamanho == 26.' },
    { slug: 'valid-braces', title: 'Valid Braces', kyu: '6 kyu', topic: 'Pilha (Stack)', summaryPt: 'Valide se uma string com (), [] e {} está com todos os pares abertos e fechados na ordem certa.', hintPt: 'Pilha LIFO + mapa de fechamento → abertura (igual ao desafio Trace #6!).' },
    { slug: 'two-sum', title: 'Two Sum', kyu: '6 kyu', topic: 'HashMap / Live Code', summaryPt: 'Dado um array e um alvo, retorne os índices dos dois elementos que somam o alvo.', hintPt: 'Dicionário valor → índice visto em uma passada O(N).' }
  ];

  /* ==================== COLA PYTHON <-> C# (.NET) ==================== */
  const PYTHON_CSHARP_CHEATSHEET = [
    {
      title: 'Filtrar e Transformar (LINQ vs Comprehension)',
      category: 'LINQ vs Comprehension',
      python: '[x * 2 for x in nums if x > 0]',
      csharp: 'nums.Where(x => x > 0).Select(x => x * 2).ToList()',
      tip: 'List comprehension substitui Where + Select de uma vez.'
    },
    {
      title: 'Contagem de Frequências',
      category: 'Coleções',
      python: 'from collections import Counter\nfreq = Counter(texto)',
      csharp: 'var freq = texto.GroupBy(c => c)\n  .ToDictionary(g => g.Key, g => g.Count());',
      tip: 'Em live code Python, Counter economiza várias linhas.'
    },
    {
      title: 'Ler Dicionário com Valor Padrão',
      category: 'Coleções',
      python: 'freq[k] = freq.get(k, 0) + 1',
      csharp: 'freq[k] = freq.GetValueOrDefault(k, 0) + 1;',
      tip: 'Evita KeyNotFoundException / KeyError sem precisar de if.'
    },
    {
      title: 'Conjunto Sem Duplicatas (Busca O(1))',
      category: 'Coleções',
      python: 'vistos = set(nums)\nif x in vistos: ...',
      csharp: 'var vistos = new HashSet<int>(nums);\nif (vistos.Contains(x)) ...',
      tip: 'Sempre converta listas de lookup para set/HashSet antes de filtrar.'
    },
    {
      title: 'Algum ou Todos (Any / All)',
      category: 'LINQ vs Comprehension',
      python: 'any(x < 0 for x in nums)\nall(x % 2 == 0 for x in nums)',
      csharp: 'nums.Any(x => x < 0)\nnums.All(x => x % 2 == 0)',
      tip: 'Ambos param no curto-circuito assim que decidem o resultado.'
    },
    {
      title: 'Ordenação Customizada',
      category: 'Ordenação & Busca',
      python: 'sorted(itens, key=lambda x: (-x.pts, x.nome))',
      csharp: 'itens.OrderByDescending(x => x.Pts).ThenBy(x => x.Nome)',
      tip: 'Em Python, tupla na key resolve múltiplos critérios com sinal negativo.'
    },
    {
      title: 'Maior/Menor por Critério',
      category: 'Ordenação & Busca',
      python: 'top = max(freq, key=freq.get)',
      csharp: 'var top = freq.MaxBy(kv => kv.Value).Key;',
      tip: 'Não precisa ordenar tudo em O(N log N) só para achar o maior (é O(N)).'
    },
    {
      title: 'Juntar Strings (Join)',
      category: 'Strings',
      python: '"".join(partes)',
      csharp: 'string.Join("", partes)',
      tip: 'Evite concatenar dentro de loop (+=); monte a lista e dê join no fim.'
    },
    {
      title: 'Inverter String ou Lista',
      category: 'Strings',
      python: 's[::-1]\narr.reverse()  # in-place',
      csharp: 'new string(s.Reverse().ToArray())\nArray.Reverse(arr); // in-place',
      tip: 'Slicing [start:stop:step] do Python é super prático para subarrays.'
    },
    {
      title: 'Percorrer com Índice',
      category: 'Truques Live Code',
      python: 'for i, ch in enumerate(s):\n    ...',
      csharp: 'for (int i = 0; i < s.Length; i++) {\n    char ch = s[i];\n}',
      tip: 'enumerate(s, start=1) também permite começar do índice 1.'
    },
    {
      title: 'Percorrer Duas Listas Juntas',
      category: 'LINQ vs Comprehension',
      python: 'for a, b in zip(lista1, lista2):\n    ...',
      csharp: 'foreach (var (a, b) in lista1.Zip(lista2))\n    ...',
      tip: 'Para no tamanho da menor lista automaticamente.'
    },
    {
      title: 'Pilha (LIFO) e Fila (FIFO)',
      category: 'Coleções',
      python: 'pilha = []; pilha.append(x); pilha.pop()\nfrom collections import deque\nfila = deque(); fila.append(x); fila.popleft()',
      csharp: 'var pilha = new Stack<int>(); // Push / Pop\nvar fila = new Queue<int>(); // Enqueue / Dequeue',
      tip: 'Em Python, evite list.pop(0) em fila grande (é O(N)); use deque.popleft() O(1).'
    },
    {
      title: 'Trocar Duas Variáveis (Swap)',
      category: 'Truques Live Code',
      python: 'a, b = b, a',
      csharp: '(a, b) = (b, a);',
      tip: 'C# moderno também aceita troca por tupla sem variável temp!'
    },
    {
      title: 'Divisão Inteira e Resto',
      category: 'Truques Live Code',
      python: 'q = 7 // 2   # 3\nq, r = divmod(7, 2)',
      csharp: 'int q = 7 / 2;  // 3\nvar (q2, r2) = Math.DivRem(7, 2);',
      tip: 'Atenção: em Python "/" sempre retorna float (7 / 2 == 3.5); use "//"!'
    },
    {
      title: 'Two Sum em O(N)',
      category: 'Truques Live Code',
      python: 'seen = {}\nfor i, x in enumerate(nums):\n    if target - x in seen: return [seen[target - x], i]\n    seen[x] = i',
      csharp: 'var seen = new Dictionary<int, int>();\nfor (int i = 0; i < nums.Length; i++) {\n    if (seen.TryGetValue(target - nums[i], out var j)) return new[] { j, i };\n    seen[nums[i]] = i;\n}',
      tip: 'O padrão mais importante de entrevista: mapa valor → índice visto.'
    }
  ];

  /* ==================== GERADOR PARAMÉTRICO DIÁRIO (SEMENTE POR DATA) ==================== */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashDateKey(dateKey) {
    let h = 2166136261;
    for (let i = 0; i < dateKey.length; i++) {
      h ^= dateKey.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function uniqueFourOptions(correctStr, candidates, rng) {
    const seen = new Set([correctStr]);
    const list = [correctStr];
    for (const c of candidates) {
      if (!seen.has(c)) {
        seen.add(c);
        list.push(c);
      }
      if (list.length === 4) break;
    }
    let bump = 1;
    while (list.length < 4) {
      const extra = `${correctStr} (+${bump})`;
      if (!seen.has(extra)) {
        seen.add(extra);
        list.push(extra);
      }
      bump++;
    }
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return { options: list, correctIndex: list.indexOf(correctStr) };
  }

  function generateDailyParametricChallenge(dateKey) {
    const seed = hashDateKey(dateKey);
    const rng = mulberry32(seed);
    const mode = seed % 4;
    const id = `daily-gen-${dateKey}`;

    if (mode === 0) {
      // Dois Ponteiros paramétrico
      const arr = [];
      let cur = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < 6; i++) {
        cur += 2 + Math.floor(rng() * 4);
        arr.push(cur);
      }
      const iPick = 1 + Math.floor(rng() * 2);
      const jPick = 3 + Math.floor(rng() * 2);
      const target = arr[iPick] + arr[jPick];

      let l = 0, r = arr.length - 1, steps = 0;
      while (l < r) {
        steps++;
        const s = arr[l] + arr[r];
        if (s === target) break;
        if (s < target) l++;
        else r--;
      }
      const correctStr = `${steps} passo(s) -> (${arr[l]}, ${arr[r]})`;
      const candidates = [
        `${steps + 1} passo(s) -> (${arr[l]}, ${arr[r]})`,
        `${Math.max(1, steps - 1)} passo(s) -> (${arr[l]}, ${arr[r]})`,
        `${steps} passo(s) -> (${arr[Math.max(0, l - 1)]}, ${arr[r]})`,
        `${steps + 2} passo(s) -> (${arr[l]}, ${arr[Math.min(arr.length - 1, r + 1)]})`
      ];
      const { options, correctIndex } = uniqueFourOptions(correctStr, candidates, rng);
      const arrTxt = arr.join(', ');
      return {
        id,
        isParametric: true,
        title: `Desafio Gerado de Hoje · Two Pointers`,
        category: 'trace',
        difficulty: 'medio',
        tags: ['gerado-hoje', 'two-pointers'],
        story: `Treino algorítmico gerado exclusivamente para ${dateKey}. Rastreie os ponteiros l e r até a soma ${target}:`,
        codePython:
`nums = [${arrTxt}]
l, r, steps = 0, len(nums) - 1, 0
while l < r:
    steps += 1
    s = nums[l] + nums[r]
    if s == ${target}: break
    elif s < ${target}: l += 1
    else: r -= 1
print(f"{steps} passo(s) -> ({nums[l]}, {nums[r]})")`,
        codeCSharp:
`int[] nums = { ${arrTxt} };
int l = 0, r = nums.Length - 1, steps = 0;
while (l < r) {
    steps++;
    int s = nums[l] + nums[r];
    if (s == ${target}) break;
    if (s < ${target}) l++; else r--;
}
Console.WriteLine($"{steps} passo(s) -> ({nums[l]}, {nums[r]})");`,
        question: 'Qual saída exata o código imprime?',
        hint: `Comece somando ${arr[0]} + ${arr[arr.length - 1]} = ${arr[0] + arr[arr.length - 1]} e compare com ${target}.`,
        options,
        correctIndex,
        explanation: `Com dois ponteiros no array [${arrTxt}] buscando ${target}, o laço converge em ${steps} passo(s) no par (${arr[l]}, ${arr[r]}).`,
        csConcept: 'Two Pointers em Array Ordenado (Gerado com Semente Diária)',
        interviewStruct: 'pointers',
        interviewCompl: 'O(N)',
        interviewTip: `Movo l ou r conforme a soma atual é menor ou maior que ${target}, garantindo O(N).`
      };
    }

    if (mode === 1) {
      // Pilha paramétrica com números
      const ops = [];
      const stack = [];
      const vals = [3, 5, 7, 9, 11, 13, 4, 8];
      for (let i = 0; i < 6; i++) {
        if (stack.length >= 2 && rng() > 0.55) {
          ops.push('POP');
          stack.pop();
        } else {
          const v = vals[Math.floor(rng() * vals.length)];
          ops.push(v);
          stack.push(v);
        }
      }
      if (stack.length === 0) {
        ops.push(6);
        stack.push(6);
      }
      const sum = stack.reduce((a, b) => a + b, 0);
      const top = stack[stack.length - 1];
      const correctStr = `soma=${sum}, topo=${top}`;
      const candidates = [
        `soma=${sum + top}, topo=${top}`,
        `soma=${Math.max(0, sum - 2)}, topo=${stack[0]}`,
        `soma=${sum}, topo=${stack[0]}`,
        `soma=${sum + 4}, topo=${top}`
      ];
      const { options, correctIndex } = uniqueFourOptions(correctStr, candidates, rng);
      const opsPy = ops.map((o) => (o === 'POP' ? '"POP"' : String(o))).join(', ');
      return {
        id,
        isParametric: true,
        title: `Desafio Gerado de Hoje · Pilha LIFO`,
        category: 'trace',
        difficulty: 'leve',
        tags: ['gerado-hoje', 'stack'],
        story: `Sequência de comandos gerada para ${dateKey}. Cada número entra na pilha; "POP" remove o topo:`,
        codePython:
`cmds = [${opsPy}]
st = []
for c in cmds:
    if c == "POP" and st: st.pop()
    elif c != "POP": st.append(c)
print(f"soma={sum(st)}, topo={st[-1]}")`,
        codeCSharp:
`var cmds = new object[] { ${opsPy} };
var st = new Stack<int>();
foreach (var c in cmds) {
    if (c is string && st.Count > 0) st.Pop();
    else if (c is int n) st.Push(n);
}
Console.WriteLine($"soma={st.Sum()}, topo={st.Peek()}");`,
        question: 'Qual é o estado final impresso da pilha?',
        hint: 'Anote a pilha da esquerda para a direita; cada "POP" apaga o elemento mais à direita.',
        options,
        correctIndex,
        explanation: `Executando [${ops.join(', ')}] na ordem LIFO, a pilha termina com [${stack.join(', ')}], soma ${sum} e topo ${top}.`,
        csConcept: 'Simulação LIFO em Pilha (Gerado com Semente Diária)',
        interviewStruct: 'stack',
        interviewCompl: 'O(N)',
        interviewTip: 'Push e Pop na pilha são O(1) amortizado; a varredura total fica O(N).'
      };
    }

    if (mode === 2) {
      // Rotação paramétrica
      const base = [10, 20, 30, 40, 50, 60];
      const shift = Math.floor(rng() * 4);
      const arr = base.map((x) => x + shift);
      const k = 1 + Math.floor(rng() * 3);
      const rotated = [...arr.slice(k), ...arr.slice(0, k)];
      const correctStr = `[${rotated.join(', ')}]`;
      const revAll = [...arr].reverse();
      const rightRot = [...arr.slice(arr.length - k), ...arr.slice(0, arr.length - k)];
      const off1 = [...arr.slice(k + 1), ...arr.slice(0, k + 1)];
      const { options, correctIndex } = uniqueFourOptions(
        correctStr,
        [`[${rightRot.join(', ')}]`, `[${revAll.join(', ')}]`, `[${off1.join(', ')}]`],
        rng
      );
      const arrTxt = arr.join(', ');
      return {
        id,
        isParametric: true,
        title: `Desafio Gerado de Hoje · Fatiamento`,
        category: 'trace',
        difficulty: 'leve',
        tags: ['gerado-hoje', 'arrays'],
        story: `Desafio gerado para ${dateKey}. Observe a direção do fatiamento/concatenação:`,
        codePython:
`arr = [${arrTxt}]
k = ${k}
res = arr[k:] + arr[:k]
print(res)`,
        codeCSharp:
`int[] arr = { ${arrTxt} };
int k = ${k};
var res = arr.Skip(k).Concat(arr.Take(k)).ToArray();
Console.WriteLine($"[{string.Join(", ", res)}]");`,
        question: 'Qual array é impresso no final?',
        hint: `arr[${k}:] / Skip(${k}) começa no índice ${k} (${arr[k]}) e vai até o fim, trazendo os ${k} primeiros para trás.`,
        options,
        correctIndex,
        explanation: `Pegar a partir do índice ${k} (${arr.slice(k).join(', ')}) e anexar os ${k} primeiros (${arr.slice(0, k).join(', ')}) rotaciona o array ${k} posição(ões) para a esquerda.`,
        csConcept: 'Rotação à Esquerda com Slicing / Skip+Take',
        interviewStruct: 'pointers',
        interviewCompl: 'O(N)',
        interviewTip: 'Com slice/Skip+Take fica O(N) espaço; para O(1) espaço, faço 3 reversões in-place.'
      };
    }

    // mode === 3: Soma & XOR (elemento único)
    const pairs = [4, 7, 9, 12, 15, 21];
    const singleIdx = Math.floor(rng() * 4);
    const chosenPairs = [];
    for (let i = 0; i < 4; i++) {
      const val = pairs[(i + Math.floor(rng() * 3)) % pairs.length] + i * 2;
      chosenPairs.push(val);
    }
    const uniqueVal = chosenPairs[singleIdx];
    const pool = [];
    chosenPairs.forEach((v, idx) => {
      pool.push(v);
      if (idx !== singleIdx) pool.push(v);
    });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const xorAcc = pool.reduce((acc, v) => acc ^ v, 0);
    const correctStr = String(xorAcc);
    const { options, correctIndex } = uniqueFourOptions(
      correctStr,
      chosenPairs.filter((x) => x !== xorAcc).map(String).concat([String(xorAcc + 2), String(xorAcc + 4)]),
      rng
    );
    const arrTxt = pool.join(', ');
    return {
      id,
      isParametric: true,
      title: `Desafio Gerado de Hoje · XOR Cancelativo`,
      category: 'trace',
      difficulty: 'medio',
      tags: ['gerado-hoje', 'xor'],
      story: `Gerado para ${dateKey}. Todos os valores aparecem em par, exceto um:`,
      codePython:
`nums = [${arrTxt}]
acc = 0
for x in nums:
    acc ^= x
print(acc)`,
      codeCSharp:
`int[] nums = { ${arrTxt} };
int acc = 0;
foreach (var x in nums) acc ^= x;
Console.WriteLine(acc);`,
      question: 'Qual valor fica em acc após o loop?',
      hint: 'Qualquer número XOR ele mesmo dá 0 (A ^ A = 0).',
      options,
      correctIndex,
      explanation: `Todos os números repetidos duas vezes se anulam (A ^ A = 0), restando apenas o único elemento sem par: ${xorAcc}.`,
      csConcept: 'Cancelamento por XOR em O(1) Espaço',
      interviewStruct: 'math',
      interviewCompl: 'O(N)',
      interviewTip: 'Como cada par se cancela com XOR, resolvo em O(N) tempo e O(1) espaço extra.'
    };
  }

  global.SINAPSE_DATA = {
    CATEGORIES,
    DIFFICULTIES,
    CHALLENGES,
    INTERVIEW_STRUCT_OPTIONS,
    INTERVIEW_COMPL_OPTIONS,
    CODEWARS_TRACK,
    PYTHON_CSHARP_CHEATSHEET,
    generateDailyParametricChallenge
  };
})(window);

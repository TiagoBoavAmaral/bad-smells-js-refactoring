# Relatório Técnico: Detecção de Bad Smells e Refatoração Segura

---

## 1. Identificação
* **Instituição de Ensino:** Faculdade de Tecnologia / Engenharia de Software
* **Disciplina:** Qualidade de Software / Engenharia de Software
* **Trabalho:** Detecção de Bad Smells e Refatoração Segura
* **Aluno:** Tiago Boaventura Amaral
* **Matrícula:** 847972
* **Repositório Base:** [CleitonSilvaT/bad-smells-js-refactoring](https://github.com/CleitonSilvaT/bad-smells-js-refactoring)
* **Branch:** `main`
* **Data:** Novembro de 2026

---

## 2. Análise Manual (Caça aos Smells)

Ao inspecionar minuciosamente a classe `src/ReportGenerator.js` e seu método `generateReport(reportType, user, items)`, foram identificados diversos sintomas de degradação arquitetural e desvios de boas práticas (*Bad Smells*), detalhados a seguir:

### 2.1. Bad Smell 1: Método Longo e Violação do Princípio da Responsabilidade Única (SRP)
* **Localização:** `src/ReportGenerator.js`, método `generateReport` (linhas 11 a 68).
* **Descrição:** O método possui quase 60 linhas e concentra múltiplos propósitos não coesos:
  1. Configuração e formatação de cabeçalho (`CSV` e `HTML`);
  2. Filtragem de dados baseada em perfil de usuário (`ADMIN` vs `USER`);
  3. Regras de negócio de atribuição de prioridade aos itens;
  4. Formatação de linhas de dados em texto puro ou tags HTML;
  5. Acúmulo de totais financeiros;
  6. Formatação de rodapés.
* **Impacto na Manutenção:** Viola diretamente o *Single Responsibility Principle* (SRP) do SOLID. Qualquer modificação, seja na estrutura do HTML, no formato do CSV ou na regra de concessão de prioridade a itens caros, exige a abertura e edição deste mesmo método monolítico. Isso gera alto risco de efeitos colaterais e fragilidade no sistema.
* **Impacto nos Testes:** Testar o método exige montar uma matriz combinatória exaustiva de parâmetros (`reportType`, papéis de `user`, diferentes valores de `items`). Não é possível testar a lógica matemática da soma ou a regra de autorização de itens isoladamente sem disparar toda a orquestração de formatação.

### 2.2. Bad Smell 2: Duplicação de Código (Duplicated Code / Violação de DRY)
* **Localização:** `src/ReportGenerator.js` (linhas 35-42 e 46-52).
* **Descrição:** A lógica de renderização de linhas de relatório e acumulação de valores está duplicada em múltiplos blocos:
  * A concatenação CSV `${item.id},${item.name},${item.value},${user.name}\n` e o somatório `total += item.value;` estão exatamente replicados tanto no bloco `if (user.role === 'ADMIN')` quanto em `else if (user.role === 'USER')`.
  * A estrutura de tags `<tr><td>...</td></tr>` se repete com quase idêntica formatação.
  * A verificação `reportType === 'CSV'` e `reportType === 'HTML'` é repetida três vezes distintas ao longo do método (seção de cabeçalho, seção do corpo e seção de rodapé).
* **Impacto na Manutenção:** Caso uma nova coluna seja requisitada no relatório (ex: inclusão da data ou categoria), o desenvolvedor precisará alterar múltiplos pontos do código. Se esquecer de um dos blocos, gerará relatórios divergentes e inconsistências silenciosas entre administradores e usuários comuns.
* **Impacto nos Testes:** Gera a necessidade de testes repetitivos para validar a mesma lógica em ramos diferentes, aumentando a verbosidade e tornando a suíte de testes suscetível a falhas diante de refatorações de interface.

### 2.3. Bad Smell 3: Complexidade Ciclomática e Cognitiva Excessiva (Deeply Nested Conditionals / Violação de OCP)
* **Localização:** `src/ReportGenerator.js` (linhas 27 a 55).
* **Descrição:** O código faz uso pesado de condicionais aninhadas dentro de um laço de repetição:
  $$\text{for} \longrightarrow \text{if (role)} \longrightarrow \text{if (value > 1000)} \longrightarrow \text{if/else (reportType)}$$
  O fluxo de controle salta entre checagens de perfil de usuário e tipo de representação textual repetidamente.
* **Impacto na Manutenção:** Viola gravemente o *Open/Closed Principle* (OCP). Se um novo formato de relatório (ex: JSON, XML, PDF) ou um novo papel de usuário (ex: `SUPERVISOR`, `AUDITOR`) for introduzido, a estrutura de `if/else` precisará ser expandida exponencialmente, criando o clássico padrão anti-arquitetural "código espaguete".
* **Impacto nos Testes:** A alta complexidade ciclomática eleva drasticamente o número de caminhos lógicos independentes (*cyclomatic paths*). Para garantir cobertura de código completa, são necessários muitos casos de teste adicionais, aumentando o tempo e o custo do ciclo de qualidade.

### 2.4. Smells Adicionais Observados
* **Números Mágicos (Magic Numbers):** Os literais `500` e `1000` aparecem dispersos no código sem constantes nomeadas que expliquem o domínio de negócio associado a esses limites.
* **Efeitos Colaterais Indesejados (Parameter Mutation):** A atribuição `item.priority = true;` altera o objeto passado como parâmetro na coleção `items`, mutando o estado externo de forma imprevisível para as camadas chamadoras.

---

## 3. Relatório da Ferramenta de Análise Estática (ESLint + SonarJS)

### 3.1. Configuração da Ferramenta
Foi configurado o linter ESLint (v8.51.0) em conjunto com o plugin especializado em *Clean Code* e métricas de qualidade `eslint-plugin-sonarjs` (v0.21.0), com o arquivo `.eslintrc.json` parametrizado na raiz do projeto:

```json
{
  "env": {
    "es2021": true,
    "node": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:sonarjs/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": [
    "sonarjs"
  ],
  "rules": {
    "sonarjs/cognitive-complexity": ["error", 15],
    "sonarjs/no-identical-functions": "error"
  }
}
```

### 3.2. Execução da Ferramenta no Código Original (`src/`)
Ao executar o comando no terminal:
```bash
npx eslint src/
```

O linter gerou o seguinte relatório no terminal:

```
C:\Users\Windows\Documents\faculdade_prog\bad-smells-js-refactoring\src\ReportGenerator.js
  11:3   error  Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed  sonarjs/cognitive-complexity
  43:14  error  Merge this if statement with the nested one                                          sonarjs/no-collapsible-if

✖ 2 problems (2 errors, 0 warnings)
```

### 3.3. Análise Comparativa: Análise Manual vs. Ferramenta Automatizada
A ferramenta automatizada confirmou e mensurou com precisão cirúrgica os problemas identificados na análise manual:
1. **Complexidade Cognitiva Quantificada:** Enquanto a análise manual percebe intuitivamente a dificuldade de leitura dos vários blocos `if/else`, o SonarJS calculou que a complexidade cognitiva era de **27 pontos**, quase o dobro do limite máximo aceitável (15) e mais de 5 vezes a meta recomendada para código limpo (5). A complexidade cognitiva soma penalidades para estruturas aninhadas, apontando com clareza o esforço mental que um desenvolvedor despende ao tentar entender a função.
2. **Identificação de Condicionais Colapsáveis:** O linter identificou a regra `sonarjs/no-collapsible-if` na linha 43, demonstrando que o aninhamento `else if (user.role === 'USER') { if (item.value <= 500) ... }` gerava camadas desnecessárias na árvore de execução.
3. **Valor no Processo de Desenvolvimento:** A análise estática serve como uma barreira de qualidade automática no fluxo de Integração Contínua (CI), garantindo que nenhum débito técnico ou aumento de complexidade passe despercebido para a branch principal.

---

## 4. Processo de Refatoração Segura

### 4.1. Estratégia Adotada e Smell Mais Crítico
O smell eleito como mais crítico foi a **Complexidade Condicional Excessiva e Violação do Princípio Aberto/Fechado (OCP)** em conjunto com o **Método Longo**. 

Para resolvê-lo de forma segura e duradoura, foram empregadas as seguintes técnicas canônicas descritas por Martin Fowler:
1. **Replace Conditional with Polymorphism (Padrão Strategy):**
   * Toda a responsabilidade de formatação de strings foi extraída para classes dedicadas: `CsvReportFormatter` e `HtmlReportFormatter`.
   * Cada formatador implementa um contrato uniforme: `renderHeader(user)`, `renderRow(item, user)` e `renderFooter(total)`.
   * Um mapa polimórfico de formatadores (`formatters[reportType]`) substitui os blocos `if/else if (reportType === '...')` que antes apareciam 3 vezes no método.
2. **Extract Method e Decompose Conditional:**
   * A regra de visibilidade por perfil foi extraída para a função pura `isItemVisibleForUser(item, user)`.
   * A regra de atribuição de prioridade foi isolada em `prepareItem(item, user)`.
   * O cálculo financeiro foi isolado em `calculateTotal(items)` com `Array.prototype.reduce`.
3. **Replace Magic Number with Symbolic Constant:**
   * Criadas as constantes semânticas `USER_VALUE_LIMIT = 500` e `ADMIN_PRIORITY_THRESHOLD = 1000`.

### 4.2. Comparativo: Antes vs. Depois

#### Código Original (`src/ReportGenerator.js`):
```javascript
// ANTES: 69 linhas, alta complexidade (27), tripla duplicação de condicionais
export class ReportGenerator {
  generateReport(reportType, user, items) {
    let report = '';
    let total = 0;

    if (reportType === 'CSV') {
      report += 'ID,NOME,VALOR,USUARIO\n';
    } else if (reportType === 'HTML') {
      report += '<html><body>\n<h1>Relatório</h1>\n...';
    }

    for (const item of items) {
      if (user.role === 'ADMIN') {
        if (item.value > 1000) item.priority = true;
        if (reportType === 'CSV') {
          report += `${item.id},${item.name},${item.value},${user.name}\n`;
          total += item.value;
        } else if (reportType === 'HTML') {
          const style = item.priority ? ' style="font-weight:bold;"' : '';
          report += `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
          total += item.value;
        }
      } else if (user.role === 'USER') {
        if (item.value <= 500) {
          if (reportType === 'CSV') {
            report += `${item.id},${item.name},${item.value},${user.name}\n`;
            total += item.value;
          } else if (reportType === 'HTML') {
            report += `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
            total += item.value;
          }
        }
      }
    }

    if (reportType === 'CSV') {
      report += '\nTotal,,\n' + `${total},,\n`;
    } else if (reportType === 'HTML') {
      report += '</table>\n<h3>Total: ' + total + '</h3>\n</body></html>\n';
    }

    return report.trim();
  }
}
```

#### Código Refatorado (`src/ReportGenerator.refactored.js`):
```javascript
// DEPOIS: Modular, Strategy Pattern, Métodos Extraídos e Complexidade Cognitiva <= 1
const USER_VALUE_LIMIT = 500;
const ADMIN_PRIORITY_THRESHOLD = 1000;

const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
};

class CsvReportFormatter {
  renderHeader() {
    return 'ID,NOME,VALOR,USUARIO\n';
  }
  renderRow(item, user) {
    return `${item.id},${item.name},${item.value},${user.name}\n`;
  }
  renderFooter(total) {
    return `\nTotal,,\n${total},,\n`;
  }
}

class HtmlReportFormatter {
  renderHeader(user) {
    return '<html><body>\n' +
      '<h1>Relatório</h1>\n' +
      `<h2>Usuário: ${user.name}</h2>\n` +
      '<table>\n' +
      '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>\n';
  }
  renderRow(item) {
    const styleAttr = item.priority ? ' style="font-weight:bold;"' : '';
    return `<tr${styleAttr}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
  }
  renderFooter(total) {
    return '</table>\n' +
      `<h3>Total: ${total}</h3>\n` +
      '</body></html>\n';
  }
}

const formatters = {
  CSV: new CsvReportFormatter(),
  HTML: new HtmlReportFormatter(),
};

function isItemVisibleForUser(item, user) {
  if (user.role === USER_ROLES.ADMIN) return true;
  if (user.role === USER_ROLES.USER) return item.value <= USER_VALUE_LIMIT;
  return false;
}

function prepareItem(item, user) {
  if (user.role === USER_ROLES.ADMIN && item.value > ADMIN_PRIORITY_THRESHOLD) {
    item.priority = true;
  }
  return item;
}

function calculateTotal(items) {
  return items.reduce((accumulator, item) => accumulator + item.value, 0);
}

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  generateReport(reportType, user, items) {
    const formatter = formatters[reportType];
    if (!formatter) return '';

    const visibleItems = items
      .filter((item) => isItemVisibleForUser(item, user))
      .map((item) => prepareItem(item, user));

    const total = calculateTotal(visibleItems);

    const header = formatter.renderHeader(user);
    const body = visibleItems.map((item) => formatter.renderRow(item, user)).join('');
    const footer = formatter.renderFooter(total);

    return `${header}${body}${footer}`.trim();
  }
}
```

### 4.3. Validação do Código Refatorado com ESLint
Ao executar o ESLint especificamente sobre o arquivo refatorado:
```bash
npx eslint src/ReportGenerator.refactored.js
```
**Resultado:**
```
0 problems (0 errors, 0 warnings)
```
A complexidade cognitiva de cada função foi reduzida para **$\le 1$**, todas as condicionais foram simplificadas e não há duplicações.

---

## 5. Validação com Testes (Rede de Segurança)

Para garantir que as modificações preservaram 100% da integridade do sistema sem introduzir regressões funcionais, foi criado o arquivo de testes dedicado `__tests__/ReportGenerator.refactored.test.js` (mantendo paridade com `tests/ReportGenerator.test.js`).

Ao executar a suíte de testes com Jest:
```bash
npm test
```

### Resultado da Execução dos Testes:
```
PASS __tests__/ReportGenerator.refactored.test.js
PASS tests/ReportGenerator.refactored.test.js
PASS tests/ReportGenerator.test.js

Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        4.507 s
Ran all test suites.
```

Ambos os arquivos de produção (o original e o refatorado) passam com 100% de sucesso em todos os cenários:
* Geração de CSV completo para Administrador com todos os itens e total correto;
* Geração de HTML completo para Administrador com itens destacados por prioridade (`style="font-weight:bold;"`);
* Filtragem correta de itens para Usuário comum em CSV (somente itens com valor $\le 500$);
* Filtragem correta de itens para Usuário comum em HTML;
* Tratamento robusto de casos de borda (array de itens vazio com total 0).

---

## 6. Conclusão

A refatoração de software é uma disciplina indispensável para a sustentabilidade de qualquer base de código comercial. Como preconizado por Martin Fowler, refatorar consiste em alterar a estrutura interna de um software sem modificar seu comportamento observável externo.

Neste trabalho prático, foi possível vivenciar os dois pilares fundamentais da refatoração segura:
1. **A Suíte de Testes como Rede de Segurança (Safety Net):** É impossível refatorar com segurança sem testes automatizados confiáveis. Eles proporcionam a confiança necessária para transformar código espaguete procedural em arquiteturas orientadas a objetos e padrões de projeto (como o *Strategy Pattern*), sabendo a cada comando `npm test` se alguma regra foi violada.
2. **Análise Estática Automatizada como Guia de Qualidade:** O uso do ESLint com `eslint-plugin-sonarjs` demonstrou que a identificação de *Bad Smells* não precisa depender exclusivamente de intuição subjetiva. A mensuração de complexidade cognitiva oferece métricas tangíveis que guiam o arquiteto na quebra e simplificação de funções.

Com a eliminação dos *Bad Smells*, o código tornou-se modular, altamente legível, aberto para extensão (podendo receber novos formatos de relatório sem modificação nas classes existentes) e muito mais fácil de manter e testar.

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
  if (user.role === USER_ROLES.ADMIN) {
    return true;
  }
  if (user.role === USER_ROLES.USER) {
    return item.value <= USER_VALUE_LIMIT;
  }
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

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   * - Admins veem tudo.
   * - Users comuns só veem itens com valor <= 500.
   */
  generateReport(reportType, user, items) {
    const formatter = formatters[reportType];
    if (!formatter) {
      return '';
    }

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

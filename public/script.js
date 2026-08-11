const API = '/api';
const TIPOS_SERVICO = ['site', 'sistema', 'designer', 'midia'];
const NOME_TIPO = { site: 'Site', sistema: 'Sistema', designer: 'Designer', midia: 'Midia social' };

// cache local dos registros de cada servico, evita recarregar do servidor
// toda vez que o usuario so muda um filtro de busca/status
const SERVICE_CACHE = {};

// ---------- Navegacao entre views ----------
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const viewTitle = document.getElementById('view-title');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const titles = {
  dashboard: 'Painel',
  site: 'Site',
  sistema: 'Sistema (mensal)',
  designer: 'Designer',
  midia: 'Midia social (mensal)',
  relatorio: 'Relatorio'
};

function fecharMenuMobile() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
  document.body.classList.remove('no-scroll');
}
function abrirMenuMobile() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
  document.body.classList.add('no-scroll');
}

function trocarView(target) {
  navItems.forEach(b => b.classList.toggle('active', b.dataset.view === target));
  views.forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${target}`).classList.remove('hidden');
  viewTitle.textContent = titles[target];
  fecharMenuMobile();

  if (target === 'dashboard') carregarDashboard();
  else if (TIPOS_SERVICO.includes(target)) loadService(target);
  else if (target === 'relatorio') carregarRelatorio();
}

navItems.forEach(btn => {
  btn.addEventListener('click', () => trocarView(btn.dataset.view));
});

document.querySelectorAll('.service-card[data-goto]').forEach(card => {
  card.addEventListener('click', () => trocarView(card.dataset.goto));
});

document.getElementById('btnMobileNav').addEventListener('click', () => {
  sidebar.classList.contains('open') ? fecharMenuMobile() : abrirMenuMobile();
});
sidebarOverlay.addEventListener('click', fecharMenuMobile);

// ---------- Utilitarios ----------
function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}
function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}
function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}
function baixarPDF(id) {
  window.open(`${API}/contratos/${id}/pdf`, '_blank');
}

// ---------- Dashboard (visao geral de todos os servicos) ----------
async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/relatorio`);
    const data = await res.json();

    document.getElementById('cardTotal').textContent = formatMoney(data.total_geral);
    document.getElementById('cardVitor').textContent = formatMoney(data.total_vitor);
    document.getElementById('cardLucas').textContent = formatMoney(data.total_lucas);
    document.getElementById('cardQtd').textContent = data.quantidade_contratos;

    TIPOS_SERVICO.forEach(tipo => {
      const info = data.por_tipo[tipo];
      const el = document.getElementById(`cardServico-${tipo}`);
      if (el) el.textContent = formatMoney(info ? info.valor : 0);
    });

    const tbody = document.querySelector('#tabelaRecentes tbody');
    tbody.innerHTML = '';
    const recentes = data.contratos.slice(0, 8);
    if (!recentes.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Nenhum registro cadastrado ainda.</td></tr>';
    }
    recentes.forEach(c => {
      tbody.innerHTML += `
        <tr>
          <td data-label="Cliente">${escapeHTML(c.cliente_nome)}</td>
          <td data-label="Servico">${NOME_TIPO[c.tipo_servico] || c.tipo_servico}</td>
          <td data-label="Valor">${formatMoney(c.valor_total)}</td>
          <td data-label="Status"><span class="badge ${c.status}">${c.status}</span></td>
          <td data-label=""><button class="link-btn" onclick="baixarPDF(${c.id})">PDF</button></td>
        </tr>`;
    });
  } catch (err) {
    toast('Erro ao carregar painel. Verifique se o servidor e o banco estao rodando.', true);
  }
}

// ---------- Carregamento por servico (aba propria) ----------
async function loadService(tipo) {
  try {
    const res = await fetch(`${API}/contratos?tipo_servico=${tipo}`);
    const rows = await res.json();
    SERVICE_CACHE[tipo] = rows;
    renderServiceCards(tipo, rows);
    renderServiceTable(tipo);
  } catch (err) {
    toast('Erro ao carregar dados do servico.', true);
  }
}

function renderServiceCards(tipo, rows) {
  const total = rows.reduce((a, r) => a + Number(r.valor_total), 0);
  const pago = rows.filter(r => r.status === 'pago').reduce((a, r) => a + Number(r.valor_total), 0);
  const pendente = rows.filter(r => r.status === 'pendente').reduce((a, r) => a + Number(r.valor_total), 0);

  document.getElementById(`card-${tipo}-total`).textContent = formatMoney(total);
  document.getElementById(`card-${tipo}-pago`).textContent = formatMoney(pago);
  document.getElementById(`card-${tipo}-pendente`).textContent = formatMoney(pendente);
  document.getElementById(`card-${tipo}-qtd`).textContent = rows.length;
}

function renderServiceTable(tipo) {
  const view = document.getElementById(`view-${tipo}`);
  const recorrente = view.dataset.recorrente === 'true';
  const busca = view.querySelector('.filtro-busca').value.trim().toLowerCase();
  const status = view.querySelector('.filtro-status').value;

  let rows = SERVICE_CACHE[tipo] || [];
  if (busca) rows = rows.filter(r => r.cliente_nome.toLowerCase().includes(busca));
  if (status) rows = rows.filter(r => r.status === status);

  const tbody = document.querySelector(`#tabela-${tipo} tbody`);
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum registro encontrado.</td></tr>';
    return;
  }

  rows.forEach(c => {
    const colPeriodo = recorrente
      ? formatDate(c.periodo_inicio)
      : `${formatDate(c.periodo_inicio)} - ${formatDate(c.periodo_fim)}`;

    tbody.innerHTML += `
      <tr>
        <td data-label="Cliente">${escapeHTML(c.cliente_nome)}</td>
        <td data-label="${recorrente ? 'Data pagamento' : 'Periodo'}">${colPeriodo}</td>
        <td data-label="Valor">${formatMoney(c.valor_total)}</td>
        <td data-label="Vitor">${formatMoney(c.valor_vitor)}</td>
        <td data-label="Lucas">${formatMoney(c.valor_lucas)}</td>
        <td data-label="Status">
          <select class="status-select" data-id="${c.id}" data-tipo="${tipo}" style="padding:8px 10px;font-size:13px;">
            <option value="pendente" ${c.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="pago" ${c.status === 'pago' ? 'selected' : ''}>Pago</option>
            <option value="cancelado" ${c.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </td>
        <td data-label="Acoes">
          <button class="link-btn" onclick="baixarPDF(${c.id})">PDF</button>
          <button class="link-btn danger" onclick="excluirRegistro(${c.id}, '${tipo}')">Excluir</button>
        </td>
      </tr>`;
  });

  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      await fetch(`${API}/contratos/${sel.dataset.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: sel.value })
      });
      toast('Status atualizado.');
      loadService(sel.dataset.tipo);
    });
  });
}

async function excluirRegistro(id, tipo) {
  if (!confirm('Tem certeza que deseja excluir este registro? Essa acao nao pode ser desfeita.')) return;
  try {
    await fetch(`${API}/contratos/${id}`, { method: 'DELETE' });
    toast('Registro excluido.');
    loadService(tipo);
  } catch (err) {
    toast('Erro ao excluir registro.', true);
  }
}

// filtros de busca/status de cada aba de servico
TIPOS_SERVICO.forEach(tipo => {
  const view = document.getElementById(`view-${tipo}`);
  view.querySelector('.filtro-busca').addEventListener('input', debounce(() => renderServiceTable(tipo), 300));
  view.querySelector('.filtro-status').addEventListener('change', () => renderServiceTable(tipo));
});

// ---------- Formularios de cada servico (site, sistema, designer, midia) ----------
document.querySelectorAll('.form-servico').forEach(form => {
  const tipo = form.dataset.tipo;
  const recorrente = form.dataset.recorrente === 'true';
  const inputValor = form.querySelector('[name="valor_total"]');
  const previewVitor = form.querySelector('.preview-vitor');
  const previewLucas = form.querySelector('.preview-lucas');

  function atualizarPreview() {
    const v = Number(inputValor.value || 0);
    const metade = Math.round((v / 2) * 100) / 100;
    previewVitor.textContent = formatMoney(metade);
    previewLucas.textContent = formatMoney(v - metade);
  }
  inputValor.addEventListener('input', atualizarPreview);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form).entries());
    dados.tipo_servico = tipo;

    if (recorrente) {
      // servico recorrente: o usuario informa so a data de pagamento,
      // o fim do periodo (fechamento do mes) e calculado automaticamente
      const inicio = new Date(`${dados.periodo_inicio}T00:00:00`);
      const fim = new Date(inicio);
      fim.setMonth(fim.getMonth() + 1);
      dados.periodo_fim = fim.toISOString().slice(0, 10);
    } else if (new Date(dados.periodo_fim) < new Date(dados.periodo_inicio)) {
      toast('A data de fim deve ser depois da data de inicio.', true);
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
      const res = await fetch(`${API}/contratos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.erro || 'Erro ao salvar registro.');

      toast(`${NOME_TIPO[tipo]} de ${result.cliente_nome} salvo com sucesso!`);
      form.reset();
      atualizarPreview();
      baixarPDF(result.id);
      loadService(tipo);
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  });
});

// ---------- Relatorio financeiro geral ----------
async function carregarRelatorio() {
  const inicio = document.getElementById('repInicio').value;
  const fim = document.getElementById('repFim').value;

  const params = new URLSearchParams();
  if (inicio) params.set('periodo_inicio', inicio);
  if (fim) params.set('periodo_fim', fim);

  try {
    const res = await fetch(`${API}/relatorio?${params}`);
    const data = await res.json();

    document.getElementById('repTotal').textContent = formatMoney(data.total_geral);
    document.getElementById('repVitor').textContent = formatMoney(data.total_vitor);
    document.getElementById('repLucas').textContent = formatMoney(data.total_lucas);
    document.getElementById('repPagoPendente').textContent = `${formatMoney(data.total_pago)} / ${formatMoney(data.total_pendente)}`;

    const tbody = document.querySelector('#tabelaPorTipo tbody');
    tbody.innerHTML = '';
    const tipos = Object.keys(data.por_tipo);
    if (!tipos.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="3">Sem dados para o periodo selecionado.</td></tr>';
    }
    tipos.forEach(tipo => {
      const t = data.por_tipo[tipo];
      tbody.innerHTML += `<tr><td data-label="Servico">${NOME_TIPO[tipo] || tipo}</td><td data-label="Quantidade">${t.quantidade}</td><td data-label="Valor total">${formatMoney(t.valor)}</td></tr>`;
    });
  } catch (err) {
    toast('Erro ao gerar relatorio.', true);
  }
}
document.getElementById('btnGerarRelatorio').addEventListener('click', carregarRelatorio);

// ---------- Inicializacao ----------
carregarDashboard();

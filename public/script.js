const API = '/api';

// ---------- Navegacao entre views ----------
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const viewTitle = document.getElementById('view-title');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const titles = { dashboard: 'Painel', novo: 'Novo contrato', lista: 'Contratos', relatorio: 'Relatorio' };

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

navItems.forEach(btn => {
  btn.addEventListener('click', () => {
    navItems.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.view;
    views.forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${target}`).classList.remove('hidden');
    viewTitle.textContent = titles[target];
    fecharMenuMobile();

    if (target === 'dashboard') carregarDashboard();
    if (target === 'lista') carregarLista();
    if (target === 'relatorio') carregarRelatorio();
  });
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
const NOME_TIPO = { site: 'Site', sistema: 'Sistema', designer: 'Designer', midia: 'Midia' };

// ---------- Dashboard ----------
async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/relatorio`);
    const data = await res.json();

    document.getElementById('cardTotal').textContent = formatMoney(data.total_geral);
    document.getElementById('cardVitor').textContent = formatMoney(data.total_vitor);
    document.getElementById('cardLucas').textContent = formatMoney(data.total_lucas);
    document.getElementById('cardQtd').textContent = data.quantidade_contratos;

    const tbody = document.querySelector('#tabelaRecentes tbody');
    tbody.innerHTML = '';
    const recentes = data.contratos.slice(0, 8);
    if (!recentes.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Nenhum contrato cadastrado ainda.</td></tr>';
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

// ---------- Novo contrato ----------
const form = document.getElementById('formContrato');
const inputValor = form.querySelector('[name="valor_total"]');

function atualizarPreview() {
  const v = Number(inputValor.value || 0);
  const metade = Math.round((v / 2) * 100) / 100;
  document.getElementById('previewVitor').textContent = formatMoney(metade);
  document.getElementById('previewLucas').textContent = formatMoney(v - metade);
}
inputValor.addEventListener('input', atualizarPreview);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(form).entries());

  if (new Date(dados.periodo_fim) < new Date(dados.periodo_inicio)) {
    toast('A data de fim deve ser depois da data de inicio.', true);
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Gerando...';

  try {
    const res = await fetch(`${API}/contratos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.erro || 'Erro ao gerar contrato.');

    toast(`Contrato de ${result.cliente_nome} gerado com sucesso!`);
    form.reset();
    atualizarPreview();
    baixarPDF(result.id);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gerar contrato em PDF';
  }
});

function baixarPDF(id) {
  window.open(`${API}/contratos/${id}/pdf`, '_blank');
}

// ---------- Lista de contratos ----------
async function carregarLista() {
  const busca = document.getElementById('filtroBusca').value;
  const tipo = document.getElementById('filtroTipo').value;
  const status = document.getElementById('filtroStatus').value;

  const params = new URLSearchParams();
  if (busca) params.set('busca', busca);
  if (tipo) params.set('tipo_servico', tipo);
  if (status) params.set('status', status);

  try {
    const res = await fetch(`${API}/contratos?${params}`);
    const rows = await res.json();
    const tbody = document.querySelector('#tabelaLista tbody');
    tbody.innerHTML = '';

    if (!rows.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Nenhum contrato encontrado.</td></tr>';
      return;
    }

    rows.forEach(c => {
      tbody.innerHTML += `
        <tr>
          <td data-label="Cliente">${escapeHTML(c.cliente_nome)}</td>
          <td data-label="Servico">${NOME_TIPO[c.tipo_servico] || c.tipo_servico}</td>
          <td data-label="Periodo">${formatDate(c.periodo_inicio)} - ${formatDate(c.periodo_fim)}</td>
          <td data-label="Valor">${formatMoney(c.valor_total)}</td>
          <td data-label="Vitor">${formatMoney(c.valor_vitor)}</td>
          <td data-label="Lucas">${formatMoney(c.valor_lucas)}</td>
          <td data-label="Status">
            <select class="status-select" data-id="${c.id}" style="padding:8px 10px;font-size:13px;">
              <option value="pendente" ${c.status === 'pendente' ? 'selected' : ''}>Pendente</option>
              <option value="pago" ${c.status === 'pago' ? 'selected' : ''}>Pago</option>
              <option value="cancelado" ${c.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
          </td>
          <td data-label="Acoes">
            <button class="link-btn" onclick="baixarPDF(${c.id})">PDF</button>
            <button class="link-btn danger" onclick="excluirContrato(${c.id})">Excluir</button>
          </td>
        </tr>`;
    });

    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        await fetch(`${API}/contratos/${sel.dataset.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: sel.value })
        });
        toast('Status atualizado.');
      });
    });
  } catch (err) {
    toast('Erro ao carregar contratos.', true);
  }
}

async function excluirContrato(id) {
  if (!confirm('Tem certeza que deseja excluir este contrato? Essa acao nao pode ser desfeita.')) return;
  try {
    await fetch(`${API}/contratos/${id}`, { method: 'DELETE' });
    toast('Contrato excluido.');
    carregarLista();
    carregarDashboard();
  } catch (err) {
    toast('Erro ao excluir contrato.', true);
  }
}

document.getElementById('filtroBusca').addEventListener('input', debounce(carregarLista, 350));
document.getElementById('filtroTipo').addEventListener('change', carregarLista);
document.getElementById('filtroStatus').addEventListener('change', carregarLista);

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ---------- Relatorio ----------
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

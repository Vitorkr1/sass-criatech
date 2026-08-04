const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./db');
const { gerarContratoPDF } = require('./pdfGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Utilitario: calcula divisao 50/50 ----------
function calcularDivisao(valorTotal) {
    const valor = Number(valorTotal);
    const metade = Math.round((valor / 2) * 100) / 100;
    return { valor_vitor: metade, valor_lucas: valor - metade };
}

// ---------- Criar contrato/servico ----------
app.post('/api/contratos', async (req, res) => {
    try {
        const {
            cliente_nome, cliente_documento, cliente_contato,
            tipo_servico, descricao, periodo_inicio, periodo_fim,
            valor_total, clausulas_extra, status
        } = req.body;

        if (!cliente_nome || !tipo_servico || !periodo_inicio || !periodo_fim || !valor_total) {
            return res.status(400).json({ erro: 'Campos obrigatorios: cliente_nome, tipo_servico, periodo_inicio, periodo_fim, valor_total.' });
        }

        const { valor_vitor, valor_lucas } = calcularDivisao(valor_total);

        const { rows } = await pool.query(
            `INSERT INTO contratos
            (cliente_nome, cliente_documento, cliente_contato, tipo_servico, descricao,
             periodo_inicio, periodo_fim, valor_total, valor_vitor, valor_lucas, status, clausulas_extra)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING *`,
            [cliente_nome, cliente_documento || null, cliente_contato || null, tipo_servico, descricao || null,
             periodo_inicio, periodo_fim, valor_total, valor_vitor, valor_lucas, status || 'pendente', clausulas_extra || null]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar contrato.', detalhe: err.message });
    }
});

// ---------- Listar contratos (com filtros opcionais) ----------
app.get('/api/contratos', async (req, res) => {
    try {
        const { tipo_servico, status, busca } = req.query;
        let sql = 'SELECT * FROM contratos WHERE 1=1';
        const params = [];

        if (tipo_servico) { params.push(tipo_servico); sql += ` AND tipo_servico = $${params.length}`; }
        if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
        if (busca) { params.push(`%${busca}%`); sql += ` AND cliente_nome ILIKE $${params.length}`; }

        sql += ' ORDER BY criado_em DESC';

        const { rows } = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao listar contratos.', detalhe: err.message });
    }
});

// ---------- Buscar um contrato ----------
app.get('/api/contratos/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM contratos WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ erro: 'Contrato nao encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar contrato.', detalhe: err.message });
    }
});

// ---------- Atualizar status ----------
app.patch('/api/contratos/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pendente', 'pago', 'cancelado'].includes(status)) {
            return res.status(400).json({ erro: 'Status invalido.' });
        }
        await pool.query('UPDATE contratos SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao atualizar status.', detalhe: err.message });
    }
});

// ---------- Baixar PDF do contrato (gerado na hora, sem depender de disco) ----------
app.get('/api/contratos/:id/pdf', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM contratos WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ erro: 'Contrato nao encontrado.' });

        const pdfBuffer = await gerarContratoPDF(rows[0]);
        const nomeArquivo = `contrato_${rows[0].cliente_nome.replace(/\s+/g, '_')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao gerar PDF.', detalhe: err.message });
    }
});

// ---------- Excluir contrato ----------
app.delete('/api/contratos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM contratos WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao excluir contrato.', detalhe: err.message });
    }
});

// ---------- Relatorio financeiro ----------
app.get('/api/relatorio', async (req, res) => {
    try {
        const { periodo_inicio, periodo_fim } = req.query;
        let sql = 'SELECT * FROM contratos WHERE 1=1';
        const params = [];

        if (periodo_inicio) { params.push(periodo_inicio); sql += ` AND periodo_inicio >= $${params.length}`; }
        if (periodo_fim) { params.push(periodo_fim); sql += ` AND periodo_fim <= $${params.length}`; }

        const { rows } = await pool.query(sql, params);

        const totalGeral = rows.reduce((acc, r) => acc + Number(r.valor_total), 0);
        const totalVitor = rows.reduce((acc, r) => acc + Number(r.valor_vitor), 0);
        const totalLucas = rows.reduce((acc, r) => acc + Number(r.valor_lucas), 0);
        const totalPago = rows.filter(r => r.status === 'pago').reduce((acc, r) => acc + Number(r.valor_total), 0);
        const totalPendente = rows.filter(r => r.status === 'pendente').reduce((acc, r) => acc + Number(r.valor_total), 0);

        const porTipo = {};
        for (const r of rows) {
            if (!porTipo[r.tipo_servico]) porTipo[r.tipo_servico] = { quantidade: 0, valor: 0 };
            porTipo[r.tipo_servico].quantidade += 1;
            porTipo[r.tipo_servico].valor += Number(r.valor_total);
        }

        res.json({
            quantidade_contratos: rows.length,
            total_geral: totalGeral,
            total_vitor: totalVitor,
            total_lucas: totalLucas,
            total_pago: totalPago,
            total_pendente: totalPendente,
            por_tipo: porTipo,
            contratos: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao gerar relatorio.', detalhe: err.message });
    }
});

// Rota de saude, util para o Render checar se o servico esta de pe
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, async () => {
    try {
        await pool.query('SELECT 1');
        console.log('Conexao com o banco OK.');
    } catch (err) {
        console.error('AVISO: nao foi possivel conectar ao banco. Confira DATABASE_URL e se o schema.sql foi importado.');
        console.error(err.message);
    }
    console.log(`Cria Tech rodando na porta ${PORT}`);
});

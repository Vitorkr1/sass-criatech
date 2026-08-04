const PDFDocument = require('pdfkit');
const path = require('path');

const LOGO_PATH = path.join(__dirname, 'public', 'assets', 'logo.png');
const SITE_URL = 'criatech.online';
const WHATSAPP = '(81) 99674-4143';

// Paleta de marca (mesma do painel web)
const COR_NAVY = '#161b28';
const COR_TEXTO = '#2b2f3a';
const COR_MUTED = '#767f92';
const COR_MUTED_2 = '#a2a9b8';
const COR_VITOR = '#00b088';
const COR_LUCAS = '#7361e0';
const COR_BORDA = '#e3e5ec';
const COR_FUNDO_SUAVE = '#f6f7fb';

function formatMoney(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

const OBJETOS_POR_TIPO = {
    site: 'desenvolvimento e entrega de um website, incluindo estrutura, layout responsivo e publicacao',
    sistema: 'desenvolvimento de sistema/software sob medida, incluindo levantamento de requisitos, desenvolvimento, testes e implantacao',
    designer: 'criacao de identidade visual e materiais de design grafico conforme briefing acordado entre as partes',
    midia: 'gestao de midias sociais e producao de conteudo digital durante o periodo contratado'
};

const NOME_TIPO = {
    site: 'Desenvolvimento de Site',
    sistema: 'Desenvolvimento de Sistema',
    designer: 'Servicos de Design',
    midia: 'Gestao de Midias'
};

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Gera o PDF do contrato inteiramente em memoria e retorna um Buffer.
 * Nao depende de disco (alem de ler o logo estatico do projeto), por isso
 * funciona em hospedagens com sistema de arquivos efemero (Render, etc).
 * @param {object} c - dados do contrato (linha do banco)
 * @returns {Promise<Buffer>}
 */
function gerarContratoPDF(c) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            margin: MARGIN,
            size: 'A4',
            bufferPages: true,
            info: {
                Title: `Contrato ${c.cliente_nome} - CriaTech`,
                Author: 'CriaTech',
                Subject: 'Contrato de Prestacao de Servicos'
            }
        });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        desenharCabecalho(doc, c);
        desenharPartes(doc, c);
        desenharSecoes(doc, c);
        desenharValores(doc, c);
        desenharAssinaturas(doc, c);
        desenharRodapeEmTodasPaginas(doc);

        doc.end();
    });
}

// ---------------------------------------------------------------------
// Cabecalho com logo, marca e numero do contrato
// ---------------------------------------------------------------------
function desenharCabecalho(doc, c) {
    const topY = MARGIN;
    const logoSize = 40;

    try {
        doc.image(LOGO_PATH, MARGIN, topY, { width: logoSize, height: logoSize });
    } catch (e) {
        // segue sem logo caso o arquivo nao esteja disponivel
    }

    const textX = MARGIN + logoSize + 12;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COR_NAVY)
        .text('CRIATECH', textX, topY + 3, { characterSpacing: 0.6 });
    doc.font('Helvetica').fontSize(8.5).fillColor(COR_MUTED)
        .text('Sites  \u2022  Sistemas  \u2022  Design', textX, topY + 22);

    const numeroTexto = `CONTRATO N\u00ba ${String(c.id).padStart(4, '0')}`;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COR_NAVY)
        .text(numeroTexto, MARGIN, topY + 3, { width: CONTENT_WIDTH, align: 'right' });
    doc.font('Helvetica').fontSize(8.5).fillColor(COR_MUTED)
        .text(`Emitido em ${formatDate(new Date())}`, MARGIN, topY + 18, { width: CONTENT_WIDTH, align: 'right' });

    const lineY = topY + logoSize + 14;
    doc.moveTo(MARGIN, lineY).lineTo(PAGE_WIDTH - MARGIN, lineY).lineWidth(1).strokeColor(COR_BORDA).stroke();

    doc.font('Helvetica-Bold').fontSize(14).fillColor(COR_NAVY)
        .text('CONTRATO DE PRESTA\u00c7\u00c3O DE SERVI\u00c7OS', MARGIN, lineY + 16, { width: CONTENT_WIDTH, align: 'center' });

    doc.x = MARGIN;
    doc.y = lineY + 40;
}

// ---------------------------------------------------------------------
// Bloco com as partes (contratante / contratada)
// ---------------------------------------------------------------------
function desenharPartes(doc, c) {
    const boxX = MARGIN;
    const boxW = CONTENT_WIDTH;
    const startY = doc.y;
    const padding = 14;
    const colW = boxW / 2 - padding;

    let linhasEsquerda = [`CONTRATANTE`, c.cliente_nome];
    if (c.cliente_documento) linhasEsquerda.push(`Documento: ${c.cliente_documento}`);
    if (c.cliente_contato) linhasEsquerda.push(`Contato: ${c.cliente_contato}`);

    let linhasDireita = [`CONTRATADA`, 'CriaTech', `Site: ${SITE_URL}`, `WhatsApp: ${WHATSAPP}`];

    const alturaConteudo = 16 + Math.max(linhasEsquerda.length - 1, linhasDireita.length - 1) * 14;
    const boxH = alturaConteudo + padding * 2 - 4;

    doc.roundedRect(boxX, startY, boxW, boxH, 8).fillAndStroke(COR_FUNDO_SUAVE, COR_BORDA);

    const textStartY = startY + padding;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COR_MUTED)
        .text(linhasEsquerda[0], boxX + padding, textStartY, { characterSpacing: 0.5 });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COR_NAVY)
        .text(linhasEsquerda[1], boxX + padding, textStartY + 14, { width: colW });
    doc.font('Helvetica').fontSize(9.5).fillColor(COR_TEXTO);
    linhasEsquerda.slice(2).forEach((linha, i) => {
        doc.text(linha, boxX + padding, textStartY + 30 + i * 14, { width: colW });
    });

    const rightX = boxX + boxW / 2 + padding / 2;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COR_MUTED)
        .text(linhasDireita[0], rightX, textStartY, { characterSpacing: 0.5 });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COR_NAVY)
        .text(linhasDireita[1], rightX, textStartY + 14, { width: colW });
    doc.font('Helvetica').fontSize(9.5).fillColor(COR_TEXTO);
    linhasDireita.slice(2).forEach((linha, i) => {
        doc.text(linha, rightX, textStartY + 30 + i * 14, { width: colW });
    });

    doc.x = MARGIN;
    doc.y = startY + boxH + 22;
}

// ---------------------------------------------------------------------
// Secoes numeradas do contrato (objeto, escopo, prazo, clausulas)
// ---------------------------------------------------------------------
function tituloSecao(doc, texto) {
    const y = doc.y;
    doc.roundedRect(MARGIN, y + 2, 4, 12, 2).fill(COR_VITOR);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COR_NAVY)
        .text(texto, MARGIN + 12, y, { width: CONTENT_WIDTH - 12 });
    doc.moveDown(0.5);
    doc.x = MARGIN;
}

function paragrafo(doc, texto) {
    doc.font('Helvetica').fontSize(10).fillColor(COR_TEXTO)
        .text(texto, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'justify', lineGap: 2 });
    doc.moveDown(0.9);
    doc.x = MARGIN;
}

function desenharSecoes(doc, c) {
    tituloSecao(doc, '1. Do Objeto');
    paragrafo(doc, `A CONTRATADA prestara a CONTRATANTE servicos de ${OBJETOS_POR_TIPO[c.tipo_servico] || 'servico contratado'}.`);

    let numero = 2;

    if (c.descricao) {
        tituloSecao(doc, `${numero}. Do Escopo`);
        paragrafo(doc, c.descricao);
        numero++;
    }

    tituloSecao(doc, `${numero}. Do Prazo`);
    paragrafo(doc, `O presente contrato tera vigencia de ${formatDate(c.periodo_inicio)} ate ${formatDate(c.periodo_fim)}.`);
    numero++;

    tituloSecao(doc, `${numero}. Do Valor e Pagamento`);
    paragrafo(doc, `O valor total dos servicos e de ${formatMoney(c.valor_total)}, a ser pago conforme acordo entre as partes, com status atual "${(c.status || 'pendente').toUpperCase()}".`);
    numero++;

    if (c.clausulas_extra) {
        tituloSecao(doc, `${numero}. Clausulas Adicionais`);
        paragrafo(doc, c.clausulas_extra);
        numero++;
    }
}

// ---------------------------------------------------------------------
// Bloco destacado com o valor total e o status do pagamento
// ---------------------------------------------------------------------
const STATUS_INFO = {
    pago:       { label: 'PAGO',       cor: '#0a8a63', fundo: '#e3f7ef' },
    pendente:   { label: 'PENDENTE',   cor: '#b8720a', fundo: '#fbf0dc' },
    cancelado:  { label: 'CANCELADO',  cor: '#c23838', fundo: '#fbe4e4' }
};

function desenharValores(doc, c) {
    const y = doc.y + 4;
    const rowH = 56;
    const statusW = 150;
    const valorW = CONTENT_WIDTH - statusW;

    const status = STATUS_INFO[c.status] || STATUS_INFO.pendente;

    // Caixa do valor total (destaque principal)
    doc.roundedRect(MARGIN, y, valorW - 8, rowH, 8).fillAndStroke(COR_FUNDO_SUAVE, COR_BORDA);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COR_MUTED)
        .text('VALOR TOTAL DO CONTRATO', MARGIN + 18, y + 14, { characterSpacing: 0.4 });
    doc.font('Helvetica-Bold').fontSize(22).fillColor(COR_NAVY)
        .text(formatMoney(c.valor_total), MARGIN + 18, y + 27, { width: valorW - 44 });

    // Caixa do status (destaque colorido)
    const statusX = MARGIN + valorW;
    doc.roundedRect(statusX, y, statusW, rowH, 8).fillAndStroke(status.fundo, status.cor);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(status.cor)
        .text('STATUS', statusX, y + 14, { width: statusW, align: 'center', characterSpacing: 0.5 });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(status.cor)
        .text(status.label, statusX, y + 30, { width: statusW, align: 'center', characterSpacing: 0.6 });

    doc.x = MARGIN;
    doc.y = y + rowH + 30;
}

// ---------------------------------------------------------------------
// Assinaturas
// ---------------------------------------------------------------------
function desenharAssinaturas(doc, c) {
    if (doc.y > 680) doc.addPage();

    doc.font('Helvetica').fontSize(9.5).fillColor(COR_MUTED)
        .text(`Recife/PE, ${formatDate(new Date())}.`, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'right' });
    doc.moveDown(3);

    const y = doc.y;
    const colW = CONTENT_WIDTH / 2 - 10;

    doc.moveTo(MARGIN, y).lineTo(MARGIN + colW, y).strokeColor(COR_BORDA).lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COR_NAVY)
        .text('CriaTech', MARGIN, y + 6, { width: colW });
    doc.font('Helvetica').fontSize(8.5).fillColor(COR_MUTED)
        .text('Contratada', MARGIN, y + 19, { width: colW });

    const x2 = MARGIN + CONTENT_WIDTH / 2 + 10;
    doc.moveTo(x2, y).lineTo(x2 + colW, y).strokeColor(COR_BORDA).lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COR_NAVY)
        .text(c.cliente_nome, x2, y + 6, { width: colW });
    doc.font('Helvetica').fontSize(8.5).fillColor(COR_MUTED)
        .text('Contratante', x2, y + 19, { width: colW });
}

// ---------------------------------------------------------------------
// Rodape com pagina e dados de contato, aplicado em todas as paginas
// ---------------------------------------------------------------------
function desenharRodapeEmTodasPaginas(doc) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const y = 792 - 46; // A4 height 841.89, deixa margem inferior segura
        doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(COR_BORDA).lineWidth(0.75).stroke();
        doc.font('Helvetica').fontSize(8).fillColor(COR_MUTED_2)
            .text(`CriaTech  \u2022  ${SITE_URL}  \u2022  WhatsApp ${WHATSAPP}`, MARGIN, y + 8, { width: CONTENT_WIDTH - 80, align: 'left' });
        doc.text(`P\u00e1gina ${i - range.start + 1} de ${range.count}`, PAGE_WIDTH - MARGIN - 80, y + 8, { width: 80, align: 'right' });
    }
}

module.exports = { gerarContratoPDF };

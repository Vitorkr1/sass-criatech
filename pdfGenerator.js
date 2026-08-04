const PDFDocument = require('pdfkit');

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

/**
 * Gera o PDF do contrato inteiramente em memoria e retorna um Buffer.
 * Nao depende de disco, por isso funciona em hospedagens com sistema de
 * arquivos efemero (Render, etc). Chame sob demanda sempre que precisar do PDF.
 * @param {object} c - dados do contrato (linha do banco)
 * @returns {Promise<Buffer>}
 */
function gerarContratoPDF(c) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 56, size: 'A4' });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(20).fillColor('#1a1a2e').text('CRIA TECH', { align: 'center' });
        doc.fontSize(11).fillColor('#555').text('Contrato de Prestacao de Servicos', { align: 'center' });
        doc.moveDown(1.5);
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
        doc.moveDown(1);

        doc.fontSize(13).fillColor('#1a1a2e').text(`Objeto: ${NOME_TIPO[c.tipo_servico] || c.tipo_servico}`);
        doc.moveDown(0.8);

        doc.fontSize(10.5).fillColor('#333');
        doc.text(`CONTRATANTE: ${c.cliente_nome}`);
        if (c.cliente_documento) doc.text(`Documento: ${c.cliente_documento}`);
        if (c.cliente_contato) doc.text(`Contato: ${c.cliente_contato}`);
        doc.moveDown(0.5);
        doc.text('CONTRATADA: CRIA TECH');
        doc.moveDown(1);

        doc.fontSize(11).fillColor('#1a1a2e').text('1. Do Objeto');
        doc.fontSize(10.5).fillColor('#333').text(
            `A CONTRATADA prestara ao CONTRATANTE servicos de ${OBJETOS_POR_TIPO[c.tipo_servico] || 'servico contratado'}.`,
            { align: 'justify' }
        );
        doc.moveDown(0.8);

        if (c.descricao) {
            doc.fontSize(11).fillColor('#1a1a2e').text('2. Do Escopo');
            doc.fontSize(10.5).fillColor('#333').text(c.descricao, { align: 'justify' });
            doc.moveDown(0.8);
        }

        doc.fontSize(11).fillColor('#1a1a2e').text('3. Do Prazo');
        doc.fontSize(10.5).fillColor('#333').text(
            `O presente contrato tera vigencia de ${formatDate(c.periodo_inicio)} ate ${formatDate(c.periodo_fim)}.`
        );
        doc.moveDown(0.8);

        doc.fontSize(11).fillColor('#1a1a2e').text('4. Do Valor e Pagamento');
        doc.fontSize(10.5).fillColor('#333').text(
            `O valor total dos servicos e de ${formatMoney(c.valor_total)}, a ser pago conforme acordo entre as partes.`
        );
        doc.moveDown(0.8);

        if (c.clausulas_extra) {
            doc.fontSize(11).fillColor('#1a1a2e').text('5. Clausulas Adicionais');
            doc.fontSize(10.5).fillColor('#333').text(c.clausulas_extra, { align: 'justify' });
            doc.moveDown(0.8);
        }

        doc.moveDown(2);
        doc.fontSize(10.5).fillColor('#333').text(`Recife, ${formatDate(new Date())}`, { align: 'right' });
        doc.moveDown(3);

        doc.text('_______________________________________', { align: 'left' });
        doc.text('CRIA TECH (Contratada)', { align: 'left' });
        doc.moveDown(1.5);
        doc.text('_______________________________________', { align: 'left' });
        doc.text(`${c.cliente_nome} (Contratante)`, { align: 'left' });

        doc.end();
    });
}

module.exports = { gerarContratoPDF };

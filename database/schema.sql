-- ============================================================
-- Cria Tech - Banco de dados (PostgreSQL / Supabase)
-- Rode este script no SQL Editor do Supabase (ou via psql).
-- ============================================================

CREATE TABLE IF NOT EXISTS contratos (
    id SERIAL PRIMARY KEY,
    cliente_nome VARCHAR(150) NOT NULL,
    cliente_documento VARCHAR(30),
    cliente_contato VARCHAR(150),
    tipo_servico VARCHAR(20) NOT NULL CHECK (tipo_servico IN ('site', 'sistema', 'designer', 'midia')),
    descricao TEXT,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    valor_total NUMERIC(10,2) NOT NULL,
    valor_vitor NUMERIC(10,2) NOT NULL,
    valor_lucas NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    clausulas_extra TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_periodo ON contratos (periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_contratos_tipo ON contratos (tipo_servico);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos (status);

-- Atualiza "atualizado_em" automaticamente a cada UPDATE
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contratos_atualizado_em ON contratos;
CREATE TRIGGER trg_contratos_atualizado_em
BEFORE UPDATE ON contratos
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

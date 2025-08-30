-- Script para atualizar a tabela service_bins conforme solicitado

-- Adicionar as novas colunas à tabela service_bins
ALTER TABLE service_bins 
ADD COLUMN bandeira VARCHAR(100) AFTER service_id,
ADD COLUMN nivel VARCHAR(100) AFTER bandeira,
ADD COLUMN banco VARCHAR(200) AFTER nivel,
ADD COLUMN pais VARCHAR(100) AFTER banco;

-- Adicionar índices para melhor performance nas consultas
CREATE INDEX idx_service_bins_bandeira ON service_bins(bandeira);
CREATE INDEX idx_service_bins_nivel ON service_bins(nivel);
CREATE INDEX idx_service_bins_banco ON service_bins(banco);
CREATE INDEX idx_service_bins_pais ON service_bins(pais);
CREATE INDEX idx_service_bins_service_id ON service_bins(service_id);

-- Opcional: Adicionar constraint para garantir que o BIN tenha no máximo 6 dígitos
ALTER TABLE service_bins 
ADD CONSTRAINT chk_bin_length CHECK (CHAR_LENGTH(bin) <= 6 AND bin REGEXP '^[0-9]+$');

-- Comentários para documentar as colunas
ALTER TABLE service_bins 
MODIFY COLUMN bandeira VARCHAR(100) COMMENT 'Bandeira do cartão (ex: Visa, Mastercard, Amex)',
MODIFY COLUMN nivel VARCHAR(100) COMMENT 'Nível do cartão (ex: Classic, Gold, Platinum)',
MODIFY COLUMN banco VARCHAR(200) COMMENT 'Nome do banco emissor',
MODIFY COLUMN pais VARCHAR(100) COMMENT 'País de origem do cartão';

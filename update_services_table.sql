-- Script para atualizar a tabela services conforme solicitado

-- Alterar a coluna category para ENUM com as opções específicas
ALTER TABLE services 
MODIFY COLUMN category ENUM('cc', 'login-email', 'login-cpf', 'consulta') NOT NULL;

-- Adicionar a coluna formato
ALTER TABLE services 
ADD COLUMN formato TEXT AFTER description;

-- Opcional: Inserir alguns dados de exemplo
INSERT INTO services (id, name, category, description, formato, status, created_at) VALUES
(UUID(), 'SBR OAUTH STRIPE', 'cc', 'Serviço de validação de cartões de crédito via Stripe', 'cc|mes|ano|cvv', 'active', NOW()),
(UUID(), 'Instagram Login', 'login-email', 'Verificação de login do Instagram', 'email:senha', 'active', NOW()),
(UUID(), 'CPF Consulta', 'consulta', 'Consulta de dados por CPF', 'cpf', 'active', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

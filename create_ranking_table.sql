-- Script para criar a tabela ranking conforme solicitado

-- Criar tabela ranking
CREATE TABLE IF NOT EXISTS ranking (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    position INT NOT NULL,
    ranking_type ENUM('affiliates', 'credits', 'activity') NOT NULL DEFAULT 'affiliates',
    score INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para performance
    INDEX idx_ranking_type (ranking_type),
    INDEX idx_ranking_position (position),
    INDEX idx_ranking_user (user_id),
    INDEX idx_ranking_score (score DESC),
    
    -- Constraint para garantir posições únicas por tipo
    UNIQUE KEY unique_position_type (position, ranking_type),
    
    -- Foreign key para users
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comentários para documentar a tabela
ALTER TABLE ranking 
COMMENT = 'Tabela para armazenar rankings de usuários por diferentes critérios';

ALTER TABLE ranking 
MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT 'ID do usuário (FK para users.id)',
MODIFY COLUMN username VARCHAR(50) NOT NULL COMMENT 'Nome do usuário para facilitar consultas',
MODIFY COLUMN position INT NOT NULL COMMENT 'Posição no ranking (1 = primeiro lugar)',
MODIFY COLUMN ranking_type ENUM('affiliates', 'credits', 'activity') NOT NULL DEFAULT 'affiliates' COMMENT 'Tipo de ranking: affiliates (afiliados), credits (créditos), activity (atividade)',
MODIFY COLUMN score INT NOT NULL DEFAULT 0 COMMENT 'Pontuação do usuário no ranking';

-- Procedure para atualizar ranking de afiliados
DELIMITER //
CREATE PROCEDURE UpdateAffiliateRanking()
BEGIN
    -- Limpar ranking de afiliados existente
    DELETE FROM ranking WHERE ranking_type = 'affiliates';
    
    -- Inserir novo ranking baseado em invited_by
    INSERT INTO ranking (id, user_id, username, position, ranking_type, score)
    SELECT 
        UUID() as id,
        u.id as user_id,
        u.username,
        ROW_NUMBER() OVER (ORDER BY affiliate_count DESC) as position,
        'affiliates' as ranking_type,
        affiliate_count as score
    FROM (
        SELECT 
            inviter.id,
            inviter.username,
            COUNT(invited.id) as affiliate_count
        FROM users inviter
        LEFT JOIN users invited ON invited.invited_by = inviter.id
        WHERE inviter.status = 'active'
        GROUP BY inviter.id, inviter.username
        HAVING affiliate_count > 0
        ORDER BY affiliate_count DESC
        LIMIT 5
    ) u;
END //
DELIMITER ;

-- Executar a procedure para popular o ranking inicial
CALL UpdateAffiliateRanking();

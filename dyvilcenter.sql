SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password TEXT NOT NULL,
  credits INT DEFAULT 0,
  role ENUM('user','admin','moderator') DEFAULT 'user',
  status ENUM('active','inactive','banned') DEFAULT 'active',
  plan ENUM('free','pro','vip') DEFAULT 'free',
  affiliate_code VARCHAR(50) UNIQUE,
  invited_by CHAR(36),
  total_credits_earned INT DEFAULT 0,
  total_credits_added INT DEFAULT 0,
  is_revendedor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  telegram_id TEXT,
  telegram_username TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (invited_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- CRIAÇÃO COMPLETA (ajuste tipos/constraints conforme seu ambiente)
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(64) NOT NULL,
  `username` varchar(64) NOT NULL UNIQUE,
  `email` varchar(128) DEFAULT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `credits` int DEFAULT 0,
  `role` varchar(32) DEFAULT 'user',
  `status` varchar(32) DEFAULT 'active',
  `plan` varchar(32) DEFAULT 'free',
  `affiliate_code` varchar(16) DEFAULT NULL UNIQUE,
  `telegram_id` varchar(64) DEFAULT NULL UNIQUE,
  `telegram_username` varchar(64) DEFAULT NULL UNIQUE,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ALTER para bases já existentes (executar apenas se sua tabela users já existe SEM a coluna):
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `ip` varchar(45) DEFAULT NULL;

DROP TABLE IF EXISTS revendedores;
CREATE TABLE revendedores (
  id CHAR(36) NOT NULL,
  nick TEXT NOT NULL,
  telefone TEXT,
  telegram_id TEXT,
  telegram_user TEXT,
  nivel TEXT NOT NULL,
  comissao DECIMAL(20,2) NOT NULL,
  vendas_totais INT DEFAULT 0,
  vendas_mes INT DEFAULT 0,
  comissao_total DECIMAL(20,2) DEFAULT 0,
  comissao_mes DECIMAL(20,2) DEFAULT 0,
  clientes_ativos INT DEFAULT 0,
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ativo',
  produtos JSON,
  user_id CHAR(36) UNIQUE,
  affiliate_code TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS clientes;
CREATE TABLE clientes (
  id CHAR(36) NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  telegram_username TEXT,
  telegram_id TEXT,
  data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_compras INT DEFAULT 0,
  valor_total DECIMAL(20,2) DEFAULT 0,
  ultima_compra TIMESTAMP NULL,
  status VARCHAR(20) DEFAULT 'ativo',
  produtos_comprados JSON,
  revendedor_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (revendedor_id) REFERENCES revendedores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS produtos;
CREATE TABLE produtos (
  id CHAR(36) NOT NULL,
  nome TEXT NOT NULL,
  preco DECIMAL(20,2) NOT NULL,
  comissao DECIMAL(20,2) NOT NULL,
  categoria TEXT,
  status VARCHAR(20) DEFAULT 'ativo',
  planos JSON,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  username VARCHAR(255) NOT NULL,
  credits INT NOT NULL,
  price DECIMAL(20,2) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  telegram_username TEXT,
  telegram_id TEXT,
  source ENUM('register','recharge'),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS announcements;
CREATE TABLE announcements (
  id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  admin_id CHAR(36),
  priority ENUM('low','medium','high') DEFAULT 'medium',
  status ENUM('active','expired','archived') DEFAULT 'active',
  views INT DEFAULT 0,
  category ENUM('news','update','maintenance','promotion','alert','other') DEFAULT 'news',
  pinned BOOLEAN DEFAULT FALSE,
  target_user_type ENUM('all','free','pro','vip') DEFAULT 'all',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS announcement_reads;
CREATE TABLE announcement_reads (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  announcement_id CHAR(36) NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS backpack_items;
CREATE TABLE backpack_items (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  service TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS chat_messages;
CREATE TABLE chat_messages (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  username TEXT,
  user_type TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  message TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS coupons;
CREATE TABLE coupons (
  id CHAR(36) NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  credits INT NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by CHAR(36),
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  created_by CHAR(36),
  PRIMARY KEY (id),
  FOREIGN KEY (used_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS credit_history;
CREATE TABLE credit_history (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  amount INT NOT NULL,
  source VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS feedbacks;
CREATE TABLE feedbacks (
  id CHAR(36) NOT NULL,
  user_id CHAR(36),
  username TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS info;
CREATE TABLE info (
  id INT NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  username VARCHAR(255) NOT NULL,
  device_info TEXT,
  browser_info TEXT,
  ip_address VARCHAR(45),
  login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_type TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS invites;
CREATE TABLE invites (
  id CHAR(36) NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  created_by CHAR(36),
  used_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  max_uses INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  credits_bonus INT DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS login_history;
CREATE TABLE login_history (
  id CHAR(36) NOT NULL,
  user_id CHAR(36),
  ip_address TEXT,
  user_agent TEXT,
  device_info JSON,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type ENUM('system','admin_message','alert','info') DEFAULT 'info',
  `read` BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS password_reset_tokens;
CREATE TABLE password_reset_tokens (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_used BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS pending_affiliate_credits;
CREATE TABLE pending_affiliate_credits (
  id CHAR(36) NOT NULL,
  affiliate_id CHAR(36) NOT NULL,
  invited_user_id CHAR(36) NOT NULL,
  payment_id CHAR(36),
  amount INT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (affiliate_id) REFERENCES users(id),
  FOREIGN KEY (invited_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS service_bins;
CREATE TABLE service_bins (
  id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  bin VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (service_id) REFERENCES services(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS services;
CREATE TABLE services (
  id CHAR(36) NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS service_usage;
CREATE TABLE service_usage (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  usage_count INT DEFAULT 0,
  last_used TIMESTAMP NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS temp_sessions;
CREATE TABLE temp_sessions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  session_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS tickets;
CREATE TABLE tickets (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  status ENUM('open','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS ticket_messages;
CREATE TABLE ticket_messages (
  id CHAR(36) NOT NULL,
  ticket_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  sender_role ENUM('user','admin') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS vendas;
CREATE TABLE vendas (
  id CHAR(36) NOT NULL,
  produto_id CHAR(36) NOT NULL,
  cliente_id CHAR(36) NOT NULL,
  revendedor_id CHAR(36),
  quantidade INT DEFAULT 1,
  valor_total DECIMAL(20,2),
  status ENUM('pending','completed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (revendedor_id) REFERENCES revendedores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_token (session_token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS login_attempts;
CREATE TABLE login_attempts (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  ip_address VARCHAR(45) NOT NULL,
  username VARCHAR(255),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ip_time (ip_address, attempt_time),
  INDEX idx_username_time (username, attempt_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;

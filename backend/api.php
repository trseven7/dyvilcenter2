<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');
header('Content-Type: application/json');

require_once __DIR__ . '/../db-connect.php';
$conn = connectDB();
if (!$conn) {
    echo json_encode(['success' => false, 'error' => 'Falha na conexão com o banco de dados']);
    exit;
}

// Helpers
function uuidv4() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
function gen_affiliate_code($len = 4) {
    $code = '';
    for ($i=0; $i < $len; $i++) {
        $code .= random_int(0, 9);
    }
    return $code;
}
function unique_affiliate_code($conn, $tries = 50) {
    for ($i=0; $i<$tries; $i++) {
        $code = gen_affiliate_code();
        $stmt = $conn->prepare("SELECT id FROM users WHERE affiliate_code = ? LIMIT 1");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows === 0) {
            $stmt->close();
            return $code;
        }
        $stmt->close();
    }
    // Se ainda não encontrou após 50 tentativas, tentar mais 50 vezes com sleep
    for ($j=0; $j<50; $j++) {
        $code = gen_affiliate_code();
        $stmt = $conn->prepare("SELECT id FROM users WHERE affiliate_code = ? LIMIT 1");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows === 0) {
            $stmt->close();
            return $code;
        }
        $stmt->close();
        usleep(10000); // 10ms sleep para evitar loop muito apertado
    }
    
    // Se ainda não conseguiu após 100 tentativas total, retornar erro
    throw new Exception("Não foi possível gerar um código de afiliado único após múltiplas tentativas. Espaço de códigos pode estar saturado.");
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getUsers':
        $sql = "SELECT id, username, email, role, status, credits, plan, created_at, last_login, telegram_id, telegram_username, affiliate_code, ip
                FROM users ORDER BY created_at DESC";
        $res = $conn->query($sql);
        if (!$res) {
            echo json_encode([]);
            break;
        }
        $out = [];
        while ($row = $res->fetch_assoc()) {
            // Opcional: IP não está no schema; enviar null para UI mostrar N/A
            $out[] = $row;
        }
        echo json_encode($out);
        break;

    case 'createUser':
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $username = trim($data['username'] ?? '');
        $email    = trim($data['email'] ?? '');
        $password = (string)($data['password'] ?? '');
        $role     = $data['role'] ?? 'user';
        $credits  = (int)($data['credits'] ?? 0);
        $plan     = $data['plan'] ?? 'free';
        $status   = $data['status'] ?? 'active';
        $telegram_id = trim($data['telegram_id'] ?? '');
        $telegram_username = trim($data['telegram_username'] ?? '');

        if ($username === '' || $password === '') {
            echo json_encode(['success' => false, 'error' => 'Nome de usuário e senha são obrigatórios']);
            break;
        }

        // Uniqueness validations
        // username
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
        $stmt->bind_param("s", $username);
        $stmt->execute(); $stmt->store_result();
        if ($stmt->num_rows > 0) { $stmt->close(); echo json_encode(['success'=>false,'error'=>'Username já em uso']); break; }
        $stmt->close();

        // email (se informado)
        if ($email !== '') {
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $stmt->bind_param("s", $email);
            $stmt->execute(); $stmt->store_result();
            if ($stmt->num_rows > 0) { $stmt->close(); echo json_encode(['success'=>false,'error'=>'Email já em uso']); break; }
            $stmt->close();
        }

        // telegram_id (se informado)
        if ($telegram_id !== '') {
            $stmt = $conn->prepare("SELECT id FROM users WHERE telegram_id = ? LIMIT 1");
            $stmt->bind_param("s", $telegram_id);
            $stmt->execute(); $stmt->store_result();
            if ($stmt->num_rows > 0) { $stmt->close(); echo json_encode(['success'=>false,'error'=>'Telegram ID já em uso']); break; }
            $stmt->close();
        }
        // telegram_username (se informado)
        if ($telegram_username !== '') {
            $stmt = $conn->prepare("SELECT id FROM users WHERE telegram_username = ? LIMIT 1");
            $stmt->bind_param("s", $telegram_username);
            $stmt->execute(); $stmt->store_result();
            if ($stmt->num_rows > 0) { $stmt->close(); echo json_encode(['success'=>false,'error'=>'Telegram Username já em uso']); break; }
            $stmt->close();
        }

        // Hash de senha (bcrypt)
        $password_hash = password_hash($password, PASSWORD_BCRYPT);

        // Captura IP do usuário
        $ip = null;
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($parts[0]);
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        }

        // Gera ID e affiliate_code únicos
        $id = uuidv4();
        
        try {
            $affiliate_code = unique_affiliate_code($conn);
        } catch (Exception $e) {
            echo json_encode(['success'=>false, 'error'=>'Não foi possível gerar um código de afiliado único. Tente novamente ou contate o administrador.']);
            break;
        }

        $stmt = $conn->prepare("INSERT INTO users (id, username, email, password, credits, role, status, plan, affiliate_code, telegram_id, telegram_username, ip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->bind_param("ssssisssssss", $id, $username, $email, $password_hash, $credits, $role, $status, $plan, $affiliate_code, $telegram_id, $telegram_username, $ip);
        $ok = $stmt->execute();
        $err = $stmt->error;
        $stmt->close();

        if ($ok) {
            echo json_encode(['success'=>true, 'message'=>'Usuário criado com sucesso!', 'id'=>$id, 'affiliate_code'=>$affiliate_code]);
        } else {
            echo json_encode(['success'=>false, 'error'=>'Erro ao criar usuário: '.$err]);
        }
        break;

    case 'updateUser':
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $id = $data['id'] ?? '';
        if ($id === '') { echo json_encode(['success'=>false,'message'=>'ID do usuário não fornecido']); break; }

        // Campos editáveis
        $username = trim($data['username'] ?? '');
        $email    = trim($data['email'] ?? '');
        $role     = $data['role'] ?? null;
        $credits  = isset($data['credits']) ? (int)$data['credits'] : null;
        $status   = $data['status'] ?? null;
        $plan     = $data['plan'] ?? null;
        $telegram_id = trim($data['telegram_id'] ?? '');
        $telegram_username = trim($data['telegram_username'] ?? '');
        $password = $data['password'] ?? '';

        // Buscar atual para verificar duplicidades condicionais
        $cur = $conn->prepare("SELECT username, email, telegram_id, telegram_username FROM users WHERE id = ? LIMIT 1");
        $cur->bind_param("s", $id);
        $cur->execute();
        $current = $cur->get_result()->fetch_assoc();
        $cur->close();
        if (!$current) { echo json_encode(['success'=>false,'message'=>'Usuário não encontrado']); break; }

        // Uniqueness checks if changed
        if ($username !== '' && $username !== $current['username']) {
            $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1");
            $stmt->bind_param("ss", $username, $id);
            $stmt->execute(); $stmt->store_result();
            if ($stmt->num_rows > 0) { $stmt->close(); echo json_encode(['success'=>false,'message'=>'Username já em uso']); break; }
            $stmt->close();
        }
        if ($email !== '' && $email !== $current['email']) {
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1");
            $stmt->bind_param("ss", $email, $id);
            $stmt->execute(); $stmt->store_result();
            if ($stmt->num_rows > 0) { $stmt->close(); echo json_encode(['success'=>false,'message'=>'Email já em uso']); break; }
            $stmt->close();
        }
        if ($telegram_id !== '' && $telegram_id !== (string)$current['telegram_id']) {
            $stmt = $conn->prepare("SELECT id FROM users WHERE telegram_id = ? AND id <> ? LIMIT 1");
            $stmt->bind_param("ss", $telegram_id, $id);
            $stmt->execute(); $stmt->store_result();
            if ($stmt->num_rows > 0) { $stmt->close(); echo json_encode(['success'=>false,'message'=>'Telegram ID já em uso']); break; }
            $stmt->close();
        }
        if ($telegram_username !== '' && $telegram_username !== (string)$current['telegram_username']) {
            $stmt = $conn->prepare("SELECT id FROM users WHERE telegram_username = ? AND id <> ? LIMIT 1");
            $stmt->bind_param("ss", $telegram_username, $id);
            $stmt->execute(); $stmt->store_result();
            if ($stmt->num_rows > 0) { $stmt->close(); echo json_encode(['success'=>false,'message'=>'Telegram Username já em uso']); break; }
            $stmt->close();
        }

        // Montar update dinâmico
        $fields = [];
        $params = [];
        $types  = '';

        if ($username !== '') { $fields[] = "username=?"; $params[]=$username; $types.='s'; }
        if ($email !== '')    { $fields[] = "email=?";    $params[]=$email;    $types.='s'; }
        if ($role !== null)   { $fields[] = "role=?";     $params[]=$role;     $types.='s'; }
        if ($credits !== null){ $fields[] = "credits=?";  $params[]=$credits;  $types.='i'; }
        if ($status !== null) { $fields[] = "status=?";   $params[]=$status;   $types.='s'; }
        if ($plan !== null)   { $fields[] = "plan=?";     $params[]=$plan;     $types.='s'; }
        $fields[] = "telegram_id=?";         $params[]=$telegram_id;         $types.='s';
        $fields[] = "telegram_username=?";   $params[]=$telegram_username;   $types.='s';

        if ($password !== '') {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $fields[] = "password=?"; $params[]=$hash; $types.='s';
        }

        if (empty($fields)) { echo json_encode(['success'=>true, 'message'=>'Nada para atualizar']); break; }

        $sql = "UPDATE users SET ".implode(",", $fields)." WHERE id=?";
        $types .= 's'; $params[] = $id;
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $ok = $stmt->execute();
        $err = $stmt->error;
        $stmt->close();

        echo json_encode($ok ? ['success'=>true] : ['success'=>false,'message'=>'Erro ao atualizar: '.$err]);
        break;

    case 'deleteUser':
        $id = $_POST['id'] ?? '';
        if ($id === '') { echo json_encode(['success'=>false,'message'=>'ID não fornecido']); break; }
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param("s", $id);
        $ok = $stmt->execute();
        $err = $stmt->error;
        $stmt->close();
        echo json_encode($ok ? ['success'=>true] : ['success'=>false,'message'=>'Erro ao excluir: '.$err]);
        break;

    // ===== FUNCIONALIDADES DE AUTENTICAÇÃO =====
    
    case 'login':
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $username = trim($data['username'] ?? '');
            $password = $data['password'] ?? '';
            $csrf_token = $data['csrf_token'] ?? '';
            $remember_me = (bool)($data['remember_me'] ?? false);
            
            if (empty($username) || empty($password)) {
                echo json_encode(['success' => false, 'message' => 'Username e senha são obrigatórios']);
                break;
            }
            
            // Validação básica do CSRF token (verificar se foi fornecido)
            if (empty($csrf_token) || strlen($csrf_token) < 32) {
                echo json_encode(['success' => false, 'message' => 'Token de segurança inválido']);
                break;
            }
            
            // Obter IP do usuário para rate limiting
            $ip = null;
            if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
                $ip = trim($parts[0]);
            } else {
                $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            }
            
            // Verificar rate limiting (máximo 5 tentativas FALHADAS por IP em 15 minutos)
            $rateLimitStmt = $conn->prepare("SELECT COUNT(*) as attempts FROM login_attempts WHERE ip_address = ? AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND success = 0");
            $rateLimitStmt->bind_param("s", $ip);
            $rateLimitStmt->execute();
            $rateLimitResult = $rateLimitStmt->get_result();
            $attempts = $rateLimitResult->fetch_assoc()['attempts'];
            $rateLimitStmt->close();
            
            if ($attempts >= 5) {
                echo json_encode(['success' => false, 'message' => 'Você tentou muitas vezes. Tente novamente em 15 minutos.', 'rate_limited' => true]);
                break;
            }
            
            // Buscar usuário pelo username
            $sql = "SELECT id, username, password, role, status FROM users WHERE username = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                // Registrar tentativa de login falhada
                $logAttempt = $conn->prepare("INSERT INTO login_attempts (ip_address, username, success, attempt_time) VALUES (?, ?, 0, NOW())");
                $logAttempt->bind_param("ss", $ip, $username);
                $logAttempt->execute();
                $logAttempt->close();
                
                echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
                $stmt->close();
                break;
            }
            
            $user = $result->fetch_assoc();
            $stmt->close();
            
            // Verificar se o usuário está ativo
            if ($user['status'] !== 'active') {
                // Registrar tentativa de login falhada
                $logAttempt = $conn->prepare("INSERT INTO login_attempts (ip_address, username, success, attempt_time) VALUES (?, ?, 0, NOW())");
                $logAttempt->bind_param("ss", $ip, $username);
                $logAttempt->execute();
                $logAttempt->close();
                
                echo json_encode(['success' => false, 'message' => 'Usuário inativo']);
                break;
            }
            
            // Verificar senha
            if (!password_verify($password, $user['password'])) {
                // Registrar tentativa de login falhada
                $logAttempt = $conn->prepare("INSERT INTO login_attempts (ip_address, username, success, attempt_time) VALUES (?, ?, 0, NOW())");
                $logAttempt->bind_param("ss", $ip, $username);
                $logAttempt->execute();
                $logAttempt->close();
                
                echo json_encode(['success' => false, 'message' => 'Senha incorreta']);
                break;
            }
            
            // Verificar se é admin
            if ($user['role'] !== 'admin') {
                // Registrar tentativa de login falhada
                $logAttempt = $conn->prepare("INSERT INTO login_attempts (ip_address, username, success, attempt_time) VALUES (?, ?, 0, NOW())");
                $logAttempt->bind_param("ss", $ip, $username);
                $logAttempt->execute();
                $logAttempt->close();
                
                echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas administradores']);
                break;
            }
            
            // Gerar token de sessão
            $session_token = bin2hex(random_bytes(32));
            // Duração baseada em "Lembrar de mim": 30 dias se marcado, 7 dias se não
            $session_duration = $remember_me ? (30 * 24 * 60 * 60) : (7 * 24 * 60 * 60);
            $expires_at = date('Y-m-d H:i:s', time() + $session_duration);
            
            // Salvar sessão no banco de dados
            $insertSession = $conn->prepare("INSERT INTO user_sessions (user_id, session_token, expires_at, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE session_token = VALUES(session_token), expires_at = VALUES(expires_at), created_at = NOW()");
            $insertSession->bind_param("sss", $user['id'], $session_token, $expires_at);
            $insertSession->execute();
            $insertSession->close();
            
            // Atualizar último login
            $updateLogin = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $updateLogin->bind_param("s", $user['id']);
            $updateLogin->execute();
            $updateLogin->close();
            
            // Registrar tentativa de login bem-sucedida
            $logAttempt = $conn->prepare("INSERT INTO login_attempts (ip_address, username, success, attempt_time) VALUES (?, ?, 1, NOW())");
            $logAttempt->bind_param("ss", $ip, $username);
            $logAttempt->execute();
            $logAttempt->close();
            
            // Login bem-sucedido
            echo json_encode([
                'success' => true, 
                'message' => 'Login realizado com sucesso',
                'session_token' => $session_token,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role']
                ]
            ]);
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;

    case 'validateSession':
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $session_token = trim($data['session_token'] ?? '');
            
            if (empty($session_token)) {
                echo json_encode(['success' => false, 'message' => 'Token de sessão não fornecido']);
                break;
            }
            
            // Buscar sessão válida
            $sql = "SELECT us.user_id, us.expires_at, u.username, u.role, u.status 
                    FROM user_sessions us 
                    JOIN users u ON us.user_id = u.id 
                    WHERE us.session_token = ? AND us.expires_at > NOW() AND u.status = 'active'";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $session_token);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                echo json_encode(['success' => false, 'message' => 'Sessão inválida ou expirada']);
                $stmt->close();
                break;
            }
            
            $session = $result->fetch_assoc();
            $stmt->close();
            
            // Verificar se é admin
            if ($session['role'] !== 'admin') {
                echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas administradores']);
                break;
            }
            
            // Sessão válida
            echo json_encode([
                'success' => true,
                'message' => 'Sessão válida',
                'user' => [
                    'id' => $session['user_id'],
                    'username' => $session['username'],
                    'role' => $session['role']
                ]
            ]);
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;


    // ===== FUNCIONALIDADES DE AVISOS =====
    
    case 'getAnnouncements':
        try {
            // Buscar todos os avisos ativos
            $sql = "SELECT a.*, u.username as admin_username 
                    FROM announcements a 
                    LEFT JOIN users u ON a.admin_id = u.id 
                    WHERE a.status = 'active' 
                    ORDER BY a.pinned DESC, a.created_at DESC";
            
            $res = $conn->query($sql);
            if (!$res) {
                echo json_encode(['success' => false, 'message' => 'Erro ao buscar avisos']);
                break;
            }
            
            $announcements = [];
            while ($row = $res->fetch_assoc()) {
                // Verificar se o aviso expirou
                if ($row['expires_at'] && strtotime($row['expires_at']) <= time()) {
                    // Marcar como expirado
                    $updateStmt = $conn->prepare("UPDATE announcements SET status = 'expired' WHERE id = ?");
                    $updateStmt->bind_param("s", $row['id']);
                    $updateStmt->execute();
                    $updateStmt->close();
                    continue; // Não incluir avisos expirados
                }
                
                $announcements[] = [
                    'id' => $row['id'],
                    'title' => $row['title'],
                    'message' => $row['message'],
                    'priority' => $row['priority'],
                    'category' => $row['category'],
                    'pinned' => (bool)$row['pinned'],
                    'views' => (int)$row['views'],
                    'target_user_type' => $row['target_user_type'],
                    'created_at' => $row['created_at'],
                    'expires_at' => $row['expires_at'],
                    'admin_username' => $row['admin_username']
                ];
            }
            
            echo json_encode(['success' => true, 'announcements' => $announcements]);
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;

    case 'createAnnouncement':
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $title = trim($data['title'] ?? '');
            $message = trim($data['message'] ?? '');
            $priority = $data['priority'] ?? 'low';
            $category = $data['category'] ?? 'news';
            $pinned = (bool)($data['pinned'] ?? false);
            $target_user_type = $data['target_user_type'] ?? 'all';
            $expires_at = $data['expires_at'] ?? null;
            
            if (empty($title) || empty($message)) {
                echo json_encode(['success' => false, 'message' => 'Título e mensagem são obrigatórios']);
                break;
            }
            
            // Validar prioridade
            if (!in_array($priority, ['low', 'medium', 'high'])) {
                $priority = 'low';
            }
            
            // Validar categoria
            if (!in_array($category, ['news', 'update', 'maintenance', 'promotion', 'alert', 'other'])) {
                $category = 'news';
            }
            
            // Validar tipo de usuário
            if (!in_array($target_user_type, ['all', 'free', 'pro', 'vip'])) {
                $target_user_type = 'all';
            }
            
            $id = uuidv4();
            
            // Validar token de sessão do usuário logado
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            
            if (strpos($authHeader, 'Bearer ') === 0) {
                $session_token = substr($authHeader, 7);
                
                // Validar session_token no banco de dados
                $sessionStmt = $conn->prepare("SELECT u.id FROM user_sessions us JOIN users u ON u.id = us.user_id WHERE us.session_token = ? AND us.expires_at > NOW() AND u.status = 'active' AND u.role = 'admin' LIMIT 1");
                $sessionStmt->bind_param("s", $session_token);
                $sessionStmt->execute();
                $sessionResult = $sessionStmt->get_result();
                
                if ($sessionResult->num_rows > 0) {
                    $user = $sessionResult->fetch_assoc();
                    $admin_id = $user['id'];
                } else {
                    echo json_encode(['success' => false, 'message' => 'Token de autenticação inválido ou expirado']);
                    $sessionStmt->close();
                    break;
                }
                
                $sessionStmt->close();
            } else {
                echo json_encode(['success' => false, 'message' => 'Token de autenticação não fornecido']);
                break;
            }
            
            $sql = "INSERT INTO announcements (id, title, message, admin_id, priority, category, pinned, target_user_type, expires_at, status, views) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssssssss", 
                $id, $title, $message, $admin_id, $priority, $category, $pinned, $target_user_type, $expires_at
            );
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Aviso criado com sucesso', 'id' => $id]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erro ao criar aviso: ' . $stmt->error]);
            }
            
            $stmt->close();
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;

    case 'incrementViews':
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $announcement_id = $data['announcement_id'] ?? '';
            
            if (empty($announcement_id)) {
                echo json_encode(['success' => false, 'message' => 'ID do aviso não fornecido']);
                break;
            }
            
            // Incrementar visualizações
            $sql = "UPDATE announcements SET views = views + 1 WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $announcement_id);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Visualizações incrementadas']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erro ao incrementar visualizações']);
            }
            
            $stmt->close();
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;

    case 'markAsRead':
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $user_id = $data['user_id'] ?? '';
            $announcement_id = $data['announcement_id'] ?? '';
            
            if (empty($user_id) || empty($announcement_id)) {
                echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
                break;
            }
            
            // Verificar se já existe registro de leitura
            $checkSql = "SELECT id FROM announcement_reads WHERE user_id = ? AND announcement_id = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("ss", $user_id, $announcement_id);
            $checkStmt->execute();
            $checkStmt->store_result();
            
            if ($checkStmt->num_rows === 0) {
                // Inserir novo registro de leitura
                $insertSql = "INSERT INTO announcement_reads (id, user_id, announcement_id, read_at) VALUES (?, ?, ?, NOW())";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("sss", uuidv4(), $user_id, $announcement_id);
                
                if ($insertStmt->execute()) {
                    echo json_encode(['success' => true, 'message' => 'Marcado como lido']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Erro ao marcar como lido']);
                }
                
                $insertStmt->close();
            } else {
                echo json_encode(['success' => true, 'message' => 'Já marcado como lido']);
            }
            
            $checkStmt->close();
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;

    case 'logout':
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $session_token = trim($data['session_token'] ?? '');
            
            if (empty($session_token)) {
                echo json_encode(['success' => false, 'message' => 'Token de sessão não fornecido']);
                break;
            }
            
            // Invalidar sessão específica
            $stmt = $conn->prepare("DELETE FROM user_sessions WHERE session_token = ?");
            $stmt->bind_param("s", $session_token);
            $stmt->execute();
            $affected = $stmt->affected_rows;
            $stmt->close();
            
            if ($affected > 0) {
                echo json_encode(['success' => true, 'message' => 'Logout realizado com sucesso']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Sessão não encontrada']);
            }
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;

    case 'logoutAll':
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $session_token = trim($data['session_token'] ?? '');
            
            if (empty($session_token)) {
                echo json_encode(['success' => false, 'message' => 'Token de sessão não fornecido']);
                break;
            }
            
            // Buscar user_id da sessão atual
            $userStmt = $conn->prepare("SELECT user_id FROM user_sessions WHERE session_token = ?");
            $userStmt->bind_param("s", $session_token);
            $userStmt->execute();
            $userResult = $userStmt->get_result();
            
            if ($userResult->num_rows === 0) {
                echo json_encode(['success' => false, 'message' => 'Sessão não encontrada']);
                $userStmt->close();
                break;
            }
            
            $user = $userResult->fetch_assoc();
            $user_id = $user['user_id'];
            $userStmt->close();
            
            // Invalidar todas as sessões do usuário
            $stmt = $conn->prepare("DELETE FROM user_sessions WHERE user_id = ?");
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $affected = $stmt->affected_rows;
            $stmt->close();
            
            echo json_encode(['success' => true, 'message' => "Logout realizado em $affected dispositivos"]);
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;

    case 'getCoupons':
        // Validar sessão de admin
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            echo json_encode(['success' => false, 'error' => 'Token de autorização necessário']);
            break;
        }
        
        $session_token = $matches[1];
        
        // Verificar se é admin
        $stmt = $conn->prepare("SELECT u.role FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.session_token = ? AND us.expires_at > NOW()");
        $stmt->bind_param("s", $session_token);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['success' => false, 'error' => 'Sessão inválida']);
            $stmt->close();
            break;
        }
        
        $user = $result->fetch_assoc();
        $stmt->close();
        
        if ($user['role'] !== 'admin') {
            echo json_encode(['success' => false, 'error' => 'Acesso negado']);
            break;
        }
        
        try {
            // Buscar todos os cupons com informações do usuário que usou
            $sql = "SELECT c.*, 
                           u_used.username as used_by_username,
                           u_created.username as created_by_username
                    FROM coupons c
                    LEFT JOIN users u_used ON c.used_by = u_used.id
                    LEFT JOIN users u_created ON c.created_by = u_created.id
                    ORDER BY c.created_at DESC";
            
            $result = $conn->query($sql);
            $coupons = [];
            
            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    // Determinar status do cupom
                    $now = new DateTime();
                    $expires_at = $row['expires_at'] ? new DateTime($row['expires_at']) : null;
                    
                    if ($row['is_used']) {
                        $status = 'used';
                    } elseif ($expires_at && $expires_at < $now) {
                        $status = 'expired';
                    } else {
                        $status = 'active';
                    }
                    
                    $row['status'] = $status;
                    $coupons[] = $row;
                }
            }
            
            // Calcular estatísticas
            $stats = [
                'total' => count($coupons),
                'active' => 0,
                'used' => 0,
                'expired' => 0,
                'total_credits' => 0
            ];
            
            foreach ($coupons as $coupon) {
                $stats['total_credits'] += $coupon['credits'];
                switch ($coupon['status']) {
                    case 'active':
                        $stats['active']++;
                        break;
                    case 'used':
                        $stats['used']++;
                        break;
                    case 'expired':
                        $stats['expired']++;
                        break;
                }
            }
            
            echo json_encode([
                'success' => true,
                'coupons' => $coupons,
                'stats' => $stats
            ]);
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Erro ao buscar cupons: ' . $e->getMessage()]);
        }
        break;

    case 'createCoupons':
        // Validar sessão de admin
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            echo json_encode(['success' => false, 'error' => 'Token de autorização necessário']);
            break;
        }
        
        $session_token = $matches[1];
        
        // Verificar se é admin e obter user_id
        $stmt = $conn->prepare("SELECT u.id, u.role FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.session_token = ? AND us.expires_at > NOW()");
        $stmt->bind_param("s", $session_token);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['success' => false, 'error' => 'Sessão inválida']);
            $stmt->close();
            break;
        }
        
        $user = $result->fetch_assoc();
        $stmt->close();
        
        if ($user['role'] !== 'admin') {
            echo json_encode(['success' => false, 'error' => 'Acesso negado']);
            break;
        }
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $credits = (int)($data['credits'] ?? 0);
        $quantity = (int)($data['quantity'] ?? 1);
        $validity_days = (int)($data['validity_days'] ?? 30);
        $created_by = $user['id']; // Usar ID do usuário da sessão
        
        if ($credits <= 0) {
            echo json_encode(['success' => false, 'error' => 'Quantidade de créditos deve ser maior que zero']);
            break;
        }
        
        if ($quantity <= 0 || $quantity > 100) {
            echo json_encode(['success' => false, 'error' => 'Quantidade deve ser entre 1 e 100']);
            break;
        }
        
        try {
            $conn->begin_transaction();
            
            $created_codes = [];
            $expires_at = date('Y-m-d H:i:s', strtotime("+{$validity_days} days"));
            
            for ($i = 0; $i < $quantity; $i++) {
                // Gerar código único
                do {
                    $code = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
                    $stmt = $conn->prepare("SELECT id FROM coupons WHERE code = ?");
                    $stmt->bind_param("s", $code);
                    $stmt->execute();
                    $stmt->store_result();
                    $exists = $stmt->num_rows > 0;
                    $stmt->close();
                } while ($exists);
                
                // Inserir cupom
                $id = uuidv4();
                $stmt = $conn->prepare("INSERT INTO coupons (id, code, credits, expires_at, created_by) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("ssiss", $id, $code, $credits, $expires_at, $created_by);
                
                if (!$stmt->execute()) {
                    throw new Exception("Erro ao criar cupom: " . $stmt->error);
                }
                $stmt->close();
                
                $created_codes[] = $code;
            }
            
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => "Criados {$quantity} cupons com sucesso",
                'codes' => $created_codes
            ]);
            
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['success' => false, 'error' => 'Erro ao criar cupons: ' . $e->getMessage()]);
        }
        break;

    case 'deleteCoupon':
        // Validar sessão de admin
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            echo json_encode(['success' => false, 'error' => 'Token de autorização necessário']);
            break;
        }
        
        $session_token = $matches[1];
        
        // Verificar se é admin
        $stmt = $conn->prepare("SELECT u.role FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.session_token = ? AND us.expires_at > NOW()");
        $stmt->bind_param("s", $session_token);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['success' => false, 'error' => 'Sessão inválida']);
            $stmt->close();
            break;
        }
        
        $user = $result->fetch_assoc();
        $stmt->close();
        
        if ($user['role'] !== 'admin') {
            echo json_encode(['success' => false, 'error' => 'Acesso negado']);
            break;
        }
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $coupon_id = $data['id'] ?? '';
        
        if (empty($coupon_id)) {
            echo json_encode(['success' => false, 'error' => 'ID do cupom não fornecido']);
            break;
        }
        
        try {
            // Verificar se o cupom existe e não foi usado
            $stmt = $conn->prepare("SELECT is_used FROM coupons WHERE id = ?");
            $stmt->bind_param("s", $coupon_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                echo json_encode(['success' => false, 'error' => 'Cupom não encontrado']);
                $stmt->close();
                break;
            }
            
            $coupon = $result->fetch_assoc();
            $stmt->close();
            
            if ($coupon['is_used']) {
                echo json_encode(['success' => false, 'error' => 'Não é possível deletar cupom já utilizado']);
                break;
            }
            
            // Deletar cupom
            $stmt = $conn->prepare("DELETE FROM coupons WHERE id = ?");
            $stmt->bind_param("s", $coupon_id);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Cupom deletado com sucesso']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Erro ao deletar cupom']);
            }
            $stmt->close();
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Erro ao deletar cupom: ' . $e->getMessage()]);
        }
        break;

    case 'useCoupon':
        // Validar sessão do usuário
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            echo json_encode(['success' => false, 'error' => 'Token de autorização necessário']);
            break;
        }
        
        $session_token = $matches[1];
        
        // Obter user_id da sessão
        $stmt = $conn->prepare("SELECT u.id FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.session_token = ? AND us.expires_at > NOW()");
        $stmt->bind_param("s", $session_token);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['success' => false, 'error' => 'Sessão inválida']);
            $stmt->close();
            break;
        }
        
        $user = $result->fetch_assoc();
        $user_id = $user['id'];
        $stmt->close();
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $code = trim($data['code'] ?? '');
        
        if (empty($code)) {
            echo json_encode(['success' => false, 'error' => 'Código do cupom é obrigatório']);
            break;
        }
        
        try {
            $conn->begin_transaction();
            
            // Buscar cupom com lock para evitar race conditions
            $stmt = $conn->prepare("SELECT * FROM coupons WHERE code = ? FOR UPDATE");
            $stmt->bind_param("s", $code);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                echo json_encode(['success' => false, 'error' => 'Cupom não encontrado']);
                $stmt->close();
                $conn->rollback();
                break;
            }
            
            $coupon = $result->fetch_assoc();
            $stmt->close();
            
            // Verificar se já foi usado
            if ($coupon['is_used']) {
                echo json_encode(['success' => false, 'error' => 'Cupom já foi utilizado']);
                $conn->rollback();
                break;
            }
            
            // Verificar se expirou
            if ($coupon['expires_at']) {
                $now = new DateTime();
                $expires_at = new DateTime($coupon['expires_at']);
                if ($expires_at < $now) {
                    echo json_encode(['success' => false, 'error' => 'Cupom expirado']);
                    $conn->rollback();
                    break;
                }
            }
            
            // Marcar cupom como usado
            $stmt = $conn->prepare("UPDATE coupons SET is_used = TRUE, used_by = ?, used_at = NOW() WHERE id = ?");
            $stmt->bind_param("ss", $user_id, $coupon['id']);
            $stmt->execute();
            $stmt->close();
            
            // Adicionar créditos ao usuário
            $stmt = $conn->prepare("UPDATE users SET credits = credits + ? WHERE id = ?");
            $stmt->bind_param("is", $coupon['credits'], $user_id);
            $stmt->execute();
            $stmt->close();
            
            // Registrar no histórico de créditos
            $history_id = uuidv4();
            $source = "Cupom: " . $coupon['code'];
            $stmt = $conn->prepare("INSERT INTO credit_history (id, user_id, amount, source) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssis", $history_id, $user_id, $coupon['credits'], $source);
            $stmt->execute();
            $stmt->close();
            
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => "Cupom resgatado com sucesso! {$coupon['credits']} créditos adicionados.",
                'credits_added' => $coupon['credits']
            ]);
            
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['success' => false, 'error' => 'Erro ao usar cupom: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success'=>false, 'error'=>'Ação não suportada']);
}

$conn->close();
?>
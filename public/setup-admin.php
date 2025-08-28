<?php
// Script para criar usuário admin padrão
// Execute este arquivo uma vez no navegador

require_once __DIR__ . '/../db-connect.php';

$conn = connectDB();

if (!$conn) {
    die("Erro na conexão com banco");
}

// Verificar se já existe admin
$result = $conn->query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");

if ($result->num_rows > 0) {
    echo "✅ Usuário admin já existe!";
} else {
    // Criar admin padrão
    $admin_id = 'admin-1';
    $username = 'admin';
    $password = password_hash('admin123', PASSWORD_BCRYPT);
    
    $sql = "INSERT INTO users (id, username, password, role, status, plan, credits) VALUES (?, ?, ?, 'admin', 'active', 'vip', 999999)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $admin_id, $username, $password);
    
    if ($stmt->execute()) {
        echo "✅ Usuário admin criado!<br>";
        echo "Username: <strong>admin</strong><br>";
        echo "Senha: <strong>admin123</strong>";
    } else {
        echo "❌ Erro ao criar admin: " . $stmt->error;
    }
    
    $stmt->close();
}

$conn->close();
?>

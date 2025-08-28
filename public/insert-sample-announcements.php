<?php
/**
 * Script para inserir avisos de exemplo no banco de dados
 * Execute este arquivo uma vez para popular a tabela de avisos
 */

require_once __DIR__ . '/../db-connect.php';

$conn = connectDB();
if (!$conn) {
    die("Falha na conexão com o banco de dados");
}

// Função para gerar UUID
function uuidv4() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Avisos de exemplo
$announcements = [
    [
        'id' => uuidv4(),
        'title' => 'Bem-vindo ao Dyvil Center!',
        'message' => 'Estamos muito felizes em ter você conosco! O Dyvil Center é sua plataforma completa para gerenciamento e serviços.',
        'priority' => 'high',
        'category' => 'news',
        'pinned' => true,
        'target_user_type' => 'all',
        'expires_at' => null
    ],
    [
        'id' => uuidv4(),
        'title' => 'Manutenção Programada',
        'message' => 'Nosso sistema passará por uma manutenção programada na próxima terça-feira às 02:00. Esperamos que o serviço seja interrompido por aproximadamente 2 horas.',
        'priority' => 'medium',
        'category' => 'maintenance',
        'pinned' => false,
        'target_user_type' => 'all',
        'expires_at' => date('Y-m-d H:i:s', strtotime('+1 week'))
    ],
    [
        'id' => uuidv4(),
        'title' => 'Nova Funcionalidade: Sistema de Cupons',
        'message' => 'Implementamos um novo sistema de cupons! Agora você pode criar e gerenciar cupons de desconto para seus usuários.',
        'priority' => 'medium',
        'category' => 'update',
        'pinned' => false,
        'target_user_type' => 'all',
        'expires_at' => null
    ],
    [
        'id' => uuidv4(),
        'title' => 'Promoção Especial VIP',
        'message' => 'Usuários VIP têm 20% de desconto em todos os serviços este mês! Aproveite essa oportunidade única.',
        'priority' => 'low',
        'category' => 'promotion',
        'pinned' => false,
        'target_user_type' => 'vip',
        'expires_at' => date('Y-m-d H:i:s', strtotime('+1 month'))
    ],
    [
        'id' => uuidv4(),
        'title' => 'Atualização de Segurança',
        'message' => 'Implementamos melhorias importantes na segurança do sistema. Recomendamos que todos os usuários alterem suas senhas.',
        'priority' => 'high',
        'category' => 'alert',
        'pinned' => true,
        'target_user_type' => 'all',
        'expires_at' => date('Y-m-d H:i:s', strtotime('+2 weeks'))
    ],
    [
        'id' => uuidv4(),
        'title' => 'Novos Serviços Disponíveis',
        'message' => 'Adicionamos novos serviços à nossa plataforma. Verifique a seção de serviços para conhecer todas as opções disponíveis.',
        'priority' => 'low',
        'category' => 'news',
        'pinned' => false,
        'target_user_type' => 'all',
        'expires_at' => null
    ]
];

// Inserir avisos
$inserted = 0;
$errors = [];

foreach ($announcements as $announcement) {
    $sql = "INSERT INTO announcements (id, title, message, admin_id, priority, category, pinned, target_user_type, expires_at, status, views) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)";
    
    $stmt = $conn->prepare($sql);
    $admin_id = 'admin-system';
    
    $stmt->bind_param("sssssssss", 
        $announcement['id'],
        $announcement['title'],
        $announcement['message'],
        $admin_id,
        $announcement['priority'],
        $announcement['category'],
        $announcement['pinned'],
        $announcement['target_user_type'],
        $announcement['expires_at']
    );
    
    if ($stmt->execute()) {
        $inserted++;
        echo "✅ Aviso inserido: {$announcement['title']}\n";
    } else {
        $errors[] = "Erro ao inserir: {$announcement['title']} - " . $stmt->error;
        echo "❌ Erro ao inserir: {$announcement['title']}\n";
    }
    
    $stmt->close();
}

echo "\n=== RESUMO ===\n";
echo "Avisos inseridos com sucesso: $inserted\n";

if (!empty($errors)) {
    echo "Erros encontrados:\n";
    foreach ($errors as $error) {
        echo "- $error\n";
    }
}

$conn->close();
echo "\nScript concluído!\n";
?>

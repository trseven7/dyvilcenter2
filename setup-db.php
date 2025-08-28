<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$servername = "localhost";
$username = "root"; // Altere se o seu usuário do MySQL for diferente
$password = "";     // Altere se a sua senha do MySQL for diferente

// Tenta criar a conexão
try {
    // Conecta sem selecionar um banco de dados
    $conn = new mysqli($servername, $username, $password);

    // Verifica a conexão
    if ($conn->connect_error) {
        die("Conexão falhou: " . $conn->connect_error);
    }
    
    echo "Conexão com o MySQL estabelecida com sucesso!\n";
    
    // Cria o banco de dados se não existir
    $sql = "CREATE DATABASE IF NOT EXISTS dyvilcenter";
    if ($conn->query($sql) === TRUE) {
        echo "Banco de dados 'dyvilcenter' criado ou já existente.\n";
    } else {
        echo "Erro ao criar banco de dados: " . $conn->error . "\n";
        exit;
    }
    
    // Seleciona o banco de dados
    $conn->select_db("dyvilcenter");
    
    // Lê o arquivo SQL
    $sqlFile = file_get_contents(__DIR__ . '/dyvilcenter.sql');
    
    if ($sqlFile === false) {
        echo "Erro ao ler o arquivo SQL.\n";
        exit;
    }
    
    // Executa as queries do arquivo SQL
    if ($conn->multi_query($sqlFile)) {
        echo "Arquivo SQL importado com sucesso!\n";
        
        // Limpa os resultados para evitar erros
        do {
            if ($result = $conn->store_result()) {
                $result->free();
            }
        } while ($conn->more_results() && $conn->next_result());
        
        // Verifica se há tabelas
        $result = $conn->query("SHOW TABLES");
        if ($result->num_rows > 0) {
            echo "Tabelas criadas:\n";
            while($row = $result->fetch_array()) {
                echo "- " . $row[0] . "\n";
            }
        } else {
            echo "Nenhuma tabela foi criada.\n";
        }
    } else {
        echo "Erro ao importar o arquivo SQL: " . $conn->error . "\n";
    }
    
    // Cria um usuário admin padrão se não existir
    $checkAdmin = $conn->query("SELECT * FROM users WHERE username = 'admin'");
    if ($checkAdmin->num_rows == 0) {
        // Gerar um UUID v4
        $data_uuid = random_bytes(16);
        $data_uuid[6] = chr(ord($data_uuid[6]) & 0x0f | 0x40); // set version to 0100
        $data_uuid[8] = chr(ord($data_uuid[8]) & 0x3f | 0x80); // set bits 6-7 to 10
        $id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data_uuid), 4));
        
        $username = 'admin';
        $email = 'admin@example.com';
        $password = password_hash('admin123', PASSWORD_DEFAULT); // Senha padrão: admin123
        $role = 'admin';
        $credits = 100;
        
        $stmt = $conn->prepare("INSERT INTO users (id, username, email, password, role, credits) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssi", $id, $username, $email, $password, $role, $credits);
        
        if ($stmt->execute()) {
            echo "Usuário admin criado com sucesso! (username: admin, senha: admin123)\n";
        } else {
            echo "Erro ao criar usuário admin: " . $stmt->error . "\n";
        }
        $stmt->close();
    } else {
        echo "Usuário admin já existe.\n";
    }
    
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
} finally {
    if (isset($conn)) {
        $conn->close();
        echo "Conexão fechada.\n";
    }
}

echo "\nConfigurações concluídas!\n";
?>
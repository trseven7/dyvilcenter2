<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

$servername = "localhost";
$username = "root"; // Altere se o seu usuário do MySQL for diferente
$password = "";     // Altere se a sua senha do MySQL for diferente
$dbname = "dyvilcenter"; // Nome do seu banco de dados

// Tenta criar a conexão
try {
    $conn = new mysqli($servername, $username, $password, $dbname);

    // Verifica a conexão
    if ($conn->connect_error) {
        throw new Exception("Conexão falhou: " . $conn->connect_error);
    }
    
    // Tenta executar uma query simples
    $sql = "SHOW TABLES";
    $result = $conn->query($sql);
    
    if ($result === false) {
        throw new Exception("Erro na query: " . $conn->error);
    }
    
    $tables = [];
    if ($result->num_rows > 0) {
        while($row = $result->fetch_array()) {
            $tables[] = $row[0];
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Conexão com o banco de dados estabelecida com sucesso!',
        'tables' => $tables
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'mysql_info' => [
            'client_info' => mysqli_get_client_info(),
            'client_version' => mysqli_get_client_version(),
            'server_info' => $conn->server_info ?? 'Não disponível',
            'server_version' => $conn->server_version ?? 'Não disponível',
            'host_info' => $conn->host_info ?? 'Não disponível'
        ]
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
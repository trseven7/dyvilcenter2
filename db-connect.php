<?php
// Configurações de conexão com o banco de dados
$servername = "localhost";
$username = "root"; // Altere se o seu usuário do MySQL for diferente
$password = "";     // Altere se a sua senha do MySQL for diferente
$dbname = "dyvilcenter";

// Função para criar conexão com o banco de dados
function connectDB() {
    global $servername, $username, $password, $dbname;
    
    // Cria a conexão
    $conn = new mysqli($servername, $username, $password, $dbname);
    
    // Verifica a conexão
    if ($conn->connect_error) {
        // Registra o erro em um arquivo de log
        error_log("Falha na conexão com o banco de dados: " . $conn->connect_error);
        return false;
    }
    
    // Define o charset para UTF-8
    $conn->set_charset("utf8mb4");
    
    return $conn;
}
?>
-- Habilita extensão para restrições de agenda (EXCLUDE USING gist)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Tabela de Clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    document VARCHAR(20), -- CPF/CNPJ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Veículos
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    plate VARCHAR(10) UNIQUE NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    color VARCHAR(50),
    year INT,
    mileage INT, -- Quilometragem de entrada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Funcionários/Profissionais
CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    commission_rate DECIMAL(5,2) DEFAULT 30.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Serviços (Catálogo)
CREATE TABLE service_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50), -- Pintura, Vidros, Interior, Lavagem
    base_price DECIMAL(10,2) NOT NULL,
    estimated_time INT -- Tempo estimado em minutos
);

-- NOVO: Tabela Boxes
CREATE TABLE boxes (
    number INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- 5. Tabela de Agendamentos (Agenda Inteligente)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    professional_id UUID REFERENCES professionals(id),
    service_id UUID REFERENCES service_catalog(id),
    status VARCHAR(50) DEFAULT 'Aguardando', -- Aguardando, Em Execução, Finalizado, Cancelado
    box_number INT REFERENCES boxes(number), -- Box/Vaga
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    EXCLUDE USING gist (
        box_number WITH =, 
        tsrange(start_time, end_time) WITH &&
    )
);

-- 6. Tabela de Vistorias (Vistoria Digital PWA)
CREATE TABLE vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    type VARCHAR(50), -- Entrada, Saida
    checklist JSONB,
    images_urls JSONB,
    inspector_id UUID REFERENCES professionals(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela Financeira (Fluxo de Caixa)
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id),
    client_id UUID REFERENCES clients(id),
    transaction_type VARCHAR(20), -- RECEITA, DESPESA
    amount DECIMAL(10,2) NOT NULL,
    supply_cost DECIMAL(10,2) DEFAULT 0.00,
    commission_amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    paid_status BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabela de Usuários/Proprietários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL, -- usaremos como e-mail principal
    password_hash VARCHAR(255) NOT NULL,
    owner_name VARCHAR(150),
    company_name VARCHAR(150),
    whatsapp VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- DADOS MOCKADOS (TESTE INICIAL)
-- ==========================================

-- Boxes
INSERT INTO boxes (number, name) VALUES 
(1, 'Box Alpha'), 
(2, 'Box Bravo'), 
(3, 'Box Gamma');

-- Professionals
INSERT INTO professionals (name) VALUES 
('Brad Rocket'), 
('Jake Vance'),
('Kevin Lima');

-- Serviços
INSERT INTO service_catalog (name, category, base_price, estimated_time) VALUES
('Lavagem Detalhada', 'Lavagem', 150.00, 60),
('Vitrificação de Pintura', 'Pintura', 1200.00, 480),
('Higienização Interna', 'Interior', 350.00, 180),
('Polimento Comercial', 'Pintura', 450.00, 240),
('Restauro de Faróis', 'Vidros', 120.00, 60);

-- Clientes
INSERT INTO clients (name, phone, email) VALUES
('Bruce Wayne', '11999990001', 'bruce@wayneent.com'),
('Tony Stark', '11999990002', 'tony@stark.com'),
('James Bond', '11999990003', 'james@mi6.uk');

-- Veículos
INSERT INTO vehicles (client_id, plate, brand, model, color, year) VALUES
((SELECT id FROM clients WHERE name = 'Bruce Wayne' LIMIT 1), 'BATM4N', 'Porsche', '911 Carrera S', 'Preto', 2023),
((SELECT id FROM clients WHERE name = 'Tony Stark' LIMIT 1), 'IR0NM4N', 'Jeep', 'Compass AWD', 'Vermelho', 2022),
((SELECT id FROM clients WHERE name = 'James Bond' LIMIT 1), '007AST', 'BMW', '320i', 'Prata', 2024);

-- Vistoria Historico (para Feed Visual no frontend) Mock
-- Inseriremos via seed ou script posterior pq precisa de um appointment ID válido.
-- Como mock simples para o endpoint, podemos assumir que o controller trará um fake se necessário.

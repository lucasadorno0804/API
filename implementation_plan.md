# Implementação da Agenda Inteligente (Drag-and-Drop)

O objetivo é transformar o componente estático `ScheduleGrid` em uma interface dinâmica e reativa, conectada ao backend (`bsl-api`), que permita a visualização, cadastro flexível e remarcação fácil de serviços via arrastar e soltar (drag-and-drop).

## User Review Required
> [!IMPORTANT]
> - Precisamos adicionar a extensão `btree_gist` no banco de dados para a validação `EXCLUDE USING gist` funcionar corretamente.
> - As opções de interface Drag & Drop nativas do HTML5 serão usadas para manter o sistema limpo e leve, sem dependências volumosas.

## Proposed Changes

### Backend (`bsl-api`)

#### [MODIFY] `schema.sql`
- Adicionar `CREATE EXTENSION IF NOT EXISTS btree_gist;` no topo do arquivo para viabilizar as restrições exclusivas (`EXCLUDE USING gist`).
- Adicionar comandos `INSERT` de mock estruturados (Ex: Clientes: 'João', Veículos: 'Porsche 911', Serviços: 'Vitrificação de Vidros - 120min') para podermos povoar o modal na largada sem precisarmos desenvolver os painéis de cadastro destes.

#### [NEW] `controllers/scheduleController.js`
- `getSchedule`: Busca os agendamentos (`appointments`) junto com metadados (marca do carro, serviço).
- `getResources`: Busca as listas de serviços, veículos e clientes para montar os `selects` do Modal.
- `createAppointment`: Associa o box escolhido e calcula o `end_time` baseado no `estimated_time` do catálogo do serviço. Envolve tudo em `try/catch` para capturar a repulsa de banco (Postgres Constraint Error 23P01 - EXCLUDE) e validar pro frontend.
- `updateAppointment`: Para arrastar-e-soltar. Recebe um novo `start_time` e o novo `box_number`.

#### [NEW] `routes/schedule.js`
- Mapear os endpoints listados e atrelar no Express (`app.use('/api/schedule', scheduleRoutes)`).

---

### Frontend (`bsl-web`)

#### [MODIFY] `src/components/schedule/ScheduleGrid.jsx`
- Trocar o Array de `mockAppointments` estático por `useEffect` com `fetch` (consumindo o backend) ou chamadas unificadas via Custom Hooks.
- Mapear nativamente as funções `<div draggable onDragStart={...}>` para os cards de serviço.
- Preparar as colunas (Box) para absorver o item em um horário definido (`onDragOver` e `onDrop`).
- Configurar cálculo proporcional (CSS `style={{ gridColumn, gridColumnEnd }}`) para que serviços de 4 horas tomem duas ou quatro colunas da tela, de forma puramente matemática a partir do Timestamp.

#### [NEW] `src/components/schedule/AppointmentModal.jsx`
- Desenvolver seguindo o padrão 'Dark Premium'.
- O Modal abrirá quando um slot de tempo for clicado, preenchendo automaticamente Box + Horário inicial clicado.
- Select para Cliente/Visão Veículo.
- Select para Serviço. O componente vai injetar o `estimated_time` abaixo mostrando ao funcionário algo como: _"Término estimado: 14:00 (120 min)"_.
- Um tratador de erro (Toast/Banner) rubro caso o backend acuse overlapping (colisão de horário).

## Open Questions
> [!WARNING]
> 1. Para acelerar os testes do seu ambiente e não ficarmos presos desenvolvendo *CRUDs* genéricos agora, você aprova que eu injete dados *Mock/Falsos* de Clientes, Carros e Serviços nos inserts finais do `schema.sql`?
> 2. O grid atual corta de 2 em 2 horas (08:00, 10:00, 12:00, etc). Deseja que a unidade métrica da tela continue sendo subdividida a cada 2 horas ou quer encurtar as quebras puramente visuais para 1 hora?

## Verification Plan

### Automated Tests
- Simular tentativas via API HTTP de agendar o 'Box 1' às 10:00-12:00 duas vezes e verificar se ocorre o bloqueio natural garantindo a arquitetura livre de duplicidade.

### Manual Verification
- Iniciar o Docker do banco local caso você rode.
- Validar as opções do Select e cadastrar novo Agendamento clicando na própria UI Premium.
- Clicar, arrastar o card resultante para o 'Box 2' numa hora posterior e verificar se a API aceita, regrava o tempo e realinha a tela sem refreshes pesados.

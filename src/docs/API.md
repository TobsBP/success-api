# API Spec — Success

Backend em Fastify. Todos os endpoints (exceto `/auth/login`) exigem `Authorization: Bearer <token>`.

**Base URL:** `/api/v1`

---

## Tipos compartilhados

```typescript
interface Delta {
  value: number
  unit: "percent" | "pp" | "currency"
  direction: "up" | "down" | "neutral"
  comparisonLabel?: string  // e.g. "vs mês anterior"
}

interface ChartPoint {
  label: string   // e.g. "Mai/24", "Ano 8"
  value: number
}

interface ChartSeries {
  id: string
  label: string
  points: ChartPoint[]
}
```

### Nota sobre dinheiro

Armazene no banco como **centavos inteiros** (ex: `R$ 2.357,00` → `235700`). A API pode retornar em centavos e o frontend divide por 100, ou converter para float antes de responder — a escolha do contrato é sua.

### Nota sobre cores e classes de estilo

Campos como `color`, `indicatorClassName` e `iconClassName` são específicos do design system do frontend. **Não armazene no banco** — o frontend mapeia enums semânticos (`"primary"`, `"secondary"`, `"tertiary"`) para as classes Tailwind. Retorne apenas o enum semântico.

---

## Auth

### `POST /auth/login`
```json
// Body
{ "email": "string", "password": "string" }

// Response 200
{
  "user": { "id": "string", "name": "string", "email": "string", "avatarUrl": "string?" },
  "token": "string",
  "expiresAt": "ISO datetime"
}
```

### `POST /auth/logout`
Invalida o token no servidor. Response `204`.

### `GET /auth/me`
```json
// Response 200
{ "id": "string", "name": "string", "email": "string", "avatarUrl": "string?" }
```

---

## Net Worth (Sidebar)

Carregado em toda tela do dashboard.

### `GET /net-worth`
```json
// Response 200
{
  "amount": 10000000,
  "changePercent": 3.45,
  "changeLabel": "3,45% este mês",
  "sparkline": [96000, 97500, 99000, 100000],
  "updatedAt": "ISO datetime"
}
```

---

## Overview (Visão Geral)

### `GET /overview?month=YYYY-MM`
```json
// Response 200
{
  "metrics": {
    "totalIncome":    { "value": 866620, "delta": Delta },
    "totalExpenses":  { "value": 235700, "delta": Delta },
    "monthlyBalance": { "value": 630920, "delta": Delta },
    "savingsRate":    { "value": 72.8,   "delta": Delta }
  },
  "monthlyFlow": {
    "income":   ChartSeries,
    "expenses": ChartSeries,
    "balance":  ChartSeries
  },
  "expensesByCategory": {
    "total": 235700,
    "items": [{ "category": "string", "amount": 100000, "percent": 42.5 }]
  },
  "incomeBySource": {
    "total": 866620,
    "items": [{ "source": "string", "amount": 591400, "percent": 70 }]
  },
  "goals": [
    {
      "id": "string",
      "name": "string",
      "currentAmount": 4000000,
      "targetAmount": 5000000,
      "progressPercent": 80
    }
  ],
  "investment": {
    "name": "string",
    "indexLabel": "120% do CDI",
    "balance": 10000000,
    "monthChange": { "amount": 128000, "percent": 1.28 },
    "monthYield": 128000,
    "yearYield": 624500
  },
  "quickStats": {
    "averageDailySpend": 7603,
    "largestExpense": { "amount": 100000, "category": "string" },
    "daysRemaining": 6,
    "averageDailySurplus": 21031
  }
}
```

---

## Receitas (Income)

### `GET /income?month=YYYY-MM`
```json
// Response 200
{
  "summary": {
    "totalReceived": { "amount": 866620, "delta": Delta },
    "toReceive":     { "amount": 150000, "pendingCount": 2 },
    "topSource":     "PJ (Líquido)"
  },
  "entries": [
    {
      "id": "string",
      "date": "2024-05-05",
      "description": "string",
      "category": "string",
      "status": "received | pending",
      "amount": 591400
    }
  ],
  "history": [{ "label": "Dez", "value": 600000 }],
  "sources": [
    { "id": "string", "name": "string", "amount": 591400, "percent": 68 }
  ]
}
```

### `POST /income/entries`
```json
// Body
{
  "date": "2024-05-05",
  "description": "string",
  "category": "string",
  "status": "received | pending",
  "amount": 591400
}

// Response 201
{ "id": "string", ...entry }
```

### `PATCH /income/entries/:id`
Body: campos parciais do entry. Response: entry atualizado.

### `DELETE /income/entries/:id`
Response `204`.

---

## Despesas (Expenses)

### `GET /expenses?month=YYYY-MM`
```json
// Response 200
{
  "summary": {
    "totalSpent": { "amount": 235700, "delta": Delta },
    "monthlyLimit": {
      "limit": 400000,
      "spent": 235700,
      "remaining": 164300,
      "usedPercent": 58.9
    }
  },
  "byCategory": {
    "total": 235700,
    "items": [{ "category": "string", "amount": 100000, "percent": 40 }]
  },
  "recent": [
    {
      "id": "string",
      "description": "string",
      "category": "string",
      "date": "2024-05-10",
      "amount": 100000
    }
  ]
}
```

### `POST /expenses/entries`
```json
// Body
{ "date": "2024-05-10", "description": "string", "category": "string", "amount": 100000 }

// Response 201
{ "id": "string", ...entry }
```

### `PATCH /expenses/entries/:id`
Body: campos parciais. Response: entry atualizado.

### `DELETE /expenses/entries/:id`
Response `204`.

### `GET /expenses/limit`
```json
// Response 200
{ "limit": 400000 }
```

### `PUT /expenses/limit`
```json
// Body
{ "limit": 400000 }

// Response 200
{ "limit": 400000 }
```

---

## Investimentos

### `GET /investments?range=1M|6M|1A`
```json
// Response 200
{
  "summary": {
    "investedNetWorth": { "amount": 10000000, "delta": Delta },
    "monthlyYield":     { "amount": 128000,   "delta": Delta },
    "yearlyYield":      { "amount": 624500, "returnPercentYtd": 6.2 }
  },
  "allocation": {
    "total": 10000000,
    "items": [{ "assetClass": "Renda Fixa", "percent": 45 }]
  },
  "evolution": [{ "label": "Jan", "value": 6000000 }],
  "assets": [
    {
      "id": "string",
      "name": "string",
      "assetClass": "string",
      "subtitle": "string?",
      "currentBalance": 2500000,
      "weightPercent": 25,
      "monthlyYield": { "amount": 25000, "percent": 1.0 },
      "totalInvested": 2250000,
      "averagePrice": 28050
    }
  ]
}
```

`totalInvested` e `averagePrice` são opcionais (presentes conforme o tipo do ativo).

### `POST /investments/assets`
```json
// Body
{
  "name": "string",
  "assetClass": "string",
  "subtitle": "string?",
  "currentBalance": 2500000,
  "totalInvested": 2250000,
  "averagePrice": 28050
}

// Response 201
{ "id": "string", ...asset }
```

### `PATCH /investments/assets/:id`
Body: campos parciais. Response: asset atualizado.

### `DELETE /investments/assets/:id`
Response `204`.

---

## Metas (Goals)

### `GET /goals`
```json
// Response 200
{
  "summary": { "activeCount": 5, "completedCount": 2, "totalSaved": 6800000 },
  "goals": [
    {
      "id": "string",
      "name": "string",
      "description": "string?",
      "priority": "high | medium | low",
      "status": "active | completed",
      "currentAmount": 4000000,
      "targetAmount": 5000000,
      "progressPercent": 80,
      "remaining": 1000000,
      "forecastDate": "Ago/2026",
      "icon": "shield | plane | car",
      "color": "primary | secondary | tertiary"
    }
  ]
}
```

### `POST /goals`
```json
// Body
{
  "name": "string",
  "description": "string?",
  "priority": "high | medium | low",
  "targetAmount": 5000000,
  "currentAmount": 4000000,
  "icon": "shield | plane | car",
  "color": "primary | secondary | tertiary"
}

// Response 201
{ "id": "string", ...goal }
```

### `PATCH /goals/:id`
Body: campos parciais. Response: goal atualizado.

### `DELETE /goals/:id`
Response `204`.

---

## Relatórios

### `GET /reports`

Query params:
- `range`: `last-3-months | last-6-months | this-year | custom`
- `from`: `YYYY-MM-DD` (obrigatório se `range=custom`)
- `to`: `YYYY-MM-DD` (obrigatório se `range=custom`)
- `accounts`: lista separada por vírgula (vazio = todos)
- `categories`: lista separada por vírgula (vazio = todas)

```json
// Response 200
{
  "filters": {
    "range": "last-6-months",
    "accounts": [],
    "categories": []
  },
  "incomeVsExpense": {
    "income":   { "id": "income",   "label": "Receitas", "points": [ChartPoint] },
    "expenses": { "id": "expenses", "label": "Despesas", "points": [ChartPoint] }
  },
  "kpis": {
    "averageIncome":      { "amount": 745000, "delta": Delta },
    "averageExpense":     { "amount": 215000, "delta": Delta },
    "averageSavingsRate": { "percent": 71, "targetPercent": 50 }
  },
  "expensesByCategory": {
    "total": 235700,
    "items": [{ "category": "string", "amount": 100000, "percent": 42 }]
  },
  "monthlySummary": [
    { "period": "Maio/2024", "income": 866620, "expenses": 235700, "balance": 630920 }
  ]
}
```

---

## Projeções

Os pontos dos cenários são **calculados on-the-fly** no handler com a fórmula:

```
saldo_ano_n = saldo_ano_(n-1) * (1 + taxa_anual) + aporte_mensal * 12
```

Não é necessário persistir os pontos — apenas os parâmetros de entrada.

### `GET /projections?timeframe=5|10|20|30`
```json
// Response 200
{
  "summary": {
    "initialNetWorth": 10000000,
    "plannedMonthlyContribution": 250000,
    "estimatedAnnualRatePercent": 8.5,
    "projectionIn10Years": 44583300
  },
  "timeframe": 10,
  "scenarios": [
    {
      "id": "base",
      "name": "Cenário Base",
      "type": "base | conservative | aggressive",
      "points": [{ "label": "Hoje", "value": 10000000 }, { "label": "Ano 1", "value": 11085000 }]
    }
  ],
  "assumptions": {
    "inflationPercent": 4.5,
    "contributionGrowthPercent": 5.5,
    "returnsByClass": [
      { "assetClass": "Renda Fixa", "annualRatePercent": 10 }
    ]
  },
  "compositionAtHorizon": {
    "total": 44583300,
    "items": [{ "assetClass": "Renda Fixa", "amount": 24520815, "percent": 55 }]
  }
}
```

### `PUT /projections/assumptions`
```json
// Body
{
  "plannedMonthlyContribution": 250000,
  "estimatedAnnualRatePercent": 8.5,
  "inflationPercent": 4.5,
  "contributionGrowthPercent": 5.5,
  "returnsByClass": [
    { "assetClass": "Renda Fixa", "annualRatePercent": 10 }
  ]
}

// Response 200
{ ...assumptions atualizadas }
```

---

## Configurações (Settings)

### `GET /settings`
```json
// Response 200
{
  "profile": {
    "fullName": "string",
    "birthDate": "1990-05-15",
    "email": "string",
    "avatarUrl": "string?"
  },
  "security": {
    "twoFactor": { "enabled": true, "method": "string?" },
    "passwordLastChanged": "string"
  },
  "preferences": {
    "theme": "dark | light | system",
    "currency": "BRL | USD | EUR"
  },
  "notifications": {
    "weeklyDigest": true,
    "dueDateAlerts": true,
    "goalsAchieved": false
  },
  "appInfo": {
    "version": "2.4.1",
    "build": "492"
  }
}
```

### `PATCH /settings/profile`
```json
// Body (todos os campos opcionais)
{ "fullName": "string", "birthDate": "YYYY-MM-DD", "avatarUrl": "string" }
```

### `PATCH /settings/preferences`
```json
// Body (todos os campos opcionais)
{ "theme": "dark | light | system", "currency": "BRL | USD | EUR" }
```

### `PATCH /settings/notifications`
```json
// Body (todos os campos opcionais)
{ "weeklyDigest": true, "dueDateAlerts": true, "goalsAchieved": false }
```

### `PATCH /settings/security/two-factor`
```json
// Body
{ "enabled": true, "method": "string?" }
```

### `POST /settings/security/change-password`
```json
// Body
{ "currentPassword": "string", "newPassword": "string" }

// Response 200 (sucesso) | 400 (senha incorreta)
```

---

## Resumo dos endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Usuário autenticado |
| GET | `/net-worth` | Widget patrimônio líquido (sidebar) |
| GET | `/overview` | Dashboard visão geral |
| GET | `/income` | Dados de receitas do mês |
| POST | `/income/entries` | Criar lançamento de receita |
| PATCH | `/income/entries/:id` | Editar lançamento de receita |
| DELETE | `/income/entries/:id` | Excluir lançamento de receita |
| GET | `/expenses` | Dados de despesas do mês |
| POST | `/expenses/entries` | Criar lançamento de despesa |
| PATCH | `/expenses/entries/:id` | Editar lançamento de despesa |
| DELETE | `/expenses/entries/:id` | Excluir lançamento de despesa |
| GET | `/expenses/limit` | Limite mensal configurado |
| PUT | `/expenses/limit` | Atualizar limite mensal |
| GET | `/investments` | Dados de investimentos |
| POST | `/investments/assets` | Adicionar ativo |
| PATCH | `/investments/assets/:id` | Editar ativo |
| DELETE | `/investments/assets/:id` | Excluir ativo |
| GET | `/goals` | Lista de metas |
| POST | `/goals` | Criar meta |
| PATCH | `/goals/:id` | Editar meta |
| DELETE | `/goals/:id` | Excluir meta |
| GET | `/reports` | Relatórios com filtros |
| GET | `/projections` | Projeção patrimonial |
| PUT | `/projections/assumptions` | Atualizar premissas |
| GET | `/settings` | Todas as configurações |
| PATCH | `/settings/profile` | Atualizar perfil |
| PATCH | `/settings/preferences` | Atualizar preferências |
| PATCH | `/settings/notifications` | Atualizar notificações |
| PATCH | `/settings/security/two-factor` | Configurar 2FA |
| POST | `/settings/security/change-password` | Trocar senha |

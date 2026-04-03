# AGENTS.md — Мікросервісна веб-система моніторингу гіпокситерапії

## Контекст проекту

Дипломний проект: **мікросервісна веб-система для віддаленого моніторингу параметрів гіпокситерапії**.

Система збирає медичні показники пацієнтів (SpO2, ЧСС, ЧД) з апарата «Гіпотрон-М» кожні 5 секунд,
відображає їх у real-time, детектує критичні стани та сповіщає медперсонал.

---

## Структура монорепозиторію

```
hypoxy-monitoring/
├── AGENTS.md
├── docker-compose.yml
├── .env.example
├── services/
│   ├── api-gateway/        # NestJS — єдина точка входу
│   ├── device-service/     # NestJS — збір даних з обладнання
│   ├── patient-service/    # NestJS — управління пацієнтами
│   ├── analysis-service/   # NestJS — аналіз показників, детекція аномалій
│   ├── alert-service/      # NestJS — сповіщення медперсоналу
│   ├── session-service/    # NestJS — управління сеансами терапії
│   └── report-service/     # NestJS — генерація PDF/Excel звітів
├── frontend/               # React 18 + Ant Design + Recharts
└── docs/
    ├── architecture.md
    └── api/                # OpenAPI specs
```

---

## Технічний стек

| Шар | Технологія |
|-----|-----------|
| Backend | NestJS 10+, TypeScript 5+ |
| Frontend | React 18+, Ant Design, Recharts, Socket.io-client |
| БД | PostgreSQL 15+ |
| ORM | TypeORM з декораторами `@Entity`, автоміграції |
| Real-time | `@nestjs/websockets` + Socket.io |
| Кеш | Redis 7+ через `@nestjs/cache-manager` |
| Міжсервісна комунікація | HTTP REST + Redis Pub/Sub для critical alerts |
| Контейнеризація | Docker 24+ + Docker Compose 2.20+ |
| Логування | `nest-pino` у кожному сервісі |
| Тестування | Jest + Supertest (e2e), Swagger UI |

---

## Мікросервіси — детальна специфікація

### 1. API Gateway (`services/api-gateway`)

**Призначення:** єдина точка входу для всіх клієнтів.

**Функції:**
- Проксування запитів до відповідних сервісів через `http-proxy-middleware`
- JWT автентифікація через `@nestjs/jwt` + `AuthGuard`
- Rate limiting через `@nestjs/throttler` (100 req/min per IP)
- CORS налаштування
- Request logging через `nest-pino`
- Health check endpoint `GET /health`

**Маршрути проксування:**
```
/api/devices/*     → device-service:3001
/api/patients/*    → patient-service:3002
/api/analysis/*    → analysis-service:3003
/api/alerts/*      → alert-service:3004
/api/sessions/*    → session-service:3005
/api/reports/*     → report-service:3006
```

**Порт:** 3000

---

### 2. Device Service (`services/device-service`)

**Призначення:** збір даних з медичного обладнання.

**Entities (TypeORM):**
```typescript
@Entity('measurements')
class Measurement {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() patientId: string;
  @Column() sessionId: string;
  @Column('float') spo2: number;       // SpO2 %
  @Column('float') heartRate: number;  // ЧСС уд/хв
  @Column('float') respiratoryRate: number; // ЧД дих/хв
  @CreateDateColumn() createdAt: Date;
}
```

**API endpoints:**
```
POST /devices/measurements          # отримання даних з обладнання
GET  /devices/measurements/:sessionId # історія вимірювань сеансу
GET  /devices/latest/:patientId     # останні показники пацієнта
```

**WebSocket Gateway (`@nestjs/websockets`):**
- Event `measurement:new` — трансляція нового вимірювання
- Після збереження в PostgreSQL → публікує подію в Redis Pub/Sub (`channel: measurements`)

**Кешування:** останні показники кожного пацієнта в Redis з TTL 5 хвилин.

**Порт:** 3001

---

### 3. Patient Service (`services/patient-service`)

**Призначення:** CRUD управління даними пацієнтів.

**Entities:**
```typescript
@Entity('patients')
class Patient {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column() dateOfBirth: Date;
  @Column({ nullable: true }) diagnosis: string;
  @Column({ nullable: true }) notes: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**API endpoints:**
```
POST   /patients              # реєстрація пацієнта
GET    /patients              # список всіх пацієнтів
GET    /patients/:id          # картка пацієнта
PUT    /patients/:id          # оновлення даних
DELETE /patients/:id          # видалення (soft delete)
GET    /patients/:id/sessions # сеанси пацієнта
```

**Шифрування:** персональні дані (ПІБ, діагноз) шифрувати через TypeORM `@Column({ transformer })` з AES-256.

**Порт:** 3002

---

### 4. Analysis Service (`services/analysis-service`)

**Призначення:** real-time аналіз показників, детекція аномалій.

**Бізнес-логіка:**

Пороги норм:
```typescript
const THRESHOLDS = {
  spo2: { critical: 90, warning: 94 },         // SpO2 < 90% → критично
  heartRate: { min: 60, max: 100 },             // ЧСС поза діапазоном → попередження
  respiratoryRate: { min: 12, max: 20 },
};
```

Алгоритми:
- Перевірка поточного значення на пороги → генерація `AlertLevel` (CRITICAL / WARNING / NORMAL)
- Розрахунок **індексу гіпоксії** (середньозважений показник відхилень)
- Виявлення аномалій: ковзне середнє за останні 5 вимірювань + стандартне відхилення

**Підписка на Redis Pub/Sub:** канал `measurements` → при отриманні нового вимірювання запускає аналіз.

**При критичному значенні:** HTTP POST до Alert Service.

**API endpoints:**
```
GET /analysis/session/:sessionId/stats   # статистика сеансу
GET /analysis/patient/:patientId/trend   # тренд за період
POST /analysis/analyze                   # ручний аналіз набору даних
```

**Порт:** 3003

---

### 5. Alert Service (`services/alert-service`)

**Призначення:** сповіщення медперсоналу про критичні події.

**Entities:**
```typescript
@Entity('alerts')
class Alert {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() patientId: string;
  @Column() sessionId: string;
  @Column() measurementId: string;
  @Column('enum', { enum: AlertLevel }) level: AlertLevel; // CRITICAL | WARNING
  @Column() message: string;
  @Column('jsonb') values: Record<string, number>; // поточні значення
  @Column({ default: false }) acknowledged: boolean;
  @CreateDateColumn() createdAt: Date;
}
```

**API endpoints:**
```
POST /alerts                    # створення сповіщення (від Analysis Service)
GET  /alerts                    # список сповіщень з фільтрами
PUT  /alerts/:id/acknowledge    # підтвердження отримання
GET  /alerts/patient/:patientId # сповіщення пацієнта
```

**WebSocket:** після створення сповіщення емітує подію `alert:new` всім підключеним клієнтам.

**Порт:** 3004

---

### 6. Session Service (`services/session-service`)

**Призначення:** управління сеансами гіпокситерапії.

**Entities:**
```typescript
@Entity('sessions')
class Session {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() patientId: string;
  @Column({ nullable: true }) doctorId: string;
  @Column() startedAt: Date;
  @Column({ nullable: true }) endedAt: Date;
  @Column('enum', { enum: SessionStatus }) status: SessionStatus;
  @Column('jsonb', { nullable: true }) summary: SessionSummary;
}
```

**API endpoints:**
```
POST /sessions                  # старт нового сеансу
PUT  /sessions/:id/end          # завершення сеансу + розрахунок summary
GET  /sessions/:id              # деталі сеансу
GET  /sessions/patient/:id      # історія сеансів пацієнта
GET  /sessions/active           # всі активні сеанси
```

**При завершенні сеансу** — розрахунок: середні значення SpO2/ЧСС/ЧД, тривалість, кількість сповіщень.

**Порт:** 3005

---

### 7. Report Service (`services/report-service`)

**Призначення:** генерація медичних звітів.

**Залежності:** `pdfkit`, `exceljs`, `@nestjs/schedule`

**API endpoints:**
```
GET /reports/session/:id/pdf     # PDF-звіт одного сеансу
GET /reports/session/:id/excel   # Excel-звіт сеансу
GET /reports/patient/:id/summary # зведений звіт пацієнта за період
```

**PDF-звіт містить:**
- Дані пацієнта
- Час та тривалість сеансу
- Таблиця вимірювань
- Графік динаміки SpO2 і ЧСС (побудований через pdfkit)
- Список сповіщень під час сеансу
- Висновок лікаря (опціонально)

**Scheduled jobs (`@nestjs/schedule`):**
- `@Cron('0 8 * * *')` — щоденна генерація зведених звітів

**Порт:** 3006

---

## Frontend (`frontend/`)

**Стек:** React 18, Ant Design 5, Recharts, Socket.io-client, React Query, React Router 6

### Сторінки та компоненти

**`/dashboard`** — головна панель
- Список активних пацієнтів з поточними показниками (real-time через WebSocket)
- Сповіщення у верхньому правому куті (Badge з кількістю непрочитаних)
- Індикатори статусу: зелений (норма), жовтий (попередження), червоний (критично)

**`/patients`** — список пацієнтів
- Таблиця Ant Design з пагінацією та пошуком
- Кнопка "Додати пацієнта" → Modal з формою

**`/patients/:id`** — картка пацієнта
- Персональні дані
- Активний сеанс з real-time графіками (Recharts `LineChart`)
- Вкладка "Історія сеансів"

**`/sessions/:id`** — деталі сеансу
- Timeline вимірювань
- Графіки SpO2, ЧСС, ЧД з відміткою порогів
- Список сповіщень сеансу
- Кнопки: "Завершити сеанс", "Скачати PDF", "Скачати Excel"

### WebSocket підключення (Socket.io-client)
```typescript
// Підписки на події
socket.on('measurement:new', (data: Measurement) => { /* оновити графік */ });
socket.on('alert:new', (alert: Alert) => { /* показати нотифікацію */ });
```

---

## База даних — PostgreSQL схема

```sql
-- Основні таблиці
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- soft delete
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  summary JSONB
);

CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  session_id UUID REFERENCES sessions(id),
  spo2 FLOAT NOT NULL,
  heart_rate FLOAT NOT NULL,
  respiratory_rate FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  session_id UUID REFERENCES sessions(id),
  measurement_id UUID REFERENCES measurements(id),
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  values JSONB NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Індекси для продуктивності
CREATE INDEX idx_measurements_session ON measurements(session_id, created_at DESC);
CREATE INDEX idx_measurements_patient ON measurements(patient_id, created_at DESC);
CREATE INDEX idx_alerts_patient ON alerts(patient_id, created_at DESC);
CREATE INDEX idx_alerts_unack ON alerts(acknowledged) WHERE acknowledged = FALSE;
```

---

## Docker Compose

Файл `docker-compose.yml` повинен містити всі 7 NestJS-сервісів + React frontend + PostgreSQL + Redis.

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: hypoxy_db
      POSTGRES_USER: hypoxy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hypoxy"]

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  api-gateway:
    build: ./services/api-gateway
    ports: ["3000:3000"]
    environment:
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, redis]

  # ... аналогічно для кожного сервісу

  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on: [api-gateway]
```

Кожен NestJS-сервіс має свій `Dockerfile` з multi-stage build:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main"]
```

---

## Порядок розробки (рекомендований)

1. **Інфраструктура** — `docker-compose.yml`, PostgreSQL схема, `.env.example`
2. **Device Service** — прийом і збереження вимірювань (основа для всього)
3. **Patient Service** — CRUD пацієнтів
4. **Session Service** — управління сеансами
5. **Analysis Service** — логіка детекції з порогами
6. **Alert Service** — сповіщення + WebSocket
7. **API Gateway** — проксування + JWT
8. **Report Service** — PDF/Excel
9. **Frontend** — Dashboard + CartографіяPacієнта + real-time графіки
10. **Тестування** — unit тести Jest, e2e тести Supertest, навантажувальне тестування

---

## Конвенції коду

- Кожен сервіс — стандартна структура NestJS: `module / controller / service / dto / entity`
- DTO валідація через `class-validator` + `ValidationPipe`
- Swagger декоратори (`@ApiOperation`, `@ApiResponse`) на всіх endpoints
- Логування через `nest-pino` з `requestId` для трейсингу між сервісами
- Env-змінні через `@nestjs/config` з `ConfigService`
- Помилки — кастомні `HttpException` з зрозумілими повідомленнями

---

## Очікувані результати

- [ ] Всі 7 сервісів запускаються через `docker compose up`
- [ ] Swagger UI доступний на `http://localhost:3000/api/docs`
- [ ] WebSocket real-time оновлення на Dashboard
- [ ] Генерація PDF і Excel звіту для сеансу
- [ ] Jest coverage > 70% для бізнес-логіки Analysis Service
- [ ] `docs/architecture.md` з UML діаграмами компонентів і послідовностей

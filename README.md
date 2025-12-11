# GrantFlow Local

A fully local, offline-capable grant matching and pipeline management application. Uses SQLite for data storage and OpenAI for AI-powered features.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Your OpenAI API key (already configured in .env)

### Installation

1. **Install dependencies:**
```bash
npm run install:all
```

2. **Start the application:**
```bash
npm run dev
```

3. **Open in browser:**
- Frontend: http://localhost:5173
- API: http://localhost:3001

That's it! The database will be created automatically on first run.

---

## 📁 Project Structure

```
grantflow-local/
├── backend/               # Express.js API server
│   ├── db/               # SQLite database setup
│   ├── routes/           # API endpoints
│   └── server.js         # Main server file
├── frontend/             # React + Vite frontend
│   └── src/
│       ├── api/          # API client
│       ├── pages/        # Page components
│       └── App.jsx       # Main app with routing
├── data/                 # SQLite database & uploads
├── scripts/              # Base44 export helpers
├── .env                  # Environment variables
└── package.json          # Root package.json
```

---

## 🔄 Migrating from Base44

### Step 1: Export from Base44

Add the export page to your Base44 app:

1. Copy `scripts/DataExportPage.jsx` to your Base44 pages folder
2. Navigate to the page in your Base44 app
3. Click "Export All Data"
4. Save the downloaded JSON file

### Step 2: Import to Local App

1. Start your local GrantFlow app
2. Go to "Import Data" in the sidebar
3. Drag & drop your export file, or click to browse
4. Wait for import to complete

The import handles:
- Organizations
- Funding Opportunities  
- Pipeline Items
- Matches

---

## 🎯 Features

### Organizations
- Create and manage nonprofit profiles
- Track focus areas, populations served, location
- Budget and staff information

### Opportunities
- Add funding opportunities manually
- Search and filter opportunities
- Track deadlines and amounts

### Pipeline
- Kanban-style pipeline board
- Stages: Discovered → Interested → Researching → Preparing → Drafting → Submitted → Awarded
- Move items between stages

### Smart Matcher (AI)
- Select an organization
- AI analyzes all opportunities
- Returns scored matches with reasoning
- Add matches directly to pipeline

### Item Search (AI)
- Search for funding for specific items
- "12 passenger van", "playground equipment", etc.
- Returns federal, state, corporate, nonprofit programs

---

## 🛠️ API Endpoints

### Organizations
- `GET /api/organizations` - List all
- `GET /api/organizations/:id` - Get one
- `POST /api/organizations` - Create
- `PUT /api/organizations/:id` - Update
- `DELETE /api/organizations/:id` - Delete

### Opportunities
- `GET /api/opportunities` - List all
- `GET /api/opportunities/:id` - Get one
- `GET /api/opportunities/search/:query` - Search
- `POST /api/opportunities` - Create
- `PUT /api/opportunities/:id` - Update
- `DELETE /api/opportunities/:id` - Delete

### Pipeline
- `GET /api/pipeline` - List (with optional filters)
- `GET /api/pipeline/summary` - Get counts by stage
- `POST /api/pipeline` - Create
- `PUT /api/pipeline/:id` - Update
- `POST /api/pipeline/:id/move` - Change stage
- `DELETE /api/pipeline/:id` - Delete

### AI
- `POST /api/ai/smart-match` - Run smart matching
- `POST /api/ai/item-search` - Search for item funding
- `POST /api/ai/analyze-match` - Deep analyze a match

### Import
- `POST /api/import/base44` - Import Base44 export
- `GET /api/import/stats` - Get database stats

---

## 💾 Database

SQLite database stored at `data/grantflow.db`

### Reset Database
```bash
rm data/grantflow.db
npm run dev
```
The database will be recreated on next start.

---

## 🔧 Configuration

Edit `.env` to configure:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Server port
PORT=3001
```

---

## 🐛 Troubleshooting

### "Cannot find module 'better-sqlite3'"
```bash
cd backend && npm install
```

### "OPENAI_API_KEY not set"
Check that `.env` file exists and has your API key.

### Port already in use
Change PORT in `.env` or kill the process using the port.

### Frontend can't connect to API
Make sure backend is running on port 3001. The Vite config proxies `/api` requests.

---

## 📝 Development

### Backend only
```bash
cd backend && npm run dev
```

### Frontend only
```bash
cd frontend && npm run dev
```

### Both (recommended)
```bash
npm run dev
```

---

## 🔐 Security Notes

- Your OpenAI API key is stored locally in `.env`
- Never commit `.env` to version control
- Database is local SQLite - back it up regularly
- No data is sent anywhere except OpenAI for AI features

---

## 📦 Building for Production

```bash
cd frontend && npm run build
```

Then serve the `frontend/dist` folder with your preferred static server.

---

Built with ❤️ for grant professionals

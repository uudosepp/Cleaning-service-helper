# Cleaning Service Helper

A multi-tenant cleaning company management system with AI assistant, built with React, Supabase, and Gemini AI.

## The Story

This project started as a simple personal idea: I wanted to organize my home cleaning schedule, what to clean, when, and keep track of it all. As the concept grew, I realized the same system could work for professional cleaning companies managing multiple employees, locations, and clients.

The idea evolved into a full multi-tenant SaaS platform where multiple cleaning companies can use the same system, each with their own isolated data, employees, and schedules, all managed through a clean, mobile-friendly interface with an AI assistant to help with scheduling.

## Features

### Multi-Tenant Architecture
- Each cleaning company (tenant) has completely isolated data
- Row Level Security (RLS) policies ensure no data leaks between tenants
- Admin registers a company, adds employees, manages everything from one dashboard

### Two Roles

**Admin / Manager:**
- Dashboard with task overview, stats, and declined tasks needing replacement
- Employee management with auto-generated login credentials
- Location, Property, Room hierarchy (addresses, apartments, rooms)
- Calendar-based schedule management
- AI Assistant (Gemini) that can add employees, create tasks, find available workers
- Real-time chat with each cleaner
- Notifications with task detail drill-down

**Cleaner / Worker:**
- Personal dashboard with pending, active, and upcoming tasks
- Confirm or decline cleaning assignments
- Clock in/out with duration tracking and completion notes
- Mark unavailability (dates/times they cannot work)
- Chat with admin
- Personal calendar view (confirmed tasks only)

### AI Assistant (Gemini)
- Free Google Gemini API integration
- Function calling: add/remove employees, locations, tasks, find replacements
- Reads real system data for every response
- Auto-detects the latest available Gemini model
- Bilingual responses (English/Estonian)
- Security: never reveals passwords or sensitive data

### Other Features
- Light/dark theme
- Bilingual UI (English/Estonian)
- Mobile-responsive design
- Real-time unread badges
- Password reset flow
- Confirm dialogs for all destructive actions
- Task detail modal from dashboard, schedule, and notifications

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 6 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix) |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| AI | Google Gemini API (free tier) |
| Deployment | Vercel + Supabase |

## Getting Started

1. Clone and install:
```bash
git clone https://github.com/uudosepp/Cleaning-service-helper.git
cd Cleaning-service-helper
npm install
```

2. Create `.env` with your Supabase credentials

3. Run SQL migrations in Supabase SQL Editor

4. Start: `npm run dev`

5. Register at http://localhost:5173/register

## Roadmap

- Email notifications
- Recurring cleaning schedules
- Photo documentation
- Checklist per property
- Reporting dashboard
- PWA support
- Push notifications
- Invoice generation
- Client portal

## License

MIT

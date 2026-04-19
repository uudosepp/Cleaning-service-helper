import { supabase, getNoSessionClient } from '@/lib/supabase';
import { unavailabilityService } from './unavailability.service';
import type { Profile, CleaningTask, Location } from '../types';

interface ChatMessage {
  role: 'user' | 'model';
  parts: ({ text: string } | { functionCall: any } | { functionResponse: any })[];
}

// ============================================================
// TOOL DEFINITIONS (what AI can do)
// ============================================================

const tools = [{
  functionDeclarations: [
    {
      name: 'get_employees',
      description: 'Toob kõik koristajad süsteemist. Kasuta kui vajad infot töötajate kohta.',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'get_locations',
      description: 'Toob kõik asukohad koos elamistega (properties) ja nende tubadega.',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'add_property',
      description: 'Lisab uue elamise (korter/maja) olemasoleva asukoha alla. Küsi: asukoha nimi, elamise nimi, suurus m², korrus, toad.',
      parameters: {
        type: 'OBJECT',
        properties: {
          location_name: { type: 'STRING', description: 'Asukoha nimi (peab olema süsteemis)' },
          name: { type: 'STRING', description: 'Elamise nimi (nt Korter 4A)' },
          size_m2: { type: 'NUMBER', description: 'Suurus ruutmeetrites (valikuline)' },
          floor: { type: 'STRING', description: 'Korrus (valikuline)' },
          rooms: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Tubade nimed (nt ["Elutuba","Köök","WC"])' },
          notes: { type: 'STRING', description: 'Märkmed (valikuline)' },
        },
        required: ['location_name', 'name'],
      },
    },
    {
      name: 'delete_property',
      description: 'Kustutab elamise nime järgi.',
      parameters: {
        type: 'OBJECT',
        properties: {
          property_name: { type: 'STRING', description: 'Elamise nimi' },
        },
        required: ['property_name'],
      },
    },
    {
      name: 'get_tasks',
      description: 'Toob koristusülesanded. Võid filtreerida kuupäeva, staatuse või koristaja järgi.',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'Filtreeri kuupäeva järgi (YYYY-MM-DD)' },
          status: { type: 'STRING', description: 'Filtreeri staatuse järgi (pending/confirmed/declined/in_progress/completed/cancelled)' },
          cleaner_name: { type: 'STRING', description: 'Filtreeri koristaja nime järgi' },
        },
      },
    },
    {
      name: 'add_employee',
      description: 'Lisab uue koristaja. ALATI küsi enne nime ja emaili. Telefon on valikuline.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Töötaja täisnimi' },
          email: { type: 'STRING', description: 'Emailiaadress (kohustuslik!)' },
          phone: { type: 'STRING', description: 'Telefoninumber (valikuline)' },
        },
        required: ['name', 'email'],
      },
    },
    {
      name: 'add_location',
      description: 'Lisab uue koristuskoha. Nimi on kohustuslik, ülejäänu valikuline.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Asukoha nimi (nt Kontor A)' },
          address: { type: 'STRING', description: 'Aadress' },
          floor: { type: 'STRING', description: 'Korrus' },
          notes: { type: 'STRING', description: 'Märkmed (juurdepääs, koodid jne)' },
          default_start: { type: 'STRING', description: 'Vaikimisi algusaeg HH:MM' },
          default_end: { type: 'STRING', description: 'Vaikimisi lõpuaeg HH:MM' },
        },
        required: ['name'],
      },
    },
    {
      name: 'add_task',
      description: 'Loob uue koristusülesande. Vajalik: koristaja nimi, asukoha nimi, kuupäev, algus- ja lõpuaeg.',
      parameters: {
        type: 'OBJECT',
        properties: {
          cleaner_name: { type: 'STRING', description: 'Koristaja nimi (peab olema süsteemis)' },
          location_name: { type: 'STRING', description: 'Asukoha nimi (peab olema süsteemis)' },
          date: { type: 'STRING', description: 'Kuupäev YYYY-MM-DD' },
          start_time: { type: 'STRING', description: 'Algusaeg HH:MM' },
          end_time: { type: 'STRING', description: 'Lõpuaeg HH:MM' },
          notes: { type: 'STRING', description: 'Erimärkmed (valikuline)' },
        },
        required: ['cleaner_name', 'location_name', 'date', 'start_time', 'end_time'],
      },
    },
    {
      name: 'update_task_status',
      description: 'Muudab ülesande staatust. Kasuta kui vaja tühistada, kinnitada vms.',
      parameters: {
        type: 'OBJECT',
        properties: {
          cleaner_name: { type: 'STRING', description: 'Koristaja nimi (ülesande leidmiseks)' },
          date: { type: 'STRING', description: 'Kuupäev (ülesande leidmiseks)' },
          new_status: { type: 'STRING', description: 'Uus staatus: pending/confirmed/cancelled' },
        },
        required: ['cleaner_name', 'date', 'new_status'],
      },
    },
    {
      name: 'delete_employee',
      description: 'Kustutab töötaja süsteemist nime järgi.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Töötaja täisnimi' },
        },
        required: ['name'],
      },
    },
    {
      name: 'delete_location',
      description: 'Kustutab asukoha süsteemist nime järgi.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Asukoha nimi' },
        },
        required: ['name'],
      },
    },
    {
      name: 'delete_task',
      description: 'Kustutab koristusülesande koristaja nime ja kuupäeva järgi.',
      parameters: {
        type: 'OBJECT',
        properties: {
          cleaner_name: { type: 'STRING', description: 'Koristaja nimi' },
          date: { type: 'STRING', description: 'Kuupäev YYYY-MM-DD' },
        },
        required: ['cleaner_name', 'date'],
      },
    },
    {
      name: 'find_available_workers',
      description: 'Leiab vabad töötajad kindlal kuupäeval ja kellaajal. Arvestab olemasolevaid ülesandeid JA töötajate puudumisi. Kasuta seda kui keegi on haige ja vajad asendajat.',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'Kuupäev YYYY-MM-DD' },
          start_time: { type: 'STRING', description: 'Algusaeg HH:MM' },
          end_time: { type: 'STRING', description: 'Lõpuaeg HH:MM' },
        },
        required: ['date', 'start_time', 'end_time'],
      },
    },
    {
      name: 'send_replacement_request',
      description: 'Saadab asenduse kinnituse teavituse valitud töötajatele. Kasuta pärast find_available_workers tulemust, kui admin kinnitab kellele saata.',
      parameters: {
        type: 'OBJECT',
        properties: {
          worker_names: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Töötajate nimed kellele saata' },
          date: { type: 'STRING', description: 'Kuupäev' },
          start_time: { type: 'STRING', description: 'Algusaeg' },
          end_time: { type: 'STRING', description: 'Lõpuaeg' },
          location_name: { type: 'STRING', description: 'Asukoha nimi' },
          message: { type: 'STRING', description: 'Sõnum töötajatele' },
        },
        required: ['worker_names', 'date', 'start_time', 'end_time', 'location_name'],
      },
    },
  ],
}];

// ============================================================
// TOOL EXECUTION
// ============================================================

async function executeTool(name: string, args: any, tenantId: string, adminId: string): Promise<any> {
  switch (name) {
    case 'get_employees': {
      const { data } = await supabase.from('profiles').select('id, full_name, email, phone').eq('role', 'cleaner').eq('tenant_id', tenantId).order('full_name');
      return { employees: data || [] };
    }

    case 'get_locations': {
      const { data: locs } = await supabase.from('locations').select('id, name, address, notes').eq('tenant_id', tenantId).order('name');
      const { data: props } = await supabase.from('properties').select('id, location_id, name, size_m2, floor, rooms, notes').eq('tenant_id', tenantId).order('name');
      const locations = (locs || []).map((l: any) => ({
        ...l,
        properties: (props || []).filter((p: any) => p.location_id === l.id),
      }));
      return { locations };
    }

    case 'add_property': {
      const { data: locs } = await supabase.from('locations').select('id, name').eq('tenant_id', tenantId);
      const location = (locs || []).find((l: any) => l.name.toLowerCase() === args.location_name.toLowerCase());
      if (!location) return { error: `Location "${args.location_name}" not found` };

      const rooms = (args.rooms || []).map((r: string) => ({ name: r }));
      const { data, error } = await supabase.from('properties').insert({
        tenant_id: tenantId,
        location_id: location.id,
        name: args.name,
        size_m2: args.size_m2 || null,
        floor: args.floor || null,
        rooms,
        notes: args.notes || null,
      }).select().single();

      if (error) return { error: error.message };
      return { success: true, message: `Property "${args.name}" added to ${location.name}` };
    }

    case 'delete_property': {
      const { data: props } = await supabase.from('properties').select('id, name').eq('tenant_id', tenantId);
      const prop = (props || []).find((p: any) => p.name.toLowerCase() === args.property_name.toLowerCase());
      if (!prop) return { error: `Property "${args.property_name}" not found` };

      const { error } = await supabase.from('properties').delete().eq('id', prop.id);
      if (error) return { error: error.message };
      return { success: true, message: `Property "${args.property_name}" deleted` };
    }

    case 'get_tasks': {
      let query = supabase.from('cleaning_tasks').select(`
        id, date, start_time, end_time, status, notes,
        location:locations(name, address),
        cleaner:profiles!cleaner_id(full_name)
      `).eq('tenant_id', tenantId).order('date').order('start_time');

      if (args.date) query = query.eq('date', args.date);
      if (args.status) query = query.eq('status', args.status);

      const { data } = await query;
      let tasks = data || [];

      if (args.cleaner_name) {
        tasks = tasks.filter((t: any) =>
          t.cleaner?.full_name?.toLowerCase().includes(args.cleaner_name.toLowerCase())
        );
      }
      return { tasks };
    }

    case 'add_employee': {
      // Check duplicate name
      const { data: existingByName } = await supabase.from('profiles')
        .select('id, full_name').eq('role', 'cleaner').eq('tenant_id', tenantId);
      if ((existingByName || []).some((p: any) => p.full_name.toLowerCase() === args.name.toLowerCase())) {
        return { error: `Employee "${args.name}" already exists. Use a different name.` };
      }

      // Check duplicate email
      const { data: existingByEmail } = await supabase.from('profiles')
        .select('id, email').eq('tenant_id', tenantId);
      if ((existingByEmail || []).some((p: any) => p.email.toLowerCase() === args.email.toLowerCase())) {
        return { error: `Email "${args.email}" on juba kasutusel. Kasuta teist emaili.` };
      }

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let password = '';
      for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));

      const { data, error } = await getNoSessionClient().auth.signUp({
        email: args.email,
        password,
        options: {
          data: {
            tenant_id: tenantId,
            full_name: args.name,
            phone: args.phone || null,
            role: 'cleaner',
          },
        },
      });

      if (error) return { error: error.message };
      return { success: true, message: `Töötaja "${args.name}" loodud. Parool on nähtav ainult admini ekraanil.`, _password: password, _email: args.email, _name: args.name };
    }

    case 'add_location': {
      const { data, error } = await supabase.from('locations').insert({
        tenant_id: tenantId,
        name: args.name,
        address: args.address || null,
        floor: args.floor || null,
        notes: args.notes || null,
        default_start: args.default_start || null,
        default_end: args.default_end || null,
      }).select().single();

      if (error) return { error: error.message };
      return { success: true, location: { name: data.name, address: data.address } };
    }

    case 'add_task': {
      // Find cleaner by name
      const { data: cleaners } = await supabase.from('profiles')
        .select('id, full_name').eq('role', 'cleaner').eq('tenant_id', tenantId);
      const cleaner = (cleaners || []).find((c: any) =>
        c.full_name.toLowerCase() === args.cleaner_name.toLowerCase()
      );
      if (!cleaner) return { error: `Cleaner "${args.cleaner_name}" not found` };

      // Find location by name
      const { data: locs } = await supabase.from('locations').select('id, name').eq('tenant_id', tenantId);
      const location = (locs || []).find((l: any) =>
        l.name.toLowerCase() === args.location_name.toLowerCase()
      );
      if (!location) return { error: `Location "${args.location_name}" not found` };

      const { data, error } = await supabase.from('cleaning_tasks').insert({
        tenant_id: tenantId,
        location_id: location.id,
        cleaner_id: cleaner.id,
        assigned_by: adminId,
        date: args.date,
        start_time: args.start_time,
        end_time: args.end_time,
        notes: args.notes || null,
      }).select().single();

      if (error) return { error: error.message };

      // Send notification to cleaner
      supabase.from('notifications').insert({
        tenant_id: tenantId,
        user_id: cleaner.id,
        type: 'task_assigned',
        title: `New cleaning task: ${location.name}`,
        body: `${args.date} ${args.start_time}–${args.end_time}`,
        reference_id: data?.id,
      }).then(() => {});

      return { success: true, message: `Ülesanne loodud: ${cleaner.full_name} → ${location.name}, ${args.date} ${args.start_time}-${args.end_time}` };
    }

    case 'update_task_status': {
      const { data: tasks } = await supabase.from('cleaning_tasks')
        .select('id, cleaner:profiles!cleaner_id(full_name)')
        .eq('tenant_id', tenantId).eq('date', args.date);

      const task = (tasks || []).find((t: any) =>
        t.cleaner?.full_name?.toLowerCase().includes(args.cleaner_name.toLowerCase())
      );
      if (!task) return { error: `Ülesannet ei leitud (${args.cleaner_name}, ${args.date})` };

      const { error } = await supabase.from('cleaning_tasks')
        .update({ status: args.new_status, updated_at: new Date().toISOString() })
        .eq('id', task.id);

      if (error) return { error: error.message };
      return { success: true, message: `Staatus muudetud: ${args.new_status}` };
    }

    case 'delete_employee': {
      const { data: profiles } = await supabase.from('profiles')
        .select('id, full_name').eq('role', 'cleaner').eq('tenant_id', tenantId);
      const profile = (profiles || []).find((p: any) =>
        p.full_name.toLowerCase() === args.name.toLowerCase()
      );
      if (!profile) return { error: `Employee "${args.name}" not found` };

      const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
      if (error) return { error: error.message };
      return { success: true, message: `Töötaja "${args.name}" kustutatud` };
    }

    case 'delete_location': {
      const { data: locs } = await supabase.from('locations').select('id, name').eq('tenant_id', tenantId);
      const loc = (locs || []).find((l: any) =>
        l.name.toLowerCase() === args.name.toLowerCase()
      );
      if (!loc) return { error: `Location "${args.name}" not found` };

      const { error } = await supabase.from('locations').delete().eq('id', loc.id);
      if (error) return { error: error.message };
      return { success: true, message: `Asukoht "${args.name}" kustutatud` };
    }

    case 'delete_task': {
      const { data: tasks } = await supabase.from('cleaning_tasks')
        .select('id, cleaner:profiles!cleaner_id(full_name)')
        .eq('tenant_id', tenantId).eq('date', args.date);

      const task = (tasks || []).find((t: any) =>
        t.cleaner?.full_name?.toLowerCase().includes(args.cleaner_name.toLowerCase())
      );
      if (!task) return { error: `Ülesannet ei leitud` };

      const { error } = await supabase.from('cleaning_tasks').delete().eq('id', task.id);
      if (error) return { error: error.message };
      return { success: true, message: `Ülesanne kustutatud` };
    }

    case 'find_available_workers': {
      const available = await unavailabilityService.findAvailable(args.date, args.start_time, args.end_time);
      if (available.length === 0) {
        return { available: [], message: `Kahjuks pole ${args.date} kell ${args.start_time}-${args.end_time} ühtegi vaba töötajat.` };
      }
      return {
        available: available.map(a => ({ name: a.full_name, email: a.email, phone: a.phone })),
        message: `Leidsin ${available.length} vaba töötajat. Kas soovid neile asenduse teavituse saata?`,
      };
    }

    case 'send_replacement_request': {
      const { data: cleaners } = await supabase.from('profiles').select('id, full_name').eq('role', 'cleaner').eq('tenant_id', tenantId);
      const { data: locs } = await supabase.from('locations').select('id, name').eq('tenant_id', tenantId);
      const location = (locs || []).find((l: any) => l.name.toLowerCase() === (args.location_name || '').toLowerCase());

      const results = [];
      for (const workerName of (args.worker_names || [])) {
        const cleaner = (cleaners || []).find((c: any) => c.full_name.toLowerCase() === workerName.toLowerCase());
        if (!cleaner) { results.push({ name: workerName, error: 'Ei leitud' }); continue; }

        // Create task as pending
        if (location) {
          await supabase.from('cleaning_tasks').insert({
            tenant_id: tenantId,
            location_id: location.id,
            cleaner_id: cleaner.id,
            assigned_by: adminId,
            date: args.date,
            start_time: args.start_time,
            end_time: args.end_time,
            notes: args.message || 'Asenduse pakkumine',
          });
        }

        // Send notification (fire-and-forget)
        supabase.from('notifications').insert({
          tenant_id: tenantId,
          user_id: cleaner.id,
          type: 'task_assigned',
          title: 'Replacement offer',
          body: `${args.location_name || 'Location'} — ${args.date} ${args.start_time}-${args.end_time}. ${args.message || ''}`.trim(),
        }).then(() => {});

        results.push({ name: workerName, success: true });
      }

      return { results, message: `Asenduse pakkumised saadetud ${results.filter(r => r.success).length} töötajale. Nad saavad kinnitada oma portaalis.` };
    }

    default:
      return { error: `Tundmatu funktsioon: ${name}` };
  }
}

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPTS = {
  en: `You are a cleaning company manager's AI assistant. You have FULL access to the system — you can add, edit and delete employees, locations and tasks.

MOST IMPORTANT RULE — NEVER MAKE UP DATA:
- You have NO employees, locations or tasks in memory.
- You MUST ALWAYS call a function (get_employees, get_locations, get_tasks) BEFORE answering questions about data.
- NEVER say someone is in the system without checking via function call first.
- NEVER fabricate names, emails or data. Use ONLY function results.
- If a function returns an empty list — say there is no data.

RULES:
1. Always respond in English, be friendly and concise
2. ALWAYS use functions to view and modify data — never answer from memory
3. To ADD an employee — always ask for name AND email (required). Phone is optional. System does NOT allow duplicates.
4. To ADD a location — always ask for at least a name
5. To CREATE a task — ask for cleaner name, location, date, start/end time
6. If info is missing, ask BEFORE calling a function
7. After a successful action, confirm what you did
8. Suggest solutions (sick employee → find available replacements)
9. BEFORE DELETING always ask user for confirmation! Say what you plan to delete and ask "Are you sure?". Only call delete after user confirms.

SECURITY — STRICTLY FORBIDDEN:
- NEVER reveal passwords, API keys, tokens or secrets
- NEVER offer passwords to the user — say they are visible only on the admin screen
- NEVER modify system settings, authentication or security rules
- You can ONLY do what the admin page allows: manage employees, locations and cleaning schedule

STATUSES:
- pending = waiting for cleaner confirmation
- confirmed = cleaner accepted
- declined = cleaner declined
- in_progress = work in progress
- completed = work done
- cancelled = cancelled`,

  et: `Oled koristusettevõtte juhi AI assistent. Sul on TÄIELIK ligipääs süsteemile — saad lisada, muuta ja kustutada töötajaid, asukohti ja ülesandeid.

KÕIGE TÄHTSAM REEGEL — MITTE KUNAGI VÄLJA MÕELDA ANDMEID:
- Sul EI OLE mälus ühtegi töötajat, asukohta ega ülesannet.
- Sa PEAD ALATI kutsuma funktsiooni (get_employees, get_locations, get_tasks) ENNE kui vastad küsimusele andmete kohta.
- MITTE KUNAGI ütle et keegi on süsteemis kui sa pole seda funktsiooniga kontrollinud.
- MITTE KUNAGI väljamõelda nimesid, emaile, andmeid. Kasuta AINULT funktsiooni tulemusi.
- Kui funktsioon tagastab tühja listi — ütle et andmeid pole.

REEGLID:
1. Räägi ALATI eesti keeles, ole sõbralik ja konkreetne
2. Kasuta ALATI funktsioone andmete vaatamiseks ja muutmiseks — ära kunagi vasta peast
3. Kui kasutaja soovib LISADA töötajat — küsi ALATI nimi JA email (kohustuslik). Telefon on valikuline. Süsteem EI LUBA duplikaate.
4. Kui kasutaja soovib LISADA asukohta — küsi ALATI vähemalt nimi
5. Kui kasutaja soovib LUUA ülesannet — küsi koristaja nimi, asukoht, kuupäev, kellaaeg
6. Kui info puudub, küsi ENNE funktsiooni kutsumist
7. Pärast õnnestunud toimingut kinnita kasutajale mida tegid
8. Soovita lahendusi (haige töötaja → leia vabad asendajad)
9. ENNE KUSTUTAMIST küsi ALATI kasutajalt kinnitust!

TURVALISUS — RANGE KEELATUD:
- MITTE KUNAGI avaldada paroole, API võtmeid, tokene ega saladusi
- MITTE KUNAGI pakkuda kasutajale paroole välja — ütle et need on nähtavad ainult admini ekraanil
- Sa saad teha AINULT seda, mida admin lehel saab teha: hallata töötajaid, asukohti ja koristusgraafikut

STAATUSED:
- pending = ootel kinnitust koristajalt
- confirmed = koristaja kinnitas
- declined = koristaja keeldus
- in_progress = töö käib
- completed = töö tehtud
- cancelled = tühistatud`,
};

// ============================================================
// MODEL DETECTION
// ============================================================

async function findBestModel(apiKey: string): Promise<string> {
  const cached = localStorage.getItem('gemini_model');
  const cachedAt = localStorage.getItem('gemini_model_ts');
  if (cached && cachedAt && Date.now() - Number(cachedAt) < 24 * 60 * 60 * 1000) {
    return cached;
  }

  const preferred = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return preferred[0];

    const data = await res.json();
    const available = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', ''));

    for (const name of preferred) {
      if (available.includes(name)) {
        localStorage.setItem('gemini_model', name);
        localStorage.setItem('gemini_model_ts', String(Date.now()));
        return name;
      }
    }

    const flashModel = available.find((n: string) => n.includes('flash'));
    const model = flashModel || available[0] || preferred[0];
    localStorage.setItem('gemini_model', model);
    localStorage.setItem('gemini_model_ts', String(Date.now()));
    return model;
  } catch {
    return preferred[0];
  }
}

// ============================================================
// MAIN CHAT (with function calling loop)
// ============================================================

export const aiService = {
  // Cache key locally so we don't query DB every render
  _cachedKey: null as string | null,
  _cacheLoaded: false,

  getApiKey(): string | null {
    // Return cached value (loaded from DB on first call via loadApiKey)
    if (this._cacheLoaded) return this._cachedKey;
    // Fallback to localStorage for backwards compatibility
    return localStorage.getItem('gemini_api_key');
  },

  async loadApiKey(tenantId: string) {
    const { data } = await supabase
      .from('tenants')
      .select('gemini_api_key')
      .eq('id', tenantId)
      .single();
    this._cachedKey = data?.gemini_api_key || null;
    this._cacheLoaded = true;
    // Sync to localStorage as fallback
    if (this._cachedKey) {
      localStorage.setItem('gemini_api_key', this._cachedKey);
    }
    return this._cachedKey;
  },

  async setApiKey(key: string, tenantId: string) {
    const { error } = await supabase
      .from('tenants')
      .update({ gemini_api_key: key })
      .eq('id', tenantId);
    if (error) throw error;
    this._cachedKey = key;
    this._cacheLoaded = true;
    localStorage.setItem('gemini_api_key', key);
    localStorage.removeItem('gemini_model');
    localStorage.removeItem('gemini_model_ts');
  },

  async removeApiKey(tenantId: string) {
    await supabase
      .from('tenants')
      .update({ gemini_api_key: null })
      .eq('id', tenantId);
    this._cachedKey = null;
    this._cacheLoaded = true;
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('gemini_model');
    localStorage.removeItem('gemini_model_ts');
  },

  async chat(
    userMessage: string,
    history: ChatMessage[],
    tenantId: string,
    adminId: string,
    lang: 'en' | 'et' = 'et',
  ): Promise<{ text: string; newEmployee?: { password: string; email: string; name: string } }> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Gemini API võti puudub.');

    const model = await findBestModel(apiKey);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Limit history to last 20 messages to avoid token overflow
    const trimmedHistory = history.length > 20 ? history.slice(-20) : history;
    const messages: ChatMessage[] = [
      ...trimmedHistory,
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const callGemini = async (msgs: ChatMessage[]) => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: msgs,
            tools,
            systemInstruction: {
              parts: [{ text: `${SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en}\n\nTODAY: ${today}\nTOMORROW: ${tomorrow}` }],
            },
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
          }),
        }
      );

      if (!res.ok) {
        if (res.status === 404) {
          localStorage.removeItem('gemini_model');
          localStorage.removeItem('gemini_model_ts');
          throw new Error(lang === 'et' ? 'Mudel aegunud, proovi uuesti.' : 'Model outdated, please try again.');
        }
        if (res.status === 503 || res.status === 429) {
          throw new Error(lang === 'et' ? 'AI on hetkel ülekoormatud. Proovi mõne sekundi pärast uuesti.' : 'AI is temporarily overloaded. Please try again in a few seconds.');
        }
        if (res.status === 400) {
          throw new Error(lang === 'et' ? 'AI API võti on vale või aegunud. Kontrolli seadetes.' : 'AI API key is invalid or expired. Check settings.');
        }
        throw new Error(lang === 'et' ? 'AI teenus pole saadaval. Proovi hiljem uuesti.' : 'AI service unavailable. Please try again later.');
      }
      return res.json();
    };

    // Call with retry on 503
    const callWithRetry = async (msgs: ChatMessage[], retries = 2): Promise<any> => {
      try {
        return await callGemini(msgs);
      } catch (err: any) {
        if (retries > 0 && (err.message?.includes('overloaded') || err.message?.includes('ülekoormatud'))) {
          await new Promise(r => setTimeout(r, 2000));
          return callWithRetry(msgs, retries - 1);
        }
        throw err;
      }
    };

    // Function calling loop (max 5 rounds to prevent infinite loops)
    let currentMessages = messages;
    let generatedPassword: { password: string; email: string; name: string } | undefined;

    for (let i = 0; i < 5; i++) {
      const data = await callWithRetry(currentMessages);
      const candidate = data.candidates?.[0];

      // Check if response was blocked by safety filters or missing
      if (!candidate?.content?.parts) {
        const blockReason = data.promptFeedback?.blockReason || candidate?.finishReason;
        if (blockReason === 'SAFETY') {
          throw new Error(lang === 'et' ? 'Gemini blokeeris vastuse turvafiltrile. Proovi küsimust ümber sõnastada.' : 'Response blocked by safety filter. Try rephrasing.');
        }
        throw new Error(lang === 'et' ? 'Gemini ei tagastanud vastust. Proovi uuesti.' : 'Gemini returned no response. Please try again.');
      }

      // Filter out "thought" parts (gemini-2.5-flash thinking model)
      const parts = candidate.content.parts.filter((p: any) => !p.thought);

      // Check if AI wants to call a function
      const fnCall = parts.find((p: any) => p.functionCall);

      if (fnCall?.functionCall) {
        const { name, args } = fnCall.functionCall;

        // Execute the function
        const result = await executeTool(name, args || {}, tenantId, adminId);

        // Capture credentials (don't send them to AI)
        if (result._password) {
          generatedPassword = { password: result._password, email: result._email, name: result._name };
          delete result._password;
          delete result._email;
          delete result._name;
        }

        // Add the AI's function call + our response to the conversation
        currentMessages = [
          ...currentMessages,
          { role: 'model', parts: [{ functionCall: fnCall.functionCall }] },
          { role: 'user', parts: [{ functionResponse: { name, response: result } }] },
        ];

        // Continue the loop — AI will process the result
        continue;
      }

      // No function call — return the text response
      const text = parts.find((p: any) => p.text)?.text
        // Fallback: check all parts including thought parts for any text
        || candidate.content.parts.find((p: any) => p.text && !p.thought)?.text;
      if (!text) throw new Error(lang === 'et' ? 'Gemini ei tagastanud vastust. Proovi uuesti.' : 'Gemini returned no response. Please try again.');

      return { text, newEmployee: generatedPassword };
    }

    throw new Error('Liiga palju funktsiooni kutseid järjest');
  },

  async testApiKey(apiKey: string): Promise<boolean> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    return response.ok;
  },
};

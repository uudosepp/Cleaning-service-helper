import * as kv from "./kv_store.tsx";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Available functions for AI to call
const functions = [
  {
    name: "add_employee",
    description: "Lisab uue töötaja süsteemi. Kasuta seda kui kasutaja soovib lisada töötaja.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Töötaja täisnimi (nt. Mari Mets)" },
        email: { type: "string", description: "Töötaja emailiaadress" },
        phone: { type: "string", description: "Töötaja telefoninumber (vabatahtlik)" },
      },
      required: ["name", "email"],
    },
  },
  {
    name: "add_room",
    description: "Lisab uue ruumi süsteemi. Kasuta seda kui kasutaja soovib lisada ruumi või koristusala.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Ruumi nimi (nt. Kontor A, Ruum 1)" },
        startTime: { type: "string", description: "Töö algusaeg formaadis HH:MM (nt. 09:00)" },
        endTime: { type: "string", description: "Töö lõpuaeg formaadis HH:MM (nt. 17:00)" },
      },
      required: ["name", "startTime", "endTime"],
    },
  },
  {
    name: "add_schedule",
    description: "Loob uue ajakava (määrab töötaja ruumi koristama). Kasuta seda kui kasutaja soovib planeerida tööd.",
    parameters: {
      type: "object",
      properties: {
        employeeName: { type: "string", description: "Töötaja nimi" },
        roomName: { type: "string", description: "Ruumi nimi" },
        date: { type: "string", description: "Kuupäev formaadis YYYY-MM-DD" },
        startTime: { type: "string", description: "Algusaeg HH:MM" },
        endTime: { type: "string", description: "Lõpuaeg HH:MM" },
      },
      required: ["employeeName", "roomName", "date", "startTime", "endTime"],
    },
  },
  {
    name: "find_available_employees",
    description: "Leiab vabad töötajad kindlal kuupäeval ja kellaajal. Kasuta seda kui keegi on haige ja vajad asendajat.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Kuupäev formaadis YYYY-MM-DD" },
        startTime: { type: "string", description: "Algusaeg HH:MM" },
        endTime: { type: "string", description: "Lõpuaeg HH:MM" },
        excludeEmployeeId: { type: "string", description: "Töötaja ID, keda välja jätta (haige töötaja)" },
      },
      required: ["date", "startTime", "endTime"],
    },
  },
  {
    name: "get_employees",
    description: "Toob kõik töötajad süsteemist. Kasuta seda kui vajad infot töötajate kohta.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_rooms",
    description: "Toob kõik ruumid süsteemist. Kasuta seda kui vajad infot ruumide kohta.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_schedules",
    description: "Toob kõik ajakavad. Kasuta seda kui vajad infot planeeritud tööde kohta.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Valikuline: filtreeri kuupäeva järgi (YYYY-MM-DD)" },
      },
    },
  },
  {
    name: "send_notifications",
    description: "Saadab teavitused töötajatele, et nad saaksid vastata jah/ei asendusele. Kasuta seda kui leidsite vabad töötajad ja kasutaja soovib neile teavitusi saata.",
    parameters: {
      type: "object",
      properties: {
        employeeIds: { 
          type: "array", 
          items: { type: "string" },
          description: "Töötajate ID'd, kellele saadetakse teavitused" 
        },
        scheduleId: { type: "string", description: "Ajakava ID, mida on vaja asendada" },
        message: { type: "string", description: "Teavituse sisu" },
      },
      required: ["employeeIds", "scheduleId", "message"],
    },
  },
];

// Execute function based on AI's choice
async function executeFunction(functionName: string, args: any) {
  console.log(`Executing function: ${functionName} with args:`, args);

  switch (functionName) {
    case "add_employee": {
      const id = crypto.randomUUID();
      const employee = {
        id,
        name: args.name,
        email: args.email,
        phone: args.phone || "",
        createdAt: new Date().toISOString(),
      };
      await kv.set(`employee:${id}`, employee);
      return { success: true, employee };
    }

    case "add_room": {
      const id = crypto.randomUUID();
      const room = {
        id,
        name: args.name,
        startTime: args.startTime,
        endTime: args.endTime,
        createdAt: new Date().toISOString(),
      };
      await kv.set(`room:${id}`, room);
      return { success: true, room };
    }

    case "add_schedule": {
      const employees = await kv.getByPrefix("employee:");
      const rooms = await kv.getByPrefix("room:");

      const employee = employees.find(
        (e: any) => e.name.toLowerCase() === args.employeeName.toLowerCase()
      );
      const room = rooms.find(
        (r: any) => r.name.toLowerCase() === args.roomName.toLowerCase()
      );

      if (!employee) {
        return { success: false, error: `Töötajat "${args.employeeName}" ei leitud` };
      }
      if (!room) {
        return { success: false, error: `Ruumi "${args.roomName}" ei leitud` };
      }

      const id = crypto.randomUUID();
      const schedule = {
        id,
        employeeId: employee.id,
        roomId: room.id,
        date: args.date,
        startTime: args.startTime,
        endTime: args.endTime,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };
      await kv.set(`schedule:${id}`, schedule);
      return { success: true, schedule };
    }

    case "find_available_employees": {
      const allEmployees = await kv.getByPrefix("employee:");
      const allSchedules = await kv.getByPrefix("schedule:");

      const available = allEmployees.filter((emp: any) => {
        if (args.excludeEmployeeId && emp.id === args.excludeEmployeeId) {
          return false;
        }

        const hasConflict = allSchedules.some(
          (sched: any) =>
            sched.employeeId === emp.id &&
            sched.date === args.date &&
            sched.status !== "cancelled" &&
            !(
              sched.endTime <= args.startTime ||
              sched.startTime >= args.endTime
            )
        );

        return !hasConflict;
      });

      return { success: true, available };
    }

    case "get_employees": {
      const employees = await kv.getByPrefix("employee:");
      return { success: true, employees };
    }

    case "get_rooms": {
      const rooms = await kv.getByPrefix("room:");
      return { success: true, rooms };
    }

    case "get_schedules": {
      let schedules = await kv.getByPrefix("schedule:");
      if (args.date) {
        schedules = schedules.filter((s: any) => s.date === args.date);
      }
      return { success: true, schedules };
    }

    case "send_notifications": {
      const employees = await kv.getByPrefix("employee:");
      const schedules = await kv.getByPrefix("schedule:");

      const schedule = schedules.find((s: any) => s.id === args.scheduleId);
      if (!schedule) {
        return { success: false, error: `Ajakava ID "${args.scheduleId}" ei leitud` };
      }

      const employeeIds = args.employeeIds;
      const message = args.message;

      const notifications = employeeIds.map((id: string) => {
        const employee = employees.find((e: any) => e.id === id);
        if (!employee) {
          return { success: false, error: `Töötajat ID \"${id}\" ei leitud` };
        }

        return {
          employeeId: id,
          scheduleId: args.scheduleId,
          message,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
      });

      const notificationResults = await Promise.all(
        notifications.map(async (notification: any) => {
          const notificationId = crypto.randomUUID();
          await kv.set(`notification:${notificationId}`, notification);
          return { success: true, notification };
        })
      );

      return { success: true, notificationResults };
    }

    default:
      return { success: false, error: "Unknown function" };
  }
}

// Main AI chat function
export async function chatWithAI(userMessage: string, conversationHistory: any[] = [], userApiKey?: string, userProvider?: 'openai' | 'gemini') {
  // Use user's API key if provided, otherwise use env variable
  const apiKey = userApiKey || OPENAI_API_KEY;
  const provider = userProvider || 'openai';
  
  console.log(`[AI Service] Using provider: ${provider}, Has key: ${!!apiKey}`);
  
  // If no API key, use rule-based system
  if (!apiKey) {
    console.log('[AI Service] No API key - using rule-based fallback');
    return await chatWithRules(userMessage, conversationHistory);
  }
  
  // Try selected AI provider (throw error if fails - don't fall back)
  if (provider === 'gemini') {
    return await chatWithGemini(userMessage, conversationHistory, apiKey);
  } else {
    return await chatWithOpenAI(userMessage, conversationHistory, apiKey);
  }
}

// OpenAI-based chat
async function chatWithOpenAI(userMessage: string, conversationHistory: any[] = [], apiKey: string) {
  const messages = [
    {
      role: "system",
      content: `Oled abistav AI assistent koristajate ajakavahalduse süsteemis. 

REEGLID:
1. Räägi alati eesti keeles ja ole sõbralik
2. Kui kasutaja soovib lisada töötaja, küsi ALATI nimi, emaili ja telefoni (kui pole mainitud)
3. Kui kasutaja soovib lisada ruumi, küsi ALATI nime, algusaega ja lõpuaega (kui pole mainitud)
4. Kui keegi on haige, kasuta järgmist vooga:
   a) Kasuta get_employees ja leia haige töötaja
   b) Kasuta get_schedules et leida tema ajakava sellel kuupäeval
   c) Kasuta find_available_employees et leida vabad asendajad
   d) Küsi kasutajalt kas saata teavitused
   e) Kui kasutaja ütleb jah, kasuta send_notifications
5. Ole täpne kuupäevade ja kellaaegadega - kasuta formaate YYYY-MM-DD ja HH:MM
6. Kui info puudub, küsi enne funktsiooni kutsumist
7. Pärast edukat toimingut kinnita see kasutajale
8. Kui leiasid vabad töötajad, küsi kas saata neile teavitused

NÄITED:
- Kasutaja: "Lisa töötaja Mari Mets" → Küsi: "Mis on Mari emailiaadress?"
- Kasutaja: "Mari on haige homme" → 
  1) Kasuta get_employees et leida Mari
  2) Kasuta get_schedules et leida tema tööd homme (arvuta kuupäev: täna on 2026-03-31, homme on 2026-04-01)
  3) Kasuta find_available_employees et leida vabad töötajad
  4) Küsi: "Leidsin X vaba töötajat. Kas soovid saata neile teavitusi?"
- Kasutaja: "Kes töötab homme?" → Kasuta get_schedules funktiooni kuupäevaga 2026-04-01

KUUPÄEVAD:
- Täna on 2026-03-31
- Homme on 2026-04-01
- Ülehomme on 2026-04-02
- Arvuta kuupäevad vastavalt

TEAVITUSED:
- Kui leiad vabad töötajad asendamiseks, küsi kasutajalt: "Kas soovid saata neile teavitusi?"
- Selgita et teavituses saavad nad vastata jah/ei ja see ilmub Teavituste lehel
- Kasuta send_notifications funktsiooni ainult kui kasutaja kinnitab`,
    },
    ...conversationHistory,
    {
      role: "user",
      content: userMessage,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      functions,
      function_call: "auto",
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const message = data.choices[0].message;

  // If AI wants to call a function
  if (message.function_call) {
    const functionName = message.function_call.name;
    const functionArgs = JSON.parse(message.function_call.arguments);

    // Execute the function
    const functionResult = await executeFunction(functionName, functionArgs);

    // Call AI again with the function result
    const followUpMessages = [
      ...messages,
      message,
      {
        role: "function",
        name: functionName,
        content: JSON.stringify(functionResult),
      },
    ];

    const followUpResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: followUpMessages,
        temperature: 0.7,
      }),
    });

    const followUpData = await followUpResponse.json();
    return {
      message: followUpData.choices[0].message.content,
      functionCalled: functionName,
      functionResult,
      usingOpenAI: true,
    };
  }

  return {
    message: message.content,
    usingOpenAI: true,
  };
}

// Gemini-based chat (TASUTA!)
async function chatWithGemini(userMessage: string, conversationHistory: any[] = [], apiKey: string) {
  console.log('[Gemini] Starting request...');
  console.log(`[Gemini] API Key prefix: ${apiKey.substring(0, 10)}...`);
  
  // First, get available models
  console.log('[Gemini] Fetching available models...');
  const modelsResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!modelsResponse.ok) {
    const error = await modelsResponse.text();
    console.error("[Gemini] Failed to fetch models:", error);
    throw new Error(`Gemini API error (${modelsResponse.status}): ${error}`);
  }

  const modelsData = await modelsResponse.json();
  console.log('[Gemini] Available models:', JSON.stringify(modelsData, null, 2));

  // Find models that support generateContent (ordered by preference)
  const preferredModelNames = [
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
  ];

  const availableModels = modelsData.models?.filter((m: any) => 
    m.supportedGenerationMethods?.includes('generateContent')
  ) || [];

  if (availableModels.length === 0) {
    throw new Error('No suitable Gemini model found. Available models: ' + JSON.stringify(modelsData));
  }

  // Sort by preference
  availableModels.sort((a: any, b: any) => {
    const aIndex = preferredModelNames.findIndex(name => a.name.includes(name));
    const bIndex = preferredModelNames.findIndex(name => b.name.includes(name));
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  console.log(`[Gemini] Found ${availableModels.length} models, trying in order...`);

  // Build conversation for Gemini
  const messages = conversationHistory.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  
  // Add current user message
  messages.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const requestBody = {
    contents: messages,
    systemInstruction: {
      parts: [{
        text: `Oled abistav AI assistent koristajate ajakavahalduse süsteemis.

REEGLID:
1. Räägi alati eesti keeles ja ole sõbralik
2. Kui kasutaja soovib lisada töötaja, küsi ALATI nimi, emaili ja telefoni
3. Kui kasutaja soovib lisada ruumi, küsi ALATI nime, algusaega ja lõpuaega
4. Ole täpne kuupäevade ja kellaaegadega
5. Täna on 2026-03-31

NÄITED:
- "Lisa töötaja Mari Mets" → Küsi: "Mis on Mari emailiaadress?"
- "Kes töötab homme?" → Vasta põhinedes ajakavadel

Vasta lühidalt ja konkreetselt eesti keeles.`
      }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  // Try each model with retries
  let lastError = null;
  
  for (const model of availableModels) {
    const modelName = model.name.replace('models/', '');
    console.log(`[Gemini] Trying model: ${modelName}`);
    
    // Try with retries (only 2 attempts per model to avoid long waits)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Attempt ${attempt}/2 for ${modelName}...`);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        console.log(`[Gemini] Response status: ${response.status}`);

        if (!response.ok) {
          const error = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(error);
          } catch (e) {
            console.error("[Gemini] Failed to parse error JSON:", error);
            throw new Error(`Gemini API error (${response.status}): ${error.substring(0, 200)}`);
          }
          
          // If 503 (unavailable), try next attempt or next model
          if (response.status === 503) {
            console.log(`[Gemini] Model ${modelName} is busy (503), retrying...`);
            lastError = new Error(`Model busy: ${errorData.error.message}`);
            
            // Wait before retry (shorter wait - 500ms)
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            } else {
              // Try next model
              console.log(`[Gemini] Model ${modelName} still busy, trying next model...`);
              break;
            }
          }
          
          // For other errors, throw immediately
          console.error("[Gemini] API error:", error);
          throw new Error(`Gemini API error (${response.status}): ${error}`);
        }

        const data = await response.json();
        console.log('[Gemini] Response received successfully');
        console.log('[Gemini] Response data:', JSON.stringify(data).substring(0, 200));
        
        const messageText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!messageText) {
          console.error('[Gemini] No message in response:', JSON.stringify(data));
          throw new Error("No response from Gemini");
        }

        console.log(`[Gemini] ✅ Success with model: ${modelName}`);
        console.log(`[Gemini] Message length: ${messageText.length} chars`);

        return {
          message: messageText,
          usingGemini: true,
          modelUsed: modelName
        };
        
      } catch (error) {
        lastError = error;
        console.error(`[Gemini] ❌ Attempt ${attempt} failed for ${modelName}:`, error);
        
        // If not a 503 error, don't retry
        if (!String(error).includes('Model busy') && !String(error).includes('503')) {
          // Try next model instead
          break;
        }
      }
    }
  }

  // If all models failed, throw last error
  console.error('[Gemini] ❌ All models failed. Last error:', lastError);
  throw lastError || new Error('Kõik Gemini mudelid on hetkel hõivatud. Palun proovi mõne sekundi pärast uuesti.');
}

// Simple rule-based fallback system
async function chatWithRules(userMessage: string, conversationHistory: any[] = []) {
  const msg = userMessage.toLowerCase();
  
  // Add employee
  if (msg.includes("lisa töötaja") || msg.includes("lisa töötajad")) {
    const emailMatch = userMessage.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    const phoneMatch = userMessage.match(/\d{3,}/);
    
    // Extract names (look for capitalized words)
    const names = userMessage.match(/([A-ZÕÄÖÜ][a-zõäöü]+\s[A-ZÕÄÖÜ][a-zõäöü]+)/g);
    
    if (names && emailMatch) {
      const results = [];
      for (const name of names) {
        const result = await executeFunction("add_employee", {
          name,
          email: emailMatch[0],
          phone: phoneMatch ? phoneMatch[0] : "",
        });
        results.push(result);
      }
      
      return {
        message: `✅ Lisasin töötaja(d): ${names.join(", ")}!\n\nKui vaja rohkem töötajaid lisada, kirjuta: "Lisa töötaja [Nimi], email [email]"`,
        functionCalled: "add_employee",
        functionResult: results,
        usingOpenAI: false,
      };
    } else if (names) {
      return {
        message: `Ma leidsin nime(d): ${names.join(", ")}\n\nPalun anna ka emailiaadress! Näiteks:\n"Lisa töötaja ${names[0]}, email mari@test.ee"`,
        usingOpenAI: false,
      };
    } else {
      return {
        message: "Palun anna töötaja nimi ja emailiaadress.\n\nNäide:\n- Lisa töötaja Mari Mets, email mari@test.ee, telefon 555-1234",
        usingOpenAI: false,
      };
    }
  }
  
  // Add room
  if (msg.includes("lisa ruum")) {
    const nameMatch = userMessage.match(/ruum\s+([A-ZÕÄÖÜa-zõäöü0-9\s]+?)(?:,|töö|$)/i);
    const timeMatch = userMessage.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    
    if (nameMatch && timeMatch) {
      const result = await executeFunction("add_room", {
        name: nameMatch[1].trim(),
        startTime: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`,
        endTime: `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`,
      });
      
      return {
        message: `✅ Lisasin ruumi "${nameMatch[1].trim()}" tööajaga ${timeMatch[1]}:${timeMatch[2]}-${timeMatch[3]}:${timeMatch[4]}!`,
        functionCalled: "add_room",
        functionResult: result,
        usingOpenAI: false,
      };
    } else if (nameMatch) {
      return {
        message: `Palun anna ka tööaeg!\n\nNäide:\n"Lisa ruum ${nameMatch[1].trim()}, tööaeg 09:00-17:00"`,
        usingOpenAI: false,
      };
    } else {
      return {
        message: "Palun anna ruumi nimi ja tööaeg.\n\nNäide:\n- Lisa ruum Kontor A, tööaeg 09:00-17:00",
        usingOpenAI: false,
      };
    }
  }
  
  // Check who works (get schedules)
  if (msg.includes("kes töötab") || msg.includes("kes on tööl")) {
    let date = new Date().toISOString().split('T')[0]; // Today
    
    if (msg.includes("homme")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
    }
    
    const result = await executeFunction("get_schedules", { date });
    const schedules = result.schedules || [];
    const employees = await kv.getByPrefix("employee:");
    const rooms = await kv.getByPrefix("room:");
    
    if (schedules.length === 0) {
      return {
        message: `Sellel kuupäeval (${date}) ei ole ühtegi planeeritud tööd.`,
        usingOpenAI: false,
      };
    }
    
    const scheduleList = schedules.map((s: any) => {
      const emp = employees.find((e: any) => e.id === s.employeeId);
      const room = rooms.find((r: any) => r.id === s.roomId);
      return `- ${emp?.name || "?"} koristab ${room?.name || "?"} (${s.startTime}-${s.endTime})`;
    }).join("\n");
    
    return {
      message: `📅 Tööd kuupäeval ${date}:\n\n${scheduleList}`,
      functionCalled: "get_schedules",
      functionResult: result,
      usingOpenAI: false,
    };
  }
  
  // Find available employees (when someone is sick)
  if (msg.includes("haige") || msg.includes("on haige")) {
    return {
      message: "❌ OpenAI ei ole saadaval (kvoot otsas).\n\nHaigete asendajate leidmiseks mine:\n1. **Ajakavad** lehele\n2. Märgi töötaja haigestunuks\n3. Vajuta 'Leia asendajad'\n\nVõi lisa OpenAI krediiti: https://platform.openai.com/account/billing",
      usingOpenAI: false,
    };
  }
  
  // Default help
  return {
    message: `Tere! Praegu kasutan lihtsustatud režiimi (OpenAI kvoot otsas).\n\n✅ Ma oskan:\n- "Lisa töötaja [Nimi], email [email], telefon [number]"\n- "Lisa ruum [Nimi], tööaeg HH:MM-HH:MM"\n- "Kes töötab homme?"\n\n💡 Täiendava funktsionaalsuse jaoks lisa OpenAI krediiti:\nhttps://platform.openai.com/account/billing`,
    usingOpenAI: false,
  };
}
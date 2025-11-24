
import { GoogleGenAI, Type } from "@google/genai";
import { Column, RowData, AnalysisResult } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates new rows based on existing data patterns (Smart Fill).
 */
export const generateSmartRows = async (
  columns: Column[],
  rows: RowData[],
  count: number = 5
): Promise<RowData[]> => {
  const ai = getClient();
  
  // Prepare context
  const header = columns.map(c => `${c.label} (${c.type})`).join(", ");
  const dataSample = rows.slice(-10).map(row => {
    return columns.map(c => row[c.id]).join(", ");
  }).join("\n");

  // Context for specific select options
  const optionsContext = columns
    .filter(c => (c.type === 'select' || c.type === 'multiSelect') && c.options)
    .map(c => `Column '${c.label}' allows these values: ${c.options?.map(o => o.label).join(', ')}`)
    .join('. ');

  const prompt = `
    I have a dataset with the following columns: ${header}.
    ${optionsContext}
    Here are the most recent rows:
    ${dataSample}

    Generate ${count} new distinct, realistic rows that follow the same pattern and context.
    For 'select' columns, ONLY use the allowed values (single value).
    For 'multiSelect' columns, use allowed values (can be multiple, return as array of strings).
    For 'rating' columns, use integers 1-5.
    For 'checkbox' columns, use boolean true/false.
    If existing data is in Chinese, generate new data in Chinese.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: columns.reduce((acc, col) => {
            if (col.type === 'number' || col.type === 'rating') {
                acc[col.id] = { type: Type.NUMBER };
            } else if (col.type === 'checkbox') {
                acc[col.id] = { type: Type.BOOLEAN };
            } else if (col.type === 'multiSelect') {
                acc[col.id] = { type: Type.ARRAY, items: { type: Type.STRING } };
            } else {
                acc[col.id] = { type: Type.STRING };
            }
            return acc;
          }, {} as Record<string, any>),
        },
      },
    },
  });

  if (!response.text) throw new Error("No data generated");
  
  const newRowsRaw = JSON.parse(response.text);
  
  // Add IDs
  return newRowsRaw.map((row: any) => ({
    ...row,
    id: crypto.randomUUID(),
  }));
};

/**
 * Analyzes the current dataset.
 */
export const analyzeDataset = async (
  columns: Column[],
  rows: RowData[]
): Promise<AnalysisResult> => {
  const ai = getClient();

  const header = columns.map(c => c.label).join(", ");
  const dataSample = rows.slice(0, 50).map(row => columns.map(c => row[c.id]).join(", ")).join("\n");

  const prompt = `
    Analyze the following dataset. 
    Columns: ${header}
    Data (first 50 rows):
    ${dataSample}

    Provide a brief summary, 3 key trends/insights, and the best chart type to visualize this data.
    Please provide the response in Chinese (Simplified).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedChartType: { type: Type.STRING, enum: ["bar", "line", "pie", "area"] }
        }
      }
    }
  });

  if (!response.text) throw new Error("Analysis failed");
  return JSON.parse(response.text) as AnalysisResult;
};

/**
 * Generates a complete system of sheets (tables) based on a user prompt.
 * Supports multiple sheets and relationships.
 */
export const generateSystem = async (userPrompt: string): Promise<{
    name: string;
    description?: string;
    columns: any[];
    sampleRows: any[];
}[]> => {
  const ai = getClient();
  const prompt = `
    You are an expert database architect and solution designer.
    User Request: "${userPrompt}"
    
    Task: Design a comprehensive spreadsheet system (one or more related tables) to satisfy the request.
    
    Output JSON ONLY with the following structure:
    {
      "sheets": [
        {
          "name": "TableName",
          "description": "Purpose of this table",
          "columns": [
            { 
              "label": "Column Name", 
              "type": "text|number|select|multiSelect|date|checkbox|rating|person|email|phone|url|image|relation",
              "options": [{"label": "Option1", "color": "bg-blue-100 text-blue-800"}], // Required for select/multiSelect
              "targetSheetName": "RelatedTableName" // REQUIRED if type is 'relation'. Must match the 'name' of another sheet in this JSON.
            }
          ],
          "sampleRows": [
            { "Column Name": "Value" } // Generate 1-3 rows of realistic sample data
          ]
        }
      ]
    }
    
    Rules:
    1. **Analyze Intent**: If the user asks for a system (e.g. "CRM", "Operations Management", "Inventory"), YOU MUST create multiple related tables (e.g. Customers & Deals, Servers & Incidents).
    2. **Relations**: Use the 'relation' column type to link tables. e.g. An "Orders" table should have a "Customer" relation column.
    3. **Target Name Matching**: If type is 'relation', 'targetSheetName' MUST exactly match another sheet's "name" in your output.
    4. **Column Types**: Use 'select' for status/category (provide options), 'person' for assignees, 'date' for timelines, 'number' for metrics.
    5. **Language**: If the user prompt is in Chinese, generate all Names, Labels, Options and Data in Chinese.
    6. **Sample Data**: minimal (1-3 rows) but realistic.
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  if (!response.text) throw new Error("System generation failed");
  const data = JSON.parse(response.text);
  
  return data.sheets || [];
};

/**
 * Legacy single sheet generation (kept for backward compatibility if needed, but generateSystem is preferred)
 */
export const generateSheetFromPrompt = async (userPrompt: string): Promise<{ columns: Column[], rows: RowData[] }> => {
   // Re-use the new system generator but just take the first sheet
   const sheets = await generateSystem(userPrompt);
   if (sheets.length === 0) throw new Error("No sheet generated");
   
   const firstSheet = sheets[0];
   const columns = firstSheet.columns.map((c: any) => ({
       id: crypto.randomUUID(),
       label: c.label,
       type: c.type,
       options: c.options
   }));
   
   const rows = firstSheet.sampleRows.map((r: any) => {
       const row: RowData = { id: crypto.randomUUID() };
       columns.forEach(c => row[c.id] = r[c.label]);
       return row;
   });

   return { columns, rows };
};

/**
 * Processes a natural language command to modify the sheet structure or data.
 */
export const processAgentCommand = async (
  prompt: string,
  columns: Column[],
  sheetName: string
): Promise<{ 
  type: 'ADD_COLUMN' | 'DELETE_COLUMN' | 'RENAME_COLUMN' | 'FILL_DATA' | 'ANALYZE_DATA' | 'CREATE_SHEET' | 'NONE';
  data?: any;
  reply: string;
}> => {
  const ai = getClient();
  const schemaContext = columns.map(c => `${c.label} (${c.type})`).join(', ');
  
  const sysPrompt = `
  You are an expert spreadsheet agent. You are currently managing a sheet named "${sheetName}".
  
  Current Columns Structure: 
  ${schemaContext}
  
  User Input: "${prompt}"
  
  Your task is to classify the user's intent and extract parameters to modify the current sheet OR create a new one/system.
  
  Supported Actions:
  
  1. **ADD_COLUMN**: User wants to add a new column/field to the *current* sheet.
     - "data": { "label": "Column Name", "columnType": "Type" }
     - "columnType" must be one of: text, number, select, multiSelect, date, person, checkbox, rating, email, phone, url, location, image.
     - Infer the best type. e.g. "Add budget" -> number. "Add status" -> select.

  2. **DELETE_COLUMN**: User wants to delete/remove a column from the *current* sheet.
     - "data": { "label": "Column Name" }

  3. **RENAME_COLUMN**: User wants to rename a column in the *current* sheet.
     - "data": { "oldLabel": "Old Name", "newLabel": "New Name" }

  4. **FILL_DATA**: User wants to generate sample data or fill rows for the *current* sheet.
     - "data": { "count": number } (Default to 20 if not specified).

  5. **ANALYZE_DATA**: User wants to analyze insights/charts for the *current* sheet.
     - "data": {}

  6. **CREATE_SHEET**: User explicitly wants to create a *NEW* separate sheet, table, or a whole system (CRM, ERP, etc).
     - e.g. "Create a new table for Inventory", "Build a Project Management System", "I need a CRM", "Help me create an operations management table".
     - Any request that implies starting a new topic or tracking a new entity should be CREATE_SHEET.
     - "data": { "prompt": "Description of the new sheet/system" }

  7. **NONE**: Conversational replies, explanations, or if the intent is unclear.
  
  Response Rules:
  - If the user mentions "this table" or "this sheet" or "add column", default to modifying the current sheet (ADD_COLUMN, etc).
  - If the user asks to "create", "build", "make" a new table/system or mentions a specific domain like "Operations Management", use CREATE_SHEET.
  - Provide a friendly "reply" in Chinese (Simplified).
  
  Output JSON format only.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: sysPrompt,
    config: {
        responseMimeType: "application/json"
    }
  });
  
  if (!response.text) return { type: 'NONE', reply: "我没听懂，请再说一遍。" };
  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("JSON Parse Error", e);
    return { type: 'NONE', reply: "处理指令时出错了。" };
  }
}

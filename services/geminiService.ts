
import { GoogleGenAI } from "@google/genai";
import { Column, RowData, AnalysisResult } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 1. Create Project: Generates a multi-sheet system with relations.
 */
export const generateSystem = async (userPrompt: string): Promise<any[]> => {
  const ai = getClient();
  const prompt = `
    Role: System Architect.
    Task: Design a multi-table database system based on this request: "${userPrompt}".
    
    Output:
    Return a STRICT JSON array of "Sheet" objects.
    
    Schema Rules:
    1. "name": Table name.
    2. "columns": Array of { "label": string, "type": string, "options"?: { "label": string, "color": string }[], "targetSheetName"?: string }.
       - Supported types: 'text', 'number', 'select', 'multiSelect', 'date', 'checkbox', 'switch', 'rating', 'person', 'phone', 'email', 'url', 'location', 'image', 'relation'.
       - For 'select'/'multiSelect', provide "options" with tailwind colors (e.g. "bg-red-100 text-red-700").
       - For 'relation', you MUST provide "targetSheetName" matching another table's name in this array.
    3. "sampleRows": Array of objects with 3-5 realistic data entries matching the columns. Keys must match column labels.

    Example JSON Structure:
    [
      {
        "name": "Projects",
        "columns": [
          { "label": "Project Name", "type": "text" },
          { "label": "Status", "type": "select", "options": [{ "label": "Active", "color": "bg-green-100 text-green-800" }] }
        ],
        "sampleRows": [{ "Project Name": "Website Redesign", "Status": "Active" }]
      },
      {
        "name": "Tasks",
        "columns": [
           { "label": "Task Title", "type": "text" },
           { "label": "Is Completed", "type": "switch" },
           { "label": "Project", "type": "relation", "targetSheetName": "Projects" }
        ],
        "sampleRows": [{ "Task Title": "Design Mockups", "Is Completed": false, "Project": "Website Redesign" }]
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    
    if (!response.text) throw new Error("No system generated");
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Generate System Error:", error);
    throw error;
  }
};

/**
 * 2. Modify Table: Modifies schema of a single table.
 */
export const modifySheetSchema = async (
    userInstruction: string, 
    currentColumns: Column[], 
    sheetName: string
): Promise<{ type: 'ADD_COLUMN' | 'DELETE_COLUMN' | 'RENAME_COLUMN' | 'NO_ACTION', data: any, reply: string }> => {
    const ai = getClient();
    const colSummary = currentColumns.map(c => `${c.label} (${c.type})`).join(', ');

    const prompt = `
      Role: Database Admin.
      Context: Table "${sheetName}" has columns: [${colSummary}].
      User Request: "${userInstruction}"
      
      Task: Determine the single best schema change action.
      
      Output JSON Format:
      {
        "type": "ADD_COLUMN" | "DELETE_COLUMN" | "RENAME_COLUMN" | "NO_ACTION",
        "data": {
           // For ADD_COLUMN
           "label"?: "New Column Name",
           "columnType"?: "text" | "number" | "select" | "date" | "checkbox" | "switch" | "rating" | "email", 
           "options"?: [{"label": "Opt1", "color": "bg-blue-100 text-blue-700"}], // If select
           
           // For DELETE_COLUMN
           "label"?: "Column Name To Delete",
           
           // For RENAME_COLUMN
           "oldLabel"?: "Old Name",
           "newLabel"?: "New Name"
        },
        "reply": "Short conversational confirmation message."
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" },
        });
        if (!response.text) throw new Error("No schema change generated");
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Modify Schema Error", error);
        throw error;
    }
}

/**
 * 3. Fill Data: Generates new rows based on schema and instruction.
 */
export const generateSmartRows = async (
  columns: Column[],
  rows: RowData[],
  count: number = 10,
  userInstruction: string = ""
): Promise<RowData[]> => {
  const ai = getClient();
  
  // Prepare context
  const header = columns.map(c => {
      let desc = `${c.label} (Type: ${c.type})`;
      if (c.type === 'select' || c.type === 'multiSelect') {
          desc += ` Options: [${c.options?.map(o => o.label).join(', ')}]`;
      }
      return desc;
  }).join("\n");

  const dataSample = rows.slice(-3).map(row => {
    return JSON.stringify(row);
  }).join("\n");

  const prompt = `
    Role: Data Generator.
    Task: Generate exactly ${count} new realistic rows for this table.
    
    Table Schema (Strictly follow types and options):
    ${header}
    
    Existing Data (Style Reference):
    ${dataSample}

    User Instruction: "${userInstruction || "Generate realistic data."}"

    Output:
    Return a STRICT JSON array of objects.
    Keys MUST match the Column Labels exactly.
    Values must match the column type.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) throw new Error("No data generated");
  
  const newRowsRaw = JSON.parse(response.text);
  
  // Map Labels back to IDs
  const labelToId = columns.reduce((acc, col) => {
      acc[col.label] = col.id;
      return acc;
  }, {} as Record<string, string>);

  return newRowsRaw.map((row: any) => {
      const newRow: RowData = { id: crypto.randomUUID() };
      Object.keys(row).forEach(label => {
          const colId = labelToId[label];
          if (colId) {
              newRow[colId] = row[label];
          }
      });
      return newRow;
  });
};

/**
 * 4. Analyze Data: Generates insights and charts.
 */
export const analyzeDataset = async (columns: Column[], rows: RowData[]): Promise<AnalysisResult> => {
  const ai = getClient();
  
  // Cap data to avoid token limits. Increased to 100 based on user requirements.
  const dataSample = JSON.stringify(rows.slice(0, 100)); 
  const schema = columns.map(c => `${c.label} (${c.type})`).join(', ');

  const prompt = `
    Role: Data Analyst.
    Task: Analyze the following dataset and provide insights.
    
    Schema: ${schema}
    Data (Up to 100 rows): ${dataSample}
    
    Output JSON Format:
    {
      "summary": "A concise paragraph summarizing the dataset.",
      "keyTrends": ["Trend 1", "Trend 2", "Trend 3"],
      "suggestedChartType": "bar" | "line" | "pie" | "area"
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) throw new Error("No analysis generated");
  return JSON.parse(response.text);
};

/**
 * 5. Generate Document Content: Generates or refines HTML content for documents.
 */
export const generateDocumentContent = async (
  userPrompt: string,
  currentContent: string,
  mode: 'create' | 'refine'
): Promise<string> => {
  const ai = getClient();
  
  let prompt = "";
  if (mode === 'create') {
      prompt = `
        Role: Professional Document Writer.
        Task: Write a document section based on this request: "${userPrompt}".
        Context: The current document content is: "${currentContent ? currentContent.substring(0, 1000) : ''}..." (truncated).
        
        Output:
        Return HTML formatted content suitable for a WYSIWYG editor (e.g. <h1>, <p>, <ul>, <strong>).
        Do NOT include <html>, <head>, or <body> tags. Just the body content.
      `;
  } else {
      prompt = `
        Role: Professional Editor.
        Task: Refine or edit the following content based on this instruction: "${userPrompt}".
        
        Content to Edit:
        "${currentContent}"
        
        Output:
        Return the rewritten HTML content. Keep the formatting (HTML tags) where appropriate but improve the text.
        Do NOT include <html>, <head>, or <body> tags. Just the body content.
      `;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    if (!response.text) throw new Error("No content generated");
    
    // Cleanup markdown code blocks if present
    let text = response.text;
    if (text.startsWith('```html')) text = text.replace(/^```html/, '').replace(/```$/, '');
    else if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '');
    
    return text.trim();
  } catch (error) {
    console.error("Generate Document Error:", error);
    throw error;
  }
};

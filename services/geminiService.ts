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
    .filter(c => c.type === 'select' && c.options)
    .map(c => `Column '${c.label}' allows these values: ${c.options?.map(o => o.label).join(', ')}`)
    .join('. ');

  const prompt = `
    I have a dataset with the following columns: ${header}.
    ${optionsContext}
    Here are the most recent rows:
    ${dataSample}

    Generate ${count} new distinct, realistic rows that follow the same pattern and context.
    For 'select' columns, ONLY use the allowed values.
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
 * Generates columns and initial data based on a user prompt, supporting rich types.
 */
export const generateSheetFromPrompt = async (userPrompt: string): Promise<{ columns: Column[], rows: RowData[] }> => {
  const ai = getClient();

  const prompt = `Create a structured multidimensional dataset based on: "${userPrompt}".
  
  Output a JSON object with the following structure:
  {
    "columns": [
      { "id": "col1", "label": "Label", "type": "text", "options": [...] }
    ],
    "rows": [
      { "col1": "Value", "col2": "Value" }
    ]
  }

  Rules:
  1. Define columns with appropriate types: 'text', 'number', 'date', 'select', 'checkbox', 'rating', 'url', 'email', 'phone', 'person', 'location', 'image'.
  2. For 'select' types, you MUST provide an 'options' array with 'label' and a 'color' (use tailwind classes like 'bg-red-100 text-red-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800').
  3. Generate at least 5 rows of sample data matching these columns.
  4. If the user prompt is in Chinese, please generate column headers and data content in Chinese.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      // Removed strict responseSchema because 'rows' items are dynamic and Type.OBJECT requires concrete properties.
      // The prompt structure guidelines combined with JSON mode are sufficient.
    }
  });

  if (!response.text) throw new Error("Generation failed");
  const data = JSON.parse(response.text);
  
  // Ensure rows have IDs
  const rowsWithIds = data.rows ? data.rows.map((r: any) => ({ ...r, id: crypto.randomUUID() })) : [];
  
  return {
    columns: data.columns || [],
    rows: rowsWithIds
  };
};

import Groq from "groq-sdk";
import fs from "fs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert at reading Indian business challans (delivery notes/invoices).
Extract structured data from the challan image and return ONLY valid JSON — no markdown, no explanation.

JSON schema:
{
  "customerName": "string (name of customer/dealer/party)",
  "customerPhone": "string (phone number if visible, else empty string)",
  "date": "string (DD-MM-YYYY or DD/MM/YY format as written, else empty)",
  "billNo": "string (challan/bill number, else empty)",
  "paymentType": "item | cash | upi | neft",
  "items": [
    {
      "description": "string (item name)",
      "serialNumbers": ["array of serial numbers if listed, else empty array"],
      "qty": number,
      "unitPrice": number,
      "amount": number
    }
  ],
  "cash": number (amount received in cash, 0 if not a cash receipt),
  "returnAmount": number (returned amount if any, else 0),
  "upiRef": "string (UPI transaction ref if applicable)",
  "neftRef": "string (NEFT ref if applicable)",
  "remarks": "string (any other notes)"
}

Rules:
- If the challan is a cash/payment receipt set paymentType to "cash" and items to [].
- If UPI/NEFT receipt set paymentType accordingly.
- All numeric fields must be numbers (not strings).
- If a value is not visible leave it as empty string or 0.`;

/**
 * Extract challan data from an image file path using Groq vision.
 * @param {string} imagePath - Absolute path to the image file
 * @returns {Promise<Object>} Parsed challan data
 */
export async function extractChallanData(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString("base64");
  const ext = imagePath.split(".").pop()?.toLowerCase() || "jpeg";
  const mimeMap = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", gif: "gif", bmp: "bmp" };
  const mimeType = `image/${mimeMap[ext] || "jpeg"}`;

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          { type: "text", text: "Extract all challan data from this image as JSON." },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  });

  const raw = response.choices[0]?.message?.content || "{}";
  // Strip any markdown code fences the model might add despite instructions
  const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse Groq response:", raw);
    return {
      customerName: "",
      customerPhone: "",
      date: "",
      billNo: "",
      paymentType: "item",
      items: [],
      cash: 0,
      returnAmount: 0,
      upiRef: "",
      neftRef: "",
      remarks: "Parse error — please fill manually",
    };
  }
}

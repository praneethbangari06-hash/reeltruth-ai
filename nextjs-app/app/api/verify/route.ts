import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url, screenshotBase64 } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.error("Missing Gemini API Key in server variables.");
      return NextResponse.json({ 
        error: "Missing Gemini API Key! Please ensure you have added GEMINI_API_KEY in the AI Studio Secrets panel." 
      }, { status: 500 });
    }

    // Construct prompt
    let prompt = `Analyze this Reel/product verification request.`;
    if (url) {
      prompt += `\nThe Reels URL is: "${url}". Use this to infer information about possible claims or typical influencer promotions for this kind of product.`;
    }
    if (screenshotBase64) {
      prompt += `\nA screenshot image of the product is provided. Recognize and identify the real brand, model name, and physical product characteristics visible in the image. Fact-check any text overlay/OCR words present in the image against real consumer reviews.`;
    } else {
      prompt += `\nDirect URL query is requested. Fact-check typical influencer hype claims for this product brand and model name.`;
    }

    prompt += `\n\nGenerate fact-checking reports, trust levels, strengths/weaknesses and price matrix from internet consumer reviews. Use real database information if you know it, or estimate highly accurately based on consumer sentiments.
DO NOT use placeholder dummy values/text like "TWS buds pro" or classic examples unless they clearly match the actual product. Identify the REAL product.`;

    // Build contents with Multimodal Vision if image is present
    const parts: any[] = [{ text: prompt }];

    if (screenshotBase64) {
      const match = screenshotBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      } else {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: screenshotBase64
          }
        });
      }
    }

    // JSON schema for Gemini response
    const schema = {
      type: "OBJECT",
      properties: {
        detectedProduct: { type: "STRING" },
        brand: { type: "STRING" },
        model: { type: "STRING" },
        confidenceScore: { type: "INTEGER" },
        reelRealityScore: { type: "INTEGER" },
        productTrustScore: { type: "INTEGER" },
        influencerName: { type: "STRING" },
        influencerTrustScore: { type: "INTEGER" },
        influencerReviewedCount: { type: "INTEGER" },
        influencerAccurateCount: { type: "INTEGER" },
        strengths: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        weaknesses: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        scamAlerts: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        claims: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              claim: { type: "STRING" },
              reality: { type: "STRING" },
              isMisleading: { type: "BOOLEAN" }
}
          }
        },
        communityScore: { type: "NUMBER" },
        amazonRating: { type: "NUMBER" },
        redditSentiment: { type: "NUMBER" },
        youtubeSentiment: { type: "NUMBER" },
        alternatives: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              score: { type: "INTEGER" },
              price: { type: "STRING" }
            },
            required: ["name", "score", "price"]
          }
        },
        deals: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              store: { type: "STRING" },
              price: { type: "STRING" },
              url: { type: "STRING" },
              isCheapest: { type: "BOOLEAN" }
            },
            required: ["store", "price", "url", "isCheapest"]
          }
        }
      },
      required: [
        "detectedProduct", "brand", "model", "confidenceScore",
        "reelRealityScore", "productTrustScore", "influencerName",
        "influencerTrustScore", "influencerReviewedCount", "influencerAccurateCount",
        "strengths", "weaknesses", "scamAlerts", "claims", "communityScore",
        "amazonRating", "redditSentiment", "youtubeSentiment", "alternatives", "deals"
      ]
    };

    console.log("Calling Gemini API with model gemini-3.5-flash...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API response error state:", errorText);
      return NextResponse.json({ 
        error: `Gemini API response check failure. Please make sure your GEMINI_API_KEY is valid. Response: ${errorText}` 
      }, { status: response.status });
    }

    const payload = await response.json();
    console.log("Raw Gemini API response:", JSON.stringify(payload, null, 2));

    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error("No text returned by Gemini content creation candidate block.");
      return NextResponse.json({ 
        error: "Empty content from Gemini. No parts found." 
      }, { status: 422 });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Failed to parse Gemini output text as JSON! Content:", rawText);
      return NextResponse.json({ 
        error: "Internal JSON schema parse error." 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      source: "Gemini 3.5 Flash Native REST API",
      report: {
        id: url || `upload_${Date.now()}`,
        reelUrl: url || "Uploaded Image",
        timestamp: Date.now(),
        thumbnailUrl: screenshotBase64 || null,
        ...parsedData
      }
    });

  } catch (error: any) {
    console.error("Unexpected failure inside POST verify route: ", error);
    return NextResponse.json({ error: error.message || "Internal Server Failure" }, { status: 500 });
  }
}

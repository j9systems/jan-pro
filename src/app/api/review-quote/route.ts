import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a quality assurance reviewer for a commercial cleaning estimate. You receive the full quote data including all areas, their measurements, floor types, area types, unit items, the AI citations (what the salesperson actually said), and the recording transcript.

Your job is to identify potential issues, inconsistencies, or missing information that could affect the accuracy of the quote.

## What to check

1. **Measurement sanity**: Do the dimensions make sense for the area type? A restroom that's 100x100 ft is likely wrong. A hallway that's 5x5 ft is suspicious. Flag obvious data entry errors.

2. **Transcript vs. data mismatches**: Compare what the salesperson said (in the transcript and AI citations) against what was actually entered. If they said "about 20 by 15" but the area shows 200x15, flag it.

3. **Missing unit items**: If an area is a restroom but has no toilets/sinks/mirrors entered, flag it. If it's a break room with no refrigerators or sinks, note it. Use common sense for what fixtures an area type should typically have.

4. **Duplicate or redundant areas**: If two areas have the same name, floor type, and similar dimensions, they might be duplicates.

5. **Floor type sanity**: If an area is tagged as a restroom but has carpet flooring, that's unusual and worth flagging.

6. **Missing information**: Areas with no dimensions (0x0, 0 sqft) should be flagged. Areas with no name should be noted.

7. **Overall completeness**: If the transcript mentions areas that don't appear in the data, flag them as potentially missed.

8. **Positive confirmations**: If an area looks complete and consistent, mark it as verified so the user has confidence.

## Response Format

Return ONLY valid JSON, no markdown. Format:
{
  "flags": [
    {
      "type": "warning" | "info" | "success",
      "icon": "ruler" | "camera" | "mic" | "mappin" | "alert",
      "areaIndex": number_or_null,
      "areaName": "string",
      "title": "short title of the flag",
      "detail": "detailed explanation of the issue and what to check or fix"
    }
  ]
}

Rules:
- "warning" = likely error or significant issue that should be fixed
- "info" = suggestion or minor inconsistency worth reviewing
- "success" = area verified as complete and consistent
- areaIndex is zero-based, or null for general/cross-area flags
- Keep details concise but actionable
- Be helpful, not alarmist — phrase things as questions when uncertain
- Include at least one flag per area (even if it's a success confirmation)
- Put warnings first, then info, then success items`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { areas, transcript, facility } = await request.json();

    if (!areas || !Array.isArray(areas)) {
      return NextResponse.json(
        { error: "areas array is required" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Build detailed area descriptions for the review
    const areasDescription = areas.map((a: {
      areaName: string;
      sortOrder: number;
      floorType: string;
      areaType: string;
      lengthFt: number;
      widthFt: number;
      sqft: number;
      sqftTotal: number;
      quantity: number;
      unitItems: Record<string, number>;
      notes: string;
      aiCitations: Record<string, string>;
      photos: string[];
    }, i: number) => {
      const units = Object.entries(a.unitItems || {})
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const citations = Object.entries(a.aiCitations || {})
        .map(([k, v]) => `${k}: "${v}"`)
        .join("; ");

      return `[Area ${i}] "${a.areaName || `Area ${a.sortOrder}`}"
  Floor: ${a.floorType}, Type: ${a.areaType}
  Dimensions: ${a.lengthFt}ft × ${a.widthFt}ft = ${a.sqft} sqft (qty: ${a.quantity}, total: ${a.sqftTotal} sqft)
  Unit items: ${units || "none"}
  Notes: ${a.notes || "none"}
  Photos: ${a.photos?.length || 0}
  AI citations: ${citations || "none"}`;
    }).join("\n\n");

    const facilityInfo = facility
      ? `Facility: ${facility.type}, ${facility.employees} employees, ${facility.floors} floors, ${facility.restrooms} restrooms, ${facility.visitsPerWeek}x/week`
      : "";

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Review this commercial cleaning estimate for issues:\n\n${facilityInfo}\n\n${areasDescription}\n\n${transcript ? `Recording transcript:\n"${transcript}"` : "No recording transcript available."}\n\nAnalyze all areas and return your review flags as JSON.`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ flags: [] });
    }

    try {
      const parsed = JSON.parse(textBlock.text);
      return NextResponse.json(parsed);
    } catch {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json(parsed);
        } catch {
          return NextResponse.json({ flags: [] });
        }
      }
      return NextResponse.json({ flags: [] });
    }
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      { error: "Failed to review quote" },
      { status: 500 }
    );
  }
}

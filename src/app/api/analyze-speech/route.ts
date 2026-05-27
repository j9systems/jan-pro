import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SYSTEM_PROMPT = `You are an AI assistant helping a commercial cleaning salesperson capture facility areas during a walkthrough. You receive a transcript of their speech and must extract structured area data.

## Data Model

Each area represents ONE measured section of ONE floor type. A room with multiple floor types = multiple areas.

### Valid Floor Types (use exact values):
carpet, tile, hard_floor_lvt_vinyl, composite_flooring, laminate, stained_concrete, polished_concrete, hardwood, other

### Valid Area Types (use exact values):
office, conference_room, hallway_corridor, lobby_entry, restroom, classroom, medical_exam, production_plant, break_room_kitchen, stairwell, storage, common_area, other

### Valid Unit Items (use exact keys):
toilets, urinals, mirrors, sinks, small_sudums, large_sudums, partitions, blinds, windows, whiteboards, picture_frames, refrigerators, microwaves, mats, fryers, dishes_sinks, equipment_surfaces

## Fuzzy Matching Rules — Floor Types
- "carpet" or "carpeted" → carpet
- "tile" or "tiled" or "ceramic" or "ceramic tile" → tile
- "VCT" or "vinyl" or "LVT" or "vinyl plank" or "luxury vinyl" → hard_floor_lvt_vinyl
- "composite" → composite_flooring
- "laminate" → laminate
- "stained concrete" → stained_concrete
- "polished concrete" or "sealed concrete" → polished_concrete
- "concrete" (unspecified) → stained_concrete
- "wood" or "hardwood" → hardwood
- "terrazzo" → other (note: "terrazzo" in custom label)

## Fuzzy Matching Rules — Area Types
- "restroom" or "bathroom" or "washroom" → restroom
- "break room" or "kitchen" or "kitchenette" → break_room_kitchen
- "lobby" or "entry" or "reception" or "foyer" or "front desk" → lobby_entry
- "hallway" or "corridor" or "hall" → hallway_corridor
- "conference" or "meeting room" → conference_room
- "classroom" or "class room" → classroom
- "stairwell" or "stairs" or "staircase" → stairwell
- "showroom" or "sales floor" → common_area
- "gym" or "fitness" → common_area
- "sanctuary" or "worship" or "chapel" → common_area
- "exam room" → medical_exam
- "warehouse" or "plant" or "production" → production_plant

## Fuzzy Matching Rules — Unit Items & Extras
- "sudum" or "sudums" or "SUTM" or "SUTUM" → small_sudums (unless "large" or "Bradley" mentioned → large_sudums)
- "mat" or "mats" or "floor mat" or "entry mat" → mats (count them)
- "fryer" or "fryers" or "deep fryer" → fryers (count them)
- "dish" or "dishes" or "dish area" or "dish sink" or "commercial dish" → dishes_sinks
- "equipment" or "machines" or "equipment surfaces" → equipment_surfaces (count surfaces/items)
- "microwave" or "microwaves" → microwaves
- "refrigerator" or "fridge" or "fridges" → refrigerators

### Examples of extras extraction:
- "there are 3 floor mats at the entrance" → unitItems: { mats: 3 }
- "kitchen has 2 fryers and a commercial dish area" → unitItems: { fryers: 2, dishes_sinks: 1 }
- "9 microwaves in the break room" → unitItems: { microwaves: 9 }
- "lots of equipment surfaces, maybe 12 pieces" → unitItems: { equipment_surfaces: 12 }

## Dimension Extraction
- "30 by 20" or "30 x 20" or "30 feet by 20 feet" → lengthFt: 30, widthFt: 20
- "about 600 square feet" or "600 sqft" → sqft: 600, sqftOverride: true (direct sqft, no L×W)
- "47 identical classrooms" or "there are 47 of these" → quantity: 47

## Response Format

Return ONLY valid JSON, no markdown, no explanation. Every field you set MUST have a corresponding citation — the exact words from the transcript that led you to set that value.

Format:
{
  "actions": [
    {
      "type": "add_area",
      "area": {
        "areaName": "string",
        "floorType": "string (from valid list)",
        "areaType": "string (from valid list)",
        "lengthFt": number_or_0,
        "widthFt": number_or_0,
        "sqft": number_or_0,
        "sqftOverride": boolean,
        "quantity": number_default_1,
        "unitItems": { "key": count }
      },
      "citations": {
        "fieldName": "exact quote from transcript",
        "unitItems.key": "exact quote from transcript"
      }
    },
    {
      "type": "update_area",
      "areaIndex": number,
      "fields": { "fieldName": value },
      "citations": {
        "fieldName": "exact quote from transcript"
      }
    }
  ]
}

The "citations" object maps each field name to the verbatim snippet from the transcript. For unit items, use dotted keys like "unitItems.toilets". For dimensions, cite the part where length/width were mentioned. Keep citations short — just the relevant phrase, not the whole transcript.

## Important Rules
1. Only create add_area when the speaker clearly describes a NEW area/room/space.
2. Use update_area (with the index of the last relevant area) when the speaker adds details to an area they already described (e.g., "oh and it has 3 sinks" after describing a restroom).
3. If the speech is chit-chat, greetings, or not about facility areas, return { "actions": [] }.
4. Do NOT duplicate areas that already exist. Check the existing areas provided.
5. Be conservative — only extract what is clearly stated. Do not infer dimensions not spoken.
6. The areaIndex in update_area is zero-based, referring to the existing areas array.
7. ALWAYS extract extras like mats, fryers, microwaves, dishes, equipment when mentioned — these are critical for accurate time estimation.`;

export async function POST(request: Request) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { transcript, existingAreas } = await request.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Build a summary of existing areas for context
    const existingSummary = existingAreas?.length
      ? `\n\nExisting areas already captured (${existingAreas.length} total):\n${existingAreas
          .map(
            (a: { areaName: string; sortOrder: number; floorType: string; areaType: string; sqftTotal: number }, i: number) =>
              `[${i}] ${a.areaName || `Area ${a.sortOrder}`} — ${a.floorType}, ${a.areaType}, ${a.sqftTotal} sqft`
          )
          .join("\n")}`
      : "\n\nNo areas have been captured yet.";

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the transcript from the walkthrough so far:\n\n"${transcript}"${existingSummary}\n\nExtract any NEW area data or updates to existing areas from this transcript. Return JSON only.`,
        },
      ],
    });

    // Extract the text content from the response
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ actions: [] });
    }

    // Parse the JSON response
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
          return NextResponse.json({ actions: [] });
        }
      }
      return NextResponse.json({ actions: [] });
    }
  } catch (error) {
    console.error("Speech analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze speech" },
      { status: 500 }
    );
  }
}

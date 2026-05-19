// AI-powered resume analyzer using Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, declaredSkills } = await req.json();

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "resumeText is required (min 20 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert technical recruiter and ATS resume analyzer.
Analyze the candidate's resume against current tech market demands (2025).
Return:
- score: 0-100 ATS quality + market fit score
- extractedSkills: technical skills present in the resume (max 20)
- strongSkills: top 5 standout skills the candidate clearly demonstrates
- missingSkills: 4-6 high-demand skills the candidate is missing for their target roles
- summary: 1-2 sentence professional summary
- suggestedTitle: best fit job title for this candidate
- experience: Array of professional experience objects with duration, role, company, description, and skills.`;

    const userPrompt = `Candidate self-declared skills: ${(declaredSkills || []).join(", ") || "none"}

Resume content:
"""
${resumeText.slice(0, 8000)}
"""

Analyze and return structured output.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_resume_analysis",
                description: "Return the structured resume analysis",
                parameters: {
                  type: "object",
                  properties: {
                    score: { type: "number", minimum: 0, maximum: 100 },
                    extractedSkills: { type: "array", items: { type: "string" } },
                    strongSkills: { type: "array", items: { type: "string" } },
                    missingSkills: { type: "array", items: { type: "string" } },
                    summary: { type: "string" },
                    suggestedTitle: { type: "string" },
                    experience: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          duration: { type: "string" },
                          role: { type: "string" },
                          company: { type: "string" },
                          description: { type: "string" },
                          skills: { type: "array", items: { type: "string" } },
                        },
                        required: ["duration", "role", "company", "description", "skills"],
                      },
                    },
                  },
                  required: [
                    "score",
                    "extractedSkills",
                    "strongSkills",
                    "missingSkills",
                    "summary",
                    "suggestedTitle",
                    "experience",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_resume_analysis" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

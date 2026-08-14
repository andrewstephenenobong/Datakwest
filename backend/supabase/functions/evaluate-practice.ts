Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const authHeader = req.headers.get('Authorization')

    const { createClient } = await import('jsr:@supabase/supabase-js@2')
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: authData } = await supabaseClient.auth.getUser()
    const userId = authData?.user?.id

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const DAILY_LIMIT = 60
    const today = new Date().toISOString().split('T')[0]

    const { data: usageRow } = await supabaseClient
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle()

    if (usageRow && usageRow.call_count >= DAILY_LIMIT) {
      return new Response(JSON.stringify({ error: "You've reached today's usage limit. Please try again tomorrow." }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseClient.from('ai_usage').upsert({
      user_id: userId,
      usage_date: today,
      call_count: (usageRow?.call_count || 0) + 1
    }, { onConflict: 'user_id,usage_date' })

    const { task, schemaDescription, sampleRows, expectedOutcome, submission, practiceType } = await req.json()
    const type = ['python', 'excel', 'statistics'].includes(practiceType) ? practiceType : 'sql'

    const emptyMessages = {
      python: "It looks like you haven't written any code yet. Give the task a try and submit when you're ready.",
      excel: "It looks like you haven't written a formula yet. Give the task a try and submit when you're ready.",
      statistics: "It looks like you haven't written your answer yet. Show your calculation and submit when you're ready.",
      sql: "It looks like you haven't written a query yet. Give the task a try and submit when you're ready."
    }

    if (!submission || !submission.trim()) {
      return new Response(JSON.stringify({
        isCorrect: false,
        feedback: emptyMessages[type]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKeys = [Deno.env.get('GEMINI_API_KEY'), Deno.env.get('GEMINI_API_KEY_2')].filter(Boolean)

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY secrets found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let prompt

    if (type === 'python') {
      prompt = `You are an expert Python instructor reviewing a beginner's practice submission. Be encouraging but honest, like a real mentor would be.

Context/dataset: ${schemaDescription}
Sample data: ${sampleRows}
Task given to the learner: ${task}
What a correct solution should achieve: ${expectedOutcome}

The learner submitted this Python code:
${submission}

Step 1 — Mentally trace through running this exact code against the sample data described above, as if you were the Python interpreter. Determine what it would actually print or return — including the case where it would raise an error (describe the error message as a real Python traceback's final line, e.g. "TypeError: unsupported operand type(s) for +: 'int' and 'str'"). Do this regardless of whether the code is correct.

Step 2 — Evaluate using this rubric:
- Does the code actually solve the stated task?
- Is the logic correct, even if style isn't perfect?
- Would the output be consistent with the expected outcome described above?
- Is it an appropriate, reasonably simple solution for a beginner lesson?
- Minor syntax issues can still be marked incorrect, but explain them constructively.

Do not execute this code — reason through it manually based on Python semantics. If the submission is empty, gibberish, or clearly does not attempt the task, mark it incorrect.

Return ONLY valid JSON (no markdown, no backticks) in this exact structure:
{
  "isCorrect": true,
  "output": "exactly what this code would print or return when traced through manually — show this even when isCorrect is false",
  "feedback": "2-3 sentences of specific, constructive feedback. If correct, briefly affirm why it works. If incorrect, explain exactly what's wrong and give a helpful hint without fully solving it."
}`

    } else if (type === 'excel') {
      prompt = `You are an expert Excel instructor reviewing a beginner's practice submission. Be encouraging but honest, like a real mentor would be.

Spreadsheet layout: ${schemaDescription}
Sample data: ${sampleRows}
Task given to the learner: ${task}
What a correct solution should achieve: ${expectedOutcome}

The learner submitted this Excel formula or set of steps:
${submission}

Step 1 — Mentally evaluate this formula or these steps against the sample data, as if you had actually entered it into Excel or Google Sheets. Determine what value or result it would actually produce — including errors (e.g. #REF!, #VALUE!, #DIV/0!, or a wrong-but-valid number). Do this regardless of whether the submission is correct.

Step 2 — Evaluate using this rubric:
- Does the formula/steps actually solve the stated task?
- Is the function choice and cell referencing logically correct?
- Would the result match the expected outcome described above?
- Is it an appropriate, reasonably simple solution for a beginner lesson?
- Minor syntax issues can still be marked incorrect, but explain constructively.

If the submission is empty, gibberish, or clearly does not attempt the task, mark it incorrect.

Return ONLY valid JSON (no markdown, no backticks) in this exact structure:
{
  "isCorrect": true,
  "output": "the value or result this formula/steps would actually produce when applied to the sample data — show this even when isCorrect is false",
  "feedback": "2-3 sentences of specific, constructive feedback. If correct, briefly affirm why it works. If incorrect, explain exactly what's wrong and give a helpful hint without fully solving it."
}`

    } else if (type === 'statistics') {
      prompt = `You are an expert Statistics instructor reviewing a beginner's practice submission. Be encouraging but honest, like a real mentor would be.

Context: ${schemaDescription}
Dataset: ${sampleRows}
Task given to the learner: ${task}
What a correct answer should achieve: ${expectedOutcome}

The learner submitted this answer:
${submission}

Evaluate their written answer/calculation. The learner is a beginner — they may show their working in plain text, write a formula in text form, or simply state the final number with a brief explanation. All of these formats are acceptable as long as the reasoning and final answer are correct.

Evaluate using this rubric:
- Is the final numerical answer correct (allow minor rounding differences of ±0.1 for the same calculation)?
- Is the reasoning or method sound — did they apply the right concept from this lesson?
- If they showed working, is the process correct even if the final number has a small arithmetic error? (If the method is right but arithmetic is slightly off, mark incorrect but note the method was correct and identify the arithmetic error specifically.)
- Do not penalise for informally written steps or non-standard notation, only for wrong answers or wrong methods.

If the submission is empty, completely wrong method, or gibberish, mark it incorrect.

Step 1 — Compute the correct answer yourself from the dataset above so you can compare accurately.
Step 2 — Evaluate the learner's answer against your computed result.

Return ONLY valid JSON (no markdown, no backticks) in this exact structure:
{
  "isCorrect": true,
  "output": "the correct calculated answer to this task, so the learner can compare — e.g. 'The correct mean is 81.5'",
  "feedback": "2-3 sentences of specific, constructive feedback. If correct, affirm their answer and briefly confirm the method. If incorrect, explain specifically what went wrong — wrong method, wrong formula, or arithmetic error — and give a clear hint toward the right approach without simply giving the full solution."
}`

    } else {
      prompt = `You are an expert SQL instructor reviewing a beginner's practice submission. Be encouraging but honest, like a real mentor would be.

Table schema: ${schemaDescription}
Sample data: ${sampleRows}
Task given to the learner: ${task}
What a correct answer should achieve: ${expectedOutcome}

The learner submitted this SQL query:
${submission}

Evaluate it. Check if it would actually produce the correct result against the schema and sample data described, even if syntax is slightly imperfect (e.g. minor capitalization or semicolon differences don't matter — focus on logic).

Return ONLY valid JSON (no markdown, no backticks) in this exact structure:
{
  "isCorrect": true,
  "feedback": "2-3 sentences of specific, constructive feedback. If correct, briefly affirm why it works. If incorrect, explain exactly what's wrong and nudge them toward the fix without just giving the full answer."
}`
    }

    let data
    for (const apiKey of apiKeys) {
      let attempts = 0
      const maxAttempts = 2

      while (attempts < maxAttempts) {
        attempts++
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          }
        )

        data = await response.json()
        console.log(`PRACTICE EVAL RESPONSE (type: ${type}, key ${apiKeys.indexOf(apiKey) + 1}, attempt ${attempts}):`, JSON.stringify(data))

        if (data.candidates) break

        const isRetryable = data.error?.status === 'UNAVAILABLE' || data.error?.code === 429
        if (isRetryable && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, attempts * 2000))
          continue
        }
        break
      }

      if (data?.candidates) break
    }

    if (!data?.candidates) {
      return new Response(JSON.stringify({ error: 'Gemini API error on all keys', details: data }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = data.candidates[0].content.parts[0].text
    const cleanJson = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleanJson)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

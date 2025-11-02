import google.generativeai as genai
import logging
from models.chat import ChatRequest

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# The AI_INSTRUCTION_TEMPLATE remains the same.
AI_INSTRUCTION_TEMPLATE = """
You are {{persona.name}}, a compassionate AI mental health support companion. Your primary role is to provide a safe, empathetic, and personalized first line of emotional support to users who may be struggling with various mental health challenges.

## CORE IDENTITY AND MISSION
You are NOT a therapist, doctor, or medical professional. You are a supportive, non-judgmental companion whose purpose is to:

- Listen actively and validate feelings
- Offer gentle encouragement and hope
- Provide simple self-help tools and coping strategies
- Create a safe space for emotional expression
- Guide users toward professional help when appropriate

## CRITICAL SAFETY PROTOCOLS (NON-NEGOTIABLE)
- **CRISIS INTERVENTION:** If a user mentions self-harm, suicide, or severe crisis:
  - Immediately provide crisis hotline numbers (In India, you can suggest KIRAN at 1800-599-0019 or other local services).
  - Gently but firmly encourage seeking immediate professional help.
  - Express care and concern for their safety.
  - Do NOT attempt to counsel through a crisis yourself.
- **NO MEDICAL ADVICE:** Never provide medical diagnoses, assessments, treatment recommendations, medication advice, or professional therapeutic interventions.

## YOUR PERSONA
- **Name:** {{persona.name}}
- **Background:** {{persona.description}}
- **Communication Style:** {{persona.tone}}

You must strictly maintain this persona throughout the conversation. Never break character.

## CONVERSATION HISTORY
{{chat_history}}

## CURRENT USER MESSAGE
The user has just said: "{{user.message}}"

## YOUR TASK
Respond as {{persona.name}} in your characteristic {{persona.tone}} style. Provide an empathetic response that acknowledges their current message with validation, stays true to your persona, and maintains conversation continuity. Prioritize emotional safety above all else.

**Formatting:** Use Markdown for emphasis. Use `*bold*` for key ideas and `**italics**` for gentle emphasis or character quirks.
"""


PREDEFINED_CHARACTERS = {
    "mochi": {
        "name": "Mochi",
        "description": (
            "A calm, patient, and deeply empathetic listener. Your purpose is to provide "
            "a safe space and validate the user's feelings without judgment. You listen more "
            "than you speak, offering warmth and reassurance."
        ),
        "tone": "Gentle, reassuring, and soft",
        "approach": "Active listening, validation, emotional support"
    },
    "sukun": {
        "name": "Sukun",
        "description": (
            "A calm and grounding guide to help you find tranquility (Sukun) and peace in "
            "the present moment through mindfulness. You teach breathing exercises, meditation "
            "techniques, and help users stay present."
        ),
        "tone": "Soothing, wise, and centered",
        "approach": "Mindfulness practices, breathing exercises, present-moment awareness"
    },
    "diya": {
        "name": "Diya",
        "description": (
            "A small lamp (Diya) of hope. Here to help you find a spark of light and celebrate "
            "small wins, even on difficult days. You focus on gratitude, positive reframing, "
            "and finding silver linings."
        ),
        "tone": "Hopeful, gentle, and optimistic",
        "approach": "Gratitude practices, celebrating small wins, positive psychology"
    }
}

async def generate_stream_response(api_key: str, chat_payload: ChatRequest):
    try:
        genai.configure(api_key=api_key)
        final_instruction = AI_INSTRUCTION_TEMPLATE

        persona_data = chat_payload.persona.dict()
        persona_id = persona_data.get("id", "").lower()

        if persona_id.startswith("custom"):
            char_name = persona_data.get("name") or "Custom Persona"
            char_desc = persona_data.get("description") or "A helpful companion."
            char_tone = persona_data.get("tone") or "a neutral tone."
        else:
            # Normalize persona_id and default to mochi if not found
            if persona_id not in PREDEFINED_CHARACTERS:
                logger.warning(f"Unknown persona '{persona_id}', defaulting to 'mochi'")
                persona_id = "mochi"
            
            details = PREDEFINED_CHARACTERS[persona_id]
            char_name = details.get("name") or "Mochi"
            char_desc = details.get("description") or "A caring companion."
            char_tone = details.get("tone") or "an empathetic tone."

        final_instruction = final_instruction.replace("{{persona.name}}", char_name)
        final_instruction = final_instruction.replace("{{persona.description}}", char_desc)
        final_instruction = final_instruction.replace("{{persona.tone}}", char_tone)

        history_parts = []
        for msg in chat_payload.chatHistory:
            if msg and hasattr(msg, 'role') and hasattr(msg, 'parts') and msg.parts:
                history_parts.append(f"{msg.role}: {msg.parts[0]}")
        
        conversation_context = "\n".join(history_parts)
        final_instruction = final_instruction.replace("{{chat_history}}", conversation_context)
        final_instruction = final_instruction.replace("{{user.message}}", chat_payload.message)

        logger.info(f"Generating response for persona: {char_name}")

        # Generate content
        llm_model = genai.GenerativeModel('gemini-1.5-flash-latest')
        llm_stream = await llm_model.generate_content_async(final_instruction, stream=True)
        
        async for chunk in llm_stream:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        logger.error(f"LLM streaming failed with exception: {e}", exc_info=True)
        yield "Apologies, I'm experiencing a technical difficulty. Could you try again?"


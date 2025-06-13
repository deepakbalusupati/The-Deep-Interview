const { OpenAI } = require("openai");
const dotenv = require("dotenv");

try {
  dotenv.config();
} catch (error) {
  console.warn("Error loading .env file:", error.message);
}

// Check for OpenAI API key
const apiKey = process.env.OPENAI_API_KEY;
const isDevelopment = process.env.NODE_ENV !== "production";
let openai;

if (!apiKey || apiKey === "mock-key-for-development") {
  console.warn("WARNING: OPENAI_API_KEY is not set or using mock key");
  console.warn(
    "Using mock responses for development. Add your OpenAI API key to the .env file for real responses."
  );
} else {
  try {
    openai = new OpenAI({ apiKey });
    console.log("OpenAI API client initialized successfully");
  } catch (error) {
    console.error("Error initializing OpenAI client:", error.message);
  }
}

/**
 * Generate interview questions based on job position and skill level
 * @param {string} jobPosition - The job position
 * @param {string} skillLevel - The skill level (beginner, intermediate, expert)
 * @param {string} interviewType - The type of interview (technical, behavioral, etc.)
 * @param {Array} previousQuestions - Array of previously asked questions to avoid repetition
 * @returns {Promise<Object>} - Generated interview questions
 */
async function generateInterviewQuestions(
  jobPosition,
  skillLevel,
  interviewType,
  previousQuestions = []
) {
  try {
    // Always use mock data in development mode or if no API key
    if (isDevelopment || !openai) {
      console.log("Using mock interview questions for development");

      // Ensure we have a valid job position, skill level, and interview type
      const safeJobPosition = jobPosition || "Software Developer";
      const safeSkillLevel = skillLevel || "intermediate";
      const safeInterviewType = interviewType || "technical";

      return {
        questions: [
          {
            question: `[MOCK] As a ${safeSkillLevel} ${safeJobPosition}, how would you approach debugging a complex issue in production?`,
            expectedTopics:
              "Debugging techniques, monitoring tools, root cause analysis",
          },
          {
            question: `[MOCK] Can you explain your experience with the latest technologies in ${safeJobPosition} field?`,
            expectedTopics:
              "Technical knowledge, hands-on experience, learning approach",
          },
          {
            question: `[MOCK] How do you stay updated with the latest trends in ${safeJobPosition}?`,
            expectedTopics:
              "Learning resources, professional development, industry awareness",
          },
          {
            question: `[MOCK] Describe a challenging project you worked on and how you overcame obstacles.`,
            expectedTopics:
              "Problem-solving, teamwork, technical challenges, project management",
          },
          {
            question: `[MOCK] What metrics would you use to measure success in a ${safeJobPosition} role?`,
            expectedTopics:
              "Performance indicators, quality metrics, business impact",
          },
        ],
      };
    }

    // If we have a valid OpenAI client, use it
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert interviewer for ${jobPosition} positions. 
                    Generate 5 ${interviewType} interview questions appropriate for a ${skillLevel} level candidate.
                    The questions should be challenging but fair, and should help assess the candidate's suitability for the role.
                    Format the response as a JSON array of objects, each with 'question' and 'expectedTopics' fields.
                    'expectedTopics' should include key points that a good answer should cover.`,
        },
        {
          role: "user",
          content: `Generate 5 ${interviewType} interview questions for a ${skillLevel} ${jobPosition} position. 
                    Please avoid these previously asked questions: ${previousQuestions.join(
                      ", "
                    )}.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating interview questions:", error);

    // Fallback to mock data if API call fails
    return {
      questions: [
        {
          question: `[FALLBACK] Tell me about your experience as a ${
            jobPosition || "professional"
          }.`,
          expectedTopics: "Work experience, skills, achievements",
        },
        {
          question: "[FALLBACK] What are your strengths and weaknesses?",
          expectedTopics: "Self-awareness, honesty, growth mindset",
        },
      ],
    };
  }
}

/**
 * Evaluate candidate's response to an interview question
 * @param {string} question - The interview question
 * @param {string} response - The candidate's response
 * @param {string} expectedTopics - Key points that a good answer should cover
 * @param {string} jobPosition - The job position
 * @returns {Promise<Object>} - Evaluation of the response
 */
async function evaluateResponse(
  question,
  response,
  expectedTopics,
  jobPosition
) {
  try {
    // Always use mock data in development mode or if no API key
    if (isDevelopment || !openai) {
      console.log("Using mock evaluation response for development");
      return {
        score: 8,
        feedback:
          "[MOCK] Good response that covers most of the expected topics.",
        strengths: [
          "Clear communication",
          "Technical accuracy",
          "Structured answer",
        ],
        improvements: [
          "Could provide more specific examples",
          "Consider discussing alternative approaches",
        ],
      };
    }

    // If we have a valid OpenAI client, use it
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert interviewer for ${jobPosition} positions. 
                    Evaluate the candidate's response to the interview question and provide feedback.
                    Format the response as a JSON object with 'score' (1-10), 'feedback', 'strengths', and 'improvements' fields.`,
        },
        {
          role: "user",
          content: `Question: ${question}\n\nExpected topics to cover: ${expectedTopics}\n\nCandidate's response: ${response}\n\nPlease evaluate this response.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error evaluating response:", error);

    // Fallback to mock data if API call fails
    return {
      score: 7,
      feedback:
        "[FALLBACK] Your response was good but could be more comprehensive.",
      strengths: ["Good communication", "Relevant points"],
      improvements: [
        "Add more specific examples",
        "Elaborate on technical details",
      ],
    };
  }
}

/**
 * Analyze resume and generate personalized interview questions
 * @param {string} resumeText - The text content of the resume
 * @param {string} jobPosition - The job position
 * @returns {Promise<Object>} - Analysis and personalized questions
 */
async function analyzeResume(resumeText, jobPosition) {
  try {
    // Use mock data if in development mode and no API key
    if (isDevelopment && (!apiKey || apiKey === "your_api_key_here")) {
      console.log("Using mock resume analysis for development");
      return {
        analysis:
          "[MOCK] The candidate has a strong background in relevant technologies.",
        strengths: ["Technical skills", "Project experience", "Education"],
        areas_to_explore: ["Leadership experience", "Communication skills"],
        personalized_questions: [
          "Tell me about your experience with the technologies mentioned in your resume.",
          "How did you contribute to the projects listed on your resume?",
        ],
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert hiring manager for ${jobPosition} positions. 
                    Analyze the provided resume and generate personalized interview questions based on the candidate's background.
                    Also identify strengths, potential weaknesses, and gaps in the resume.
                    Format the response as a JSON object with 'analysis', 'strengths', 'areas_to_explore', and 'personalized_questions' fields.`,
        },
        {
          role: "user",
          content: `Job Position: ${jobPosition}\n\nResume:\n${resumeText}\n\nPlease analyze this resume and generate personalized interview questions.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error analyzing resume:", error);

    // Fallback to mock data if API call fails
    return {
      analysis: "[FALLBACK] Resume analysis unavailable.",
      strengths: ["Unable to determine"],
      areas_to_explore: ["General experience", "Skills"],
      personalized_questions: [
        "Could you walk me through your professional experience?",
        "What are your key skills relevant to this position?",
      ],
    };
  }
}

/**
 * Generate interview feedback summary
 * @param {Array} questionResponses - Array of question and response pairs with evaluations
 * @param {string} jobPosition - The job position
 * @returns {Promise<Object>} - Overall interview feedback and recommendations
 */
async function generateInterviewFeedback(questionResponses, jobPosition) {
  try {
    // Use mock data if in development mode and no API key
    if (isDevelopment && (!apiKey || apiKey === "your_api_key_here")) {
      console.log("Using mock interview feedback for development");
      return {
        overall_score: 8,
        summary:
          "[MOCK] The candidate performed well overall, demonstrating good technical knowledge and communication skills.",
        strengths: [
          "Technical expertise",
          "Problem-solving approach",
          "Clear communication",
        ],
        areas_for_improvement: [
          "Could provide more specific examples",
          "Consider discussing alternative approaches",
        ],
        recommendations: [
          "Practice more scenario-based questions",
          "Prepare more concrete examples",
        ],
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert hiring manager for ${jobPosition} positions. 
                    Generate comprehensive feedback for an interview based on the candidate's responses to various questions.
                    Format the response as a JSON object with 'overall_score' (1-10), 'summary', 'strengths', 'areas_for_improvement', and 'recommendations' fields.`,
        },
        {
          role: "user",
          content: `Job Position: ${jobPosition}\n\nInterview Responses:\n${JSON.stringify(
            questionResponses,
            null,
            2
          )}\n\nPlease generate overall interview feedback.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating interview feedback:", error);

    // Fallback to mock data if API call fails
    return {
      overall_score: 7,
      summary:
        "[FALLBACK] Interview feedback generation failed. This is a fallback response.",
      strengths: ["Unable to determine specific strengths"],
      areas_for_improvement: [
        "Unable to determine specific areas for improvement",
      ],
      recommendations: [
        "Review your responses",
        "Practice more interview questions",
      ],
    };
  }
}

module.exports = {
  generateInterviewQuestions,
  evaluateResponse,
  analyzeResume,
  generateInterviewFeedback,
};

const { OpenAI } = require("openai");
const dotenv = require("dotenv");

// Load environment variables safely
try {
  dotenv.config();
} catch (error) {
  console.warn("Error loading .env file:", error.message);
}

// Configuration and initialization
const apiKey = process.env.OPENAI_API_KEY;
const isDevelopment = process.env.NODE_ENV === "development";
const useMockData =
  !apiKey ||
  apiKey === "your_openai_api_key_here" ||
  apiKey === "mock-key-for-development";

let openai = null;

// Initialize OpenAI client if API key is available
if (!useMockData) {
  try {
    openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 2,
    });
    console.log("OpenAI API client initialized successfully");
  } catch (error) {
    console.error("Error initializing OpenAI client:", error.message);
    console.warn("Falling back to mock responses");
  }
} else {
  console.warn("WARNING: Using mock OpenAI responses");
  console.warn(
    "Reason:",
    !apiKey ? "No API key provided" : "Using placeholder/mock API key"
  );
  console.warn(
    "Add your OpenAI API key to the .env file for real AI responses"
  );
}

// Helper function to sanitize inputs
const sanitizeInput = (input, defaultValue = "", maxLength = 500) => {
  if (!input || typeof input !== "string") return defaultValue;
  return input.trim().substring(0, maxLength);
};

// Helper function to validate skill level
const validateSkillLevel = (skillLevel) => {
  const validLevels = ["beginner", "intermediate", "expert"];
  return validLevels.includes(skillLevel?.toLowerCase())
    ? skillLevel.toLowerCase()
    : "intermediate";
};

// Helper function to validate interview type
const validateInterviewType = (interviewType) => {
  const validTypes = [
    "technical",
    "behavioral",
    "mixed",
    "leadership",
    "cultural",
  ];
  return validTypes.includes(interviewType?.toLowerCase())
    ? interviewType.toLowerCase()
    : "mixed";
};

// Mock data generators for fallback scenarios
const generateMockQuestions = (jobPosition, skillLevel, interviewType) => {
  const safeJobPosition = sanitizeInput(jobPosition, "Software Engineer");
  const safeSkillLevel = validateSkillLevel(skillLevel);
  const safeInterviewType = validateInterviewType(interviewType);

  const questionPools = {
    technical: [
      {
        question: `How would you approach solving a complex scalability issue in a ${safeJobPosition} role?`,
        expectedTopics:
          "System design, performance optimization, scalability patterns, monitoring",
      },
      {
        question: `Explain a challenging technical problem you've solved and your approach to debugging it.`,
        expectedTopics:
          "Problem-solving methodology, debugging techniques, root cause analysis",
      },
      {
        question: `How do you stay updated with the latest technologies relevant to ${safeJobPosition}?`,
        expectedTopics:
          "Continuous learning, technology trends, professional development",
      },
      {
        question: `Describe your experience with testing strategies and quality assurance practices.`,
        expectedTopics:
          "Testing methodologies, automation, code quality, best practices",
      },
      {
        question: `What considerations do you make when designing a system for high availability?`,
        expectedTopics:
          "System reliability, fault tolerance, monitoring, disaster recovery",
      },
    ],
    behavioral: [
      {
        question: `Tell me about a time you had to work under pressure to meet a tight deadline.`,
        expectedTopics:
          "Time management, stress handling, prioritization, communication",
      },
      {
        question: `Describe a situation where you had to collaborate with difficult team members.`,
        expectedTopics:
          "Teamwork, conflict resolution, communication, leadership",
      },
      {
        question: `Give an example of when you had to learn something completely new for a project.`,
        expectedTopics:
          "Learning agility, adaptability, growth mindset, problem-solving",
      },
      {
        question: `Tell me about a mistake you made and how you handled it.`,
        expectedTopics:
          "Accountability, learning from failure, communication, improvement",
      },
      {
        question: `Describe a time when you had to convince others to adopt your idea or approach.`,
        expectedTopics: "Influence, communication, persuasion, leadership",
      },
    ],
    mixed: [
      {
        question: `Walk me through your background and how it relates to this ${safeJobPosition} position.`,
        expectedTopics:
          "Career progression, relevant experience, skills alignment, motivation",
      },
      {
        question: `What interests you most about working as a ${safeJobPosition} at our company?`,
        expectedTopics:
          "Company knowledge, role understanding, career goals, enthusiasm",
      },
      {
        question: `How do you approach learning new technologies or methodologies?`,
        expectedTopics:
          "Learning strategy, adaptability, curiosity, self-development",
      },
      {
        question: `Describe your ideal working environment and team dynamics.`,
        expectedTopics:
          "Work preferences, collaboration style, team fit, culture alignment",
      },
    ],
  };

  const selectedPool = questionPools[safeInterviewType] || questionPools.mixed;
  return selectedPool.slice(0, 5).map((q) => ({
    ...q,
    question: `[MOCK] ${q.question}`,
  }));
};

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
    // Input validation and sanitization
    const safeJobPosition = sanitizeInput(jobPosition, "Software Engineer");
    const safeSkillLevel = validateSkillLevel(skillLevel);
    const safeInterviewType = validateInterviewType(interviewType);
    const safePreviousQuestions = Array.isArray(previousQuestions)
      ? previousQuestions
      : [];

    console.log(
      `Generating ${safeInterviewType} questions for ${safeSkillLevel} ${safeJobPosition}`
    );

    // Use mock data if OpenAI is not available
    if (useMockData || !openai) {
      console.log("Using mock interview questions");
      return {
        questions: generateMockQuestions(
          safeJobPosition,
          safeSkillLevel,
          safeInterviewType
        ),
        source: "mock",
      };
    }

    // Prepare the prompt for OpenAI
    const systemPrompt = `You are an expert technical interviewer. Generate 5 ${safeInterviewType} interview questions for a ${safeSkillLevel} level ${safeJobPosition} position. 

Requirements:
- Questions should be appropriate for ${safeSkillLevel} level
- Focus on ${safeInterviewType} aspects
- Each question should be realistic and achievable
- Avoid questions that are too theoretical or impossible to answer
- Include both technical and practical elements

Return a JSON object with this structure:
{
  "questions": [
    {
      "question": "The actual interview question",
      "expectedTopics": "Key topics a good answer should cover"
    }
  ]
}`;

    const userPrompt =
      safePreviousQuestions.length > 0
        ? `Generate questions while avoiding these previously asked questions: ${safePreviousQuestions
            .slice(0, 10)
            .join(", ")}`
        : `Generate 5 diverse ${safeInterviewType} questions for the ${safeJobPosition} role.`;

    // Make the API call with timeout and retry logic
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using gpt-3.5-turbo for better reliability and cost
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OpenAI API timeout")), 25000)
      ),
    ]);

    // Parse and validate the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedResponse = JSON.parse(content);

    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Validate and clean the questions
    const validatedQuestions = parsedResponse.questions
      .filter((q) => q.question && q.expectedTopics)
      .slice(0, 5)
      .map((q) => ({
        question: sanitizeInput(q.question, "", 1000),
        expectedTopics: sanitizeInput(q.expectedTopics, "", 500),
      }));

    if (validatedQuestions.length === 0) {
      throw new Error("No valid questions in OpenAI response");
    }

    console.log(`Generated ${validatedQuestions.length} questions via OpenAI`);
    return {
      questions: validatedQuestions,
      source: "openai",
    };
  } catch (error) {
    console.error("Error generating interview questions:", error.message);

    // Fallback to mock questions
    console.log("Falling back to mock questions due to error");
    return {
      questions: generateMockQuestions(jobPosition, skillLevel, interviewType),
      source: "fallback",
      error: error.message,
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
    // Input validation
    const safeQuestion = sanitizeInput(question, "No question provided");
    const safeResponse = sanitizeInput(response, "No response provided", 2000);
    const safeExpectedTopics = sanitizeInput(
      expectedTopics,
      "General relevance"
    );
    const safeJobPosition = sanitizeInput(jobPosition, "Professional");

    // Generate a basic score based on response length and content
    const generateBasicScore = (response) => {
      const words = response.split(/\s+/).filter((word) => word.length > 0);
      const wordCount = words.length;

      if (wordCount < 10) return 3;
      if (wordCount < 30) return 5;
      if (wordCount < 50) return 6;
      if (wordCount < 100) return 7;
      return 8;
    };

    // Use mock evaluation if OpenAI is not available
    if (useMockData || !openai) {
      console.log("Using mock response evaluation");
      const basicScore = generateBasicScore(safeResponse);

      return {
        score: basicScore,
        feedback: `[MOCK] Your response demonstrates good understanding. You covered relevant points and showed clear thinking. Consider adding more specific examples and technical details to strengthen your answer.`,
        strengths: [
          "Clear communication",
          "Relevant content",
          "Good structure",
        ],
        improvements: [
          "Add more specific examples",
          "Include technical details",
          "Consider edge cases",
        ],
        source: "mock",
      };
    }

    // Prepare the evaluation prompt
    const systemPrompt = `You are an expert interviewer evaluating responses for ${safeJobPosition} positions. 

Provide a fair and constructive evaluation with:
- A score from 1-10 (1=poor, 5=average, 10=excellent)
- Constructive feedback (2-3 sentences)
- 2-3 specific strengths
- 2-3 areas for improvement

Return JSON in this format:
{
  "score": 7,
  "feedback": "Overall assessment...",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;

    const userPrompt = `Question: "${safeQuestion}"

Expected topics to cover: ${safeExpectedTopics}

Candidate's response: "${safeResponse}"

Please evaluate this response constructively.`;

    // Make the API call
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OpenAI API timeout")), 20000)
      ),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty evaluation response from OpenAI");
    }

    const evaluation = JSON.parse(content);

    // Validate the evaluation
    if (!evaluation.score || !evaluation.feedback) {
      throw new Error("Invalid evaluation format from OpenAI");
    }

    // Ensure score is within valid range
    evaluation.score = Math.max(
      1,
      Math.min(10, parseInt(evaluation.score) || 5)
    );
    evaluation.source = "openai";

    console.log(`Evaluated response with score: ${evaluation.score}`);
    return evaluation;
  } catch (error) {
    console.error("Error evaluating response:", error.message);

    // Fallback evaluation
    const fallbackScore = Math.max(
      1,
      Math.min(10, Math.floor(Math.random() * 4) + 5)
    ); // 5-8 range

    return {
      score: fallbackScore,
      feedback: `[FALLBACK] Thank you for your response. Your answer shows effort and thought. To improve, consider providing more specific examples and diving deeper into technical details where applicable.`,
      strengths: [
        "Shows understanding of the topic",
        "Communicates clearly",
        "Demonstrates thinking process",
      ],
      improvements: [
        "Add more specific examples",
        "Provide more technical depth",
        "Consider multiple perspectives",
      ],
      source: "fallback",
      error: error.message,
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

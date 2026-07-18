const dotenv = require('dotenv');
dotenv.config();

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
  }

  async callApi(prompt, systemInstruction = null, responseMimeType = null) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.');
    }
    const contents = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemInstruction) {
      contents.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const generationConfig = {};
    if (responseMimeType) {
      generationConfig.responseMimeType = responseMimeType;
    }

    if (Object.keys(generationConfig).length > 0) {
      contents.generationConfig = generationConfig;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contents)
      });

      if (!response.ok) {
        throw new Error(`Gemini API HTTP error! Status: ${response.status}`);
      }

      const resJson = await response.json();
      const candidates = resJson.candidates || [];
      if (candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        if (parts.length > 0) {
          return parts[0].text || '';
        }
      }
      return '';
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return '';
    }
  }

  async generateQuiz(subject, score, level) {
    const systemInstruction = 
      "You are an adaptive AI quiz generator for a Personalized Tutor System. " +
      "Generate a quiz consisting of exactly 5 multiple-choice questions on the specified subject. " +
      "Adjust the difficulty of the questions to match the student's current mastery level. " +
      "You must output the quiz as a valid JSON array of objects, where each object has these fields:\n" +
      "- 'question': the question text (string)\n" +
      "- 'options': an array of exactly 4 strings (options)\n" +
      "- 'correct_answer': the correct answer, which MUST match one of the items in the 'options' array exactly (string)\n" +
      "Do not include any wrapper text, markdown formatting, or HTML tags around the JSON.";

    const prompt = 
      `Generate a 5-question multiple choice quiz on the subject '${subject}'. ` +
      `The student's current mastery score is ${score}/100 and their level is '${level}'. ` +
      `Ensure the questions test appropriate concepts at this difficulty level.`;

    const rawResponse = await this.callApi(prompt, systemInstruction, 'application/json');
    try {
      return JSON.parse(rawResponse);
    } catch (error) {
      console.error('Failed to parse quiz JSON. Raw response was:', rawResponse, error);
      console.log(`Using smart local adaptive fallback generator for subject: ${subject}, level: ${level}`);
      return generateLocalQuizFallback(subject, level);
    }
  }

  async getTutorResponse(userMessage, chatHistory, userProfile, notesContext = null) {
    const systemInstruction = 
      "You are a friendly, encouraging, and highly intelligent Virtual AI Tutor. " +
      "Your goal is to help the student learn concepts, resolve doubts, and progress efficiently. " +
      "Keep your explanations clear, structured, and interactive. Use Markdown for styling (bolding, headers, code blocks). " +
      "Refer to the student's profile context to adapt your explanations. " +
      "If the student uploads notes/materials, use them as reference.";

    // Prepare profile context
    let profileStr = `Student Profile:\n- Username: ${userProfile.username}\n`;
    profileStr += "- Mastery Levels:\n";
    for (const mastery of userProfile.mastery || []) {
      profileStr += `  * ${mastery.subject}: ${mastery.score}/100 (${mastery.level})\n`;
    }

    // Add notes context if available
    let notesStr = '';
    if (notesContext) {
      notesStr = `\nRelevant Study Notes uploaded by Student:\n"""\n${notesContext}\n"""\n`;
    }

    // Format chat history
    let historyStr = '\nConversation History:\n';
    const recentHistory = chatHistory.slice(-6); // Include last 6 messages
    for (const h of recentHistory) {
      const senderLabel = h.sender === 'user' ? 'Student' : 'AI Tutor';
      historyStr += `${senderLabel}: ${h.message}\n`;
    }

    const prompt = 
      `${profileStr}${notesStr}${historyStr}` +
      `Student: ${userMessage}\n` +
      `AI Tutor:`;

    let response = await this.callApi(prompt, systemInstruction);
    if (!response || response.trim() === '') {
      console.log('Gemini API returned empty response or errored. Using local tutor fallback response.');
      response = generateLocalTutorFallback(userMessage);
    }
    return response;
  }

  async generateRecommendations(userProfile, weakSubjects) {
    const systemInstruction = 
      "You are a Personalized Recommendation Engine. Analyze the student's profile " +
      "and weakest subjects, then output a list of action items, study strategies, and concepts to focus on. " +
      "Output your recommendations in clean Markdown format with headers and bullet points.";

    let profileStr = "Mastery Profiles:\n";
    for (const m of userProfile.mastery || []) {
      profileStr += `- ${m.subject}: ${m.score}/100 (${m.level})\n`;
    }

    const prompt = 
      `Analyze this student profile:\n{profileStr}\n` +
      `Their weakest subjects are: ${weakSubjects.join(', ')}.\n` +
      "Generate actionable study recommendations, concepts they should review, and learning steps.";

    let response = await this.callApi(prompt, systemInstruction);
    if (!response || response.trim() === '') {
      console.log('Gemini API returned empty response or errored. Using local recommendations fallback.');
      response = `### Study Plan & Recommendations\n\nBased on your profile, here are some customized tips to improve:\n\n1. **Focus on Weak Subjects**: Spend more time reviewing courses and taking practice quizzes on **${weakSubjects.join(', ') || 'none identified yet'}**.\n2. **Gamified Streaks**: Keep your daily study streaks alive to earn achievement badges.\n3. **Chat Tutoring**: Ask your virtual tutor specific questions when you get quiz questions wrong.\n4. **Review Notes**: Review your uploaded study sheets under the materials section to reinforce key terms.`;
    }
    return response;
  }
}

// Local chatbot fallback generator
function generateLocalTutorFallback(message) {
  const msg = message.toLowerCase();
  
  if (msg.includes('quiz me') || msg.includes('test me') || msg.includes('practice question') || msg.includes('quiz')) {
    if (msg.includes('python')) {
      return "Sure! Let's test you on your Python study notes.\n\n**Question**: Which of the following statements is true about lists and tuples in Python?\n\n1. Lists are immutable, and tuples are mutable.\n2. Both lists and tuples are mutable.\n3. **Lists are mutable, and tuples are immutable.**\n4. Both lists and tuples are immutable.\n\nReply with the correct option number to see if you got it right!";
    }
    return "Sure! Let's test you on your study notes.\n\n**Question**: What is the primary benefit of studying using interactive concept summaries and testing?\n\n1. It helps reinforce learning through retrieval practice.\n2. It makes studying tedious.\n3. It takes longer than rereading text.\n4. None of the above.\n\nReply with the correct option number to see if you got it right!";
  }
  
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return "Hello! I am your virtual AI Tutor. I'm here to help you study Python, Web Development, Artificial Intelligence, and General Science. What topic would you like to explore today?";
  }
  
  if (msg.includes('python') || msg.includes('loop') || msg.includes('variable') || msg.includes('list') || msg.includes('mutable')) {
    return "Python is a powerful, readable programming language! \n\nHere is a quick recap of core Python concepts:\n\n* **Variables**: Created upon assignment, e.g., `my_var = 10`.\n* **Lists**: Mutable sequences defined with square brackets: `my_list = [1, 2, 3]`.\n* **Loops**: Iterate over collections using `for item in collection:`.\n\nWould you like me to show you a specific code example or write a loop?";
  }
  
  if (msg.includes('html') || msg.includes('css') || msg.includes('javascript') || msg.includes('web') || msg.includes('dom')) {
    return "Web Development involves building interfaces and full-stack services. \n\n* **HTML**: Provides structural markup (e.g. `<div>`, `<h1>`).\n* **CSS**: Handles layout and styling (e.g. Flexbox, Grid, colors).\n* **JavaScript**: Manages dynamic behavior, state, and DOM manipulation.\n\nIs there a specific concept like CSS flexbox or React state you'd like to work on?";
  }

  if (msg.includes('ai') || msg.includes('machine learning') || msg.includes('neural') || msg.includes('intelligence')) {
    return "Artificial Intelligence (AI) and Machine Learning (ML) are fields focused on teaching computers to recognize patterns. \n\n* **Supervised Learning**: Training models on labeled data (e.g. inputs and correct answers).\n* **Neural Networks**: Layered mathematical nodes inspired by biological brain neurons.\n* **Prompt Engineering**: Designing text inputs to guide generative models (like me!).\n\nWhat AI topic would you like to drill down into?";
  }

  if (msg.includes('science') || msg.includes('biology') || msg.includes('chemistry') || msg.includes('physics')) {
    return "General Science covers the foundational laws of the natural world. \n\n* **Scientific Method**: Observation, Hypothesis, Experimentation, and Conclusion.\n* **Matter**: Composed of atoms with protons, neutrons, and electrons.\n* **Photosynthesis**: How plants convert Carbon Dioxide and light into Oxygen and Energy.\n\nWhich scientific principle would you like to investigate?";
  }

  return "That is a great question! As your Virtual AI Tutor, I suggest reviewing the course lessons related to this topic. \n\nFeel free to ask me for definitions, short code snippets, or to write a practice question on a specific subject, and I will be happy to assist!";
}

// Local quiz fallback generator partitioned by subject & level
function generateLocalQuizFallback(subject, level) {
  const subj = subject.toLowerCase();
  const lvl = level.toLowerCase();
  
  if (subj.includes('python')) {
    if (lvl === 'intermediate') {
      return [
        {
          question: "Which data type is mutable in Python?",
          options: ["list", "tuple", "string", "int"],
          correct_answer: "list"
        },
        {
          question: "How do you define a function in Python?",
          options: ["def function_name():", "func function_name():", "function function_name()", "define function_name()"],
          correct_answer: "def function_name():"
        },
        {
          question: "Which keyword is used to skip the current iteration in a loop?",
          options: ["break", "pass", "continue", "return"],
          correct_answer: "continue"
        },
        {
          question: "What does list.append(x) do?",
          options: ["Removes an item from the list", "Adds an item to the end of the list", "Sorts the list", "Clears the list"],
          correct_answer: "Adds an item to the end of the list"
        },
        {
          question: "How do you handle exceptions in Python?",
          options: ["try ... except", "catch ... throw", "handle ... error", "try ... catch"],
          correct_answer: "try ... except"
        }
      ];
    } else if (lvl === 'advanced') {
      return [
        {
          question: "What is a decorator in Python?",
          options: [
            "A class that defines variable types",
            "A function that modifies the behavior of another function",
            "A built-in GUI theme component",
            "A formatting tool for string outputs"
          ],
          correct_answer: "A function that modifies the behavior of another function"
        },
        {
          question: "How does memory management work in Python?",
          options: [
            "Manual malloc and free commands",
            "Via reference counting and garbage collection",
            "Using a virtual swap file on the disk",
            "All variables are saved in permanent cache"
          ],
          correct_answer: "Via reference counting and garbage collection"
        },
        {
          question: "What is the purpose of __init__.py?",
          options: [
            "To launch the main execution thread",
            "To initialize a Python package directory",
            "To import global settings from configuration files",
            "To document classes in docstrings"
          ],
          correct_answer: "To initialize a Python package directory"
        },
        {
          question: "What is a generator in Python?",
          options: [
            "A script that auto-writes code templates",
            "A function that returns an iterator using yield",
            "A compiler that outputs native machine binaries",
            "An API integration connector"
          ],
          correct_answer: "A function that returns an iterator using yield"
        },
        {
          question: "What is the difference between __str__ and __repr__?",
          options: [
            "__str__ is for readable representation, __repr__ is for official representation",
            "__str__ is deprecated, __repr__ is modern",
            "__str__ is for numbers, __repr__ is for text strings",
            "There is no difference"
          ],
          correct_answer: "__str__ is for readable representation, __repr__ is for official representation"
        }
      ];
    } else {
      // Beginner
      return [
        {
          question: "What is the correct syntax to output 'Hello World' in Python?",
          options: ["print('Hello World')", "echo('Hello World')", "console.log('Hello World')", "System.out.println('Hello World')"],
          correct_answer: "print('Hello World')"
        },
        {
          question: "How do you insert comments in Python code?",
          options: ["# comment", "// comment", "/* comment */", "<!-- comment -->"],
          correct_answer: "# comment"
        },
        {
          question: "Which variable name is invalid in Python?",
          options: ["my_variable", "myVariable", "2variables", "_my_var"],
          correct_answer: "2variables"
        },
        {
          question: "What is the output of print(2 ** 3) in Python?",
          options: ["6", "8", "9", "5"],
          correct_answer: "8"
        },
        {
          question: "What is the correct file extension for Python files?",
          options: [".py", ".pt", ".pyt", ".python"],
          correct_answer: ".py"
        }
      ];
    }
  }
  
  if (subj.includes('web') || subj.includes('development')) {
    if (lvl === 'intermediate') {
      return [
        {
          question: "What does CSS stand for?",
          options: ["Cascading Style Sheets", "Creative Style System", "Computer Style Sheets", "Colorful Style Sheets"],
          correct_answer: "Cascading Style Sheets"
        },
        {
          question: "Which property is used to change the background color in CSS?",
          options: ["color", "bg-color", "background-color", "bgcolor"],
          correct_answer: "background-color"
        },
        {
          question: "How do you select an element with id 'demo' in CSS?",
          options: [".demo", "#demo", "demo", "*demo"],
          correct_answer: "#demo"
        },
        {
          question: "How do you create a function in JavaScript?",
          options: ["function myFunction()", "def myFunction()", "create myFunction()", "function:myFunction()"],
          correct_answer: "function myFunction()"
        },
        {
          question: "How do you call a function named 'myFunction' in JS?",
          options: ["call myFunction()", "myFunction()", "run myFunction()", "execute myFunction()"],
          correct_answer: "myFunction()"
        }
      ];
    } else if (lvl === 'advanced') {
      return [
        {
          question: "What is the Virtual DOM in React?",
          options: [
            "A direct reference to browser window elements",
            "A lightweight copy of the real DOM used to optimize updates",
            "A browser configuration setting",
            "An iframe layer used for security"
          ],
          correct_answer: "A lightweight copy of the real DOM used to optimize updates"
        },
        {
          question: "What is a closure in JavaScript?",
          options: [
            "Closing a web page tab safely",
            "A function that retains access to its lexical scope even when executed outside that scope",
            "A compilation process in the V8 engine",
            "A design pattern used to clear memory variables"
          ],
          correct_answer: "A function that retains access to its lexical scope even when executed outside that scope"
        },
        {
          question: "What is the difference between == and === in JavaScript?",
          options: [
            "== compares values with type coercion, === compares values and types strictly",
            "== is for numbers, === is for objects",
            "=== is deprecated",
            "There is no difference"
          ],
          correct_answer: "== compares values with type coercion, === compares values and types strictly"
        },
        {
          question: "What is CORS?",
          options: [
            "Computer Operating Resource Scheme",
            "Cross-Origin Resource Sharing mechanism",
            "Central Object Relational Storage",
            "Cookie Operating Rule Security"
          ],
          correct_answer: "Cross-Origin Resource Sharing mechanism"
        },
        {
          question: "What is the purpose of Promise.all() in JavaScript?",
          options: [
            "To catch all errors in try-catch blocks",
            "To execute multiple asynchronous operations in parallel and wait for all to resolve",
            "To resolve a single promise slowly",
            "To chain multiple synchronous functions"
          ],
          correct_answer: "To execute multiple asynchronous operations in parallel and wait for all to resolve"
        }
      ];
    } else {
      // Beginner
      return [
        {
          question: "What does HTML stand for?",
          options: ["Hyper Text Markup Language", "High Tech Markup Language", "Hyper Link Markup Language", "Home Tool Markup Language"],
          correct_answer: "Hyper Text Markup Language"
        },
        {
          question: "Which HTML element is used for the largest heading?",
          options: ["<h6>", "<heading>", "<h1>", "<head>"],
          correct_answer: "<h1>"
        },
        {
          question: "What is the correct HTML element for inserting a line break?",
          options: ["<lb>", "<break>", "<br>", "<line>"],
          correct_answer: "<br>"
        },
        {
          question: "Which character is used to indicate an end tag in HTML?",
          options: ["*", "/", "<", "^"],
          correct_answer: "/"
        },
        {
          question: "How can you make a numbered list in HTML?",
          options: ["<ul>", "<list>", "<ol>", "<dl>"],
          correct_answer: "<ol>"
        }
      ];
    }
  }

  if (subj.includes('ai') || subj.includes('artificial') || subj.includes('intelligence')) {
    if (lvl === 'intermediate') {
      return [
        {
          question: "What is a neural network inspired by?",
          options: ["The biological nervous system of the human brain", "A computer network wiring system", "A financial transaction ledger", "A database indexing system"],
          correct_answer: "The biological nervous system of the human brain"
        },
        {
          question: "What is the role of an activation function in a neural network?",
          options: ["To initialize weights", "To introduce non-linearity into the network", "To compile the model", "To scale the input size"],
          correct_answer: "To introduce non-linearity into the network"
        },
        {
          question: "What is overfitting in machine learning?",
          options: [
            "When a model trains too slowly",
            "When a model learns the training data too well, failing to generalize to new data",
            "When a model is too small for the dataset",
            "When data has too many columns"
          ],
          correct_answer: "When a model learns the training data too well, failing to generalize to new data"
        },
        {
          question: "What is supervised learning?",
          options: [
            "Training a model under human screen monitoring",
            "Training a model using labeled inputs and outputs",
            "Learning without any dataset labels",
            "A system that runs on hardware controls"
          ],
          correct_answer: "Training a model using labeled inputs and outputs"
        },
        {
          question: "What is a dataset?",
          options: ["A programming tool", "A structured collection of data used to train and test models", "A cloud server space", "An database indexing command"],
          correct_answer: "A structured collection of data used to train and test models"
        }
      ];
    } else if (lvl === 'advanced') {
      return [
        {
          question: "What is a Transformer model in deep learning?",
          options: [
            "A device that changes electrical voltage",
            "An architecture that uses self-attention mechanisms to process sequential data",
            "A model that transforms raw audio to text files",
            "An image editing convolutional filter"
          ],
          correct_answer: "An architecture that uses self-attention mechanisms to process sequential data"
        },
        {
          question: "What does gradient descent do?",
          options: [
            "Uploads model files to servers",
            "Optimizes model weights by minimizing the loss function",
            "Renders 3D graphics gradients",
            "Deletes weak neural network branches"
          ],
          correct_answer: "Optimizes model weights by minimizing the loss function"
        },
        {
          question: "What is the difference between L1 and L2 regularization?",
          options: [
            "L1 adds absolute value penalty (causes sparsity), L2 adds squared value penalty",
            "L1 is for classification, L2 is for regression",
            "L1 is faster, L2 uses more RAM",
            "L1 is linear, L2 is logarithmic"
          ],
          correct_answer: "L1 adds absolute value penalty (causes sparsity), L2 adds squared value penalty"
        },
        {
          question: "What is a GAN (Generative Adversarial Network)?",
          options: [
            "A network designed to route web traffic",
            "A system of two neural networks competing against each other to generate realistic synthetic data",
            "A database clustering system",
            "A security firewall rule list"
          ],
          correct_answer: "A system of two neural networks competing against each other to generate realistic synthetic data"
        },
        {
          question: "What is the attention mechanism in NLP?",
          options: [
            "A notification system for training logs",
            "A mechanism that allows models to focus on specific parts of the input sequence when generating output",
            "A CPU threads allocation utility",
            "A method to filter noise in datasets"
          ],
          correct_answer: "A mechanism that allows models to focus on specific parts of the input sequence when generating output"
        }
      ];
    } else {
      // Beginner
      return [
        {
          question: "What does AI stand for?",
          options: ["Artificial Intelligence", "Automated Integration", "Active Intelligence", "Advanced Interaction"],
          correct_answer: "Artificial Intelligence"
        },
        {
          question: "Which programming language is most commonly used for AI development?",
          options: ["HTML", "Python", "CSS", "SQL"],
          correct_answer: "Python"
        },
        {
          question: "What is the main goal of Machine Learning?",
          options: ["To program computers manually", "To enable computers to learn patterns from data", "To design faster CPU chips", "To format databases"],
          correct_answer: "To enable computers to learn patterns from data"
        },
        {
          question: "What is a chatbot?",
          options: ["A robot that cleans chat rooms", "An AI designed to simulate human conversation", "A high-speed networking cable", "A virus scanner utility"],
          correct_answer: "An AI designed to simulate human conversation"
        },
        {
          question: "What is data labeling?",
          options: ["Naming variables in code files", "Identifying raw data and adding tags to train models", "Organizing folder subdirectories", "Saving database files"],
          correct_answer: "Identifying raw data and adding tags to train models"
        }
      ];
    }
  }

  // General Science
  if (lvl === 'intermediate') {
    return [
      {
        question: "What is the process of water vapor turning into liquid water?",
        options: ["Evaporation", "Condensation", "Sublimation", "Freezing"],
        correct_answer: "Condensation"
      },
      {
        question: "Which force pulls objects toward the center of the Earth?",
        options: ["Magnetism", "Friction", "Gravity", "Inertia"],
        correct_answer: "Gravity"
      },
      {
        question: "What is the powerhouse of the cell?",
        options: ["Nucleus", "Mitochondria", "Ribosome", "Cytoplasm"],
        correct_answer: "Mitochondria"
      },
      {
        question: "What is the primary source of energy for Earth?",
        options: ["Coal deposits", "The Sun", "Wind currents", "Volcanoes"],
        correct_answer: "The Sun"
      },
      {
        question: "Which element has the chemical symbol 'O'?",
        options: ["Gold", "Oxygen", "Osmium", "Carbon"],
        correct_answer: "Oxygen"
      }
    ];
  } else if (lvl === 'advanced') {
    return [
      {
        question: "What is the main cause of ocean tides?",
        options: ["Earthquakes on the ocean floor", "The gravitational pull of the Moon and the Sun", "Wind speeds across continents", "Undersea volcanic eruptions"],
        correct_answer: "The gravitational pull of the Moon and the Sun"
      },
      {
        question: "What is Einstein's famous equation relating mass and energy?",
        options: ["E = mc^2", "F = ma", "V = IR", "P = IV"],
        correct_answer: "E = mc^2"
      },
      {
        question: "What is the speed of light in a vacuum?",
        options: ["Approximately 300,000 km/s", "Approximately 150,000 km/s", "Approximately 1,000,000 km/s", "Approximately 30,000 km/s"],
        correct_answer: "Approximately 300,000 km/s"
      },
      {
        question: "What is the main component of natural gas?",
        options: ["Oxygen", "Propane", "Methane", "Ethanol"],
        correct_answer: "Methane"
      },
      {
        question: "What is the first law of thermodynamics?",
        options: [
          "Energy cannot be created or destroyed, only transformed",
          "Entropy always increases in closed systems",
          "All processes stop at absolute zero temperature",
          "Force equals mass times acceleration"
        ],
        correct_answer: "Energy cannot be created or destroyed, only transformed"
      }
    ];
  } else {
    // Beginner
    return [
      {
        question: "What is the chemical symbol for water?",
        options: ["H2O", "CO2", "O2", "NaCl"],
        correct_answer: "H2O"
      },
      {
        question: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correct_answer: "Mars"
      },
      {
        question: "What gas do plants absorb during photosynthesis?",
        options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Helium"],
        correct_answer: "Carbon Dioxide"
      },
      {
        question: "What is the center of an atom called?",
        options: ["Neutron", "Proton", "Nucleus", "Electron"],
        correct_answer: "Nucleus"
      },
      {
        question: "What is the boiling point of pure water in Celsius?",
        options: ["90 degrees", "100 degrees", "120 degrees", "80 degrees"],
        correct_answer: "100 degrees"
      }
    ];
  }
}

module.exports = GeminiService;

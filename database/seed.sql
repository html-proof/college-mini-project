-- seed.sql
-- Seed initial records for Courses, Lessons, Quizzes, and Questions

-- Seed a default Teacher user (password: tutorpass123)
-- Hash generated using bcrypt ($2a$10$tZ2v/B3BfPzK48N.B9aCBej6pD3J/iB.d2H9U1B6nU0v3a1fPryI6)
INSERT INTO users (name, email, password_hash, role)
VALUES ('Dr. Sarah Connor', 'teacher@tutor.com', '$2a$10$tZ2v/B3BfPzK48N.B9aCBej6pD3J/iB.d2H9U1B6nU0v3a1fPryI6', 'teacher')
ON CONFLICT (email) DO NOTHING;

-- Get the inserted/existing teacher ID (usually 1 if first run)
-- Seed Courses
INSERT INTO courses (course_name, description, teacher_id)
VALUES 
('Python Programming', 'Learn standard Python programming including variables, data structures, loops, and OOP concepts.', 1),
('Web Development', 'Introduction to HTML, CSS, JavaScript, DOM manipulation, and full-stack development patterns.', 1),
('Artificial Intelligence', 'Fundamentals of machine learning, neural networks, computer vision, and prompt engineering.', 1),
('General Science', 'Core scientific principles spanning physics, chemistry, biology, and the scientific method.', 1)
ON CONFLICT (course_name) DO NOTHING;

-- Seed Lessons
INSERT INTO lessons (course_id, title, content, difficulty)
VALUES 
(1, 'Variables and Operators', 'In Python, variables are created when you assign a value to it. Operators are used to perform operations on variables.', 'Beginner'),
(2, 'HTML5 Structure', 'HTML is the standard markup language for Web pages. With HTML you can create your own Website.', 'Beginner'),
(3, 'Neural Networks Explained', 'A neural network is a method in artificial intelligence that teaches computers to process data in a way that is inspired by the human brain.', 'Beginner'),
(4, 'The Scientific Method', 'The scientific method is an empirical method for acquiring knowledge that has characterized the development of science since at least the 17th century.', 'Beginner');

-- Seed Quizzes
INSERT INTO quiz (lesson_id, difficulty)
VALUES 
(1, 'Beginner'),
(2, 'Beginner'),
(3, 'Beginner'),
(4, 'Beginner');

-- Seed Questions
-- Questions for Python Quiz (quiz_id = 1)
INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
VALUES
(1, 'Which data type is mutable in Python?', 'list', 'tuple', 'string', 'int', 'list'),
(1, 'How do you define a function in Python?', 'def function_name():', 'func function_name():', 'function function_name()', 'define function_name()', 'def function_name():'),
(1, 'What is the output of print(2 ** 3)?', '6', '8', '9', '5', '8'),
(1, 'Which keyword is used for loop control to skip the current iteration?', 'break', 'pass', 'continue', 'return', 'continue'),
(1, 'How do you insert comments in Python code?', '# comment', '// comment', '/* comment */', '<!-- comment -->', '# comment');

-- Questions for Web Dev Quiz (quiz_id = 2)
INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
VALUES
(2, 'What does HTML stand for?', 'Hyper Text Markup Language', 'High Tech Markup Language', 'Hyper Link Markup Language', 'Home Tool Markup Language', 'Hyper Text Markup Language'),
(2, 'Which HTML element is used for the largest heading?', '<h6>', '<heading>', '<h1>', '<head>', '<h1>'),
(2, 'What is the correct HTML element for inserting a line break?', '<lb>', '<break>', '<br>', '<line>', '<br>'),
(2, 'Which character is used to indicate an end tag in HTML?', '*', '/', '<', '^', '/'),
(2, 'How can you make a numbered list in HTML?', '<ul>', '<list>', '<ol>', '<dl>', '<ol>');

-- Questions for AI Quiz (quiz_id = 3)
INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
VALUES
(3, 'What does AI stand for?', 'Artificial Intelligence', 'Automated Integration', 'Active Intelligence', 'Advanced Interaction', 'Artificial Intelligence'),
(3, 'Which of the following is an AI programming language?', 'Python', 'HTML', 'CSS', 'JSON', 'Python'),
(3, 'What is the main goal of Machine Learning?', 'To program computers manually', 'To enable systems to learn from data', 'To design better CPUs', 'To create website layouts', 'To enable systems to learn from data'),
(3, 'What is a neural network inspired by?', 'The biological nervous system of the human brain', 'A computer network wiring system', 'A financial transaction ledger', 'A database indexing system', 'The biological nervous system of the human brain'),
(3, 'What is the role of an activation function in a neural network?', 'To initialize weights', 'To introduce non-linearity', 'To compile the model', 'To scale the input size', 'To introduce non-linearity');

-- Questions for General Science Quiz (quiz_id = 4)
INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
VALUES
(4, 'What is the chemical symbol for water?', 'H2O', 'CO2', 'O2', 'NaCl', 'H2O'),
(4, 'Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Mars'),
(4, 'What gas do plants absorb during photosynthesis?', 'Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Helium', 'Carbon Dioxide'),
(4, 'What is the center of an atom called?', 'Neutron', 'Proton', 'Nucleus', 'Electron', 'Nucleus'),
(4, 'What is the boiling point of pure water in Celsius?', '90 degrees', '100 degrees', '120 degrees', '80 degrees', '100 degrees');

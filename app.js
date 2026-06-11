const app = document.getElementById('app');

const examBank = {
  aws: {
    title: 'AWS Cloud Practitioner',
    description: 'Cover the fundamentals of AWS services, pricing, security, and architecture.',
    questions: [
      {
        prompt: 'Which AWS service is best for storing files that need to be accessed from many instances?',
        options: ['Amazon S3', 'Amazon RDS', 'Amazon EC2', 'Amazon CloudFront'],
        answer: 0,
      },
      {
        prompt: 'What is the main benefit of using AWS Auto Scaling?',
        options: ['Lowering data transfer costs', 'Automatically adjusting capacity', 'Creating SSL certificates', 'Reducing IAM permissions'],
        answer: 1,
      },
      {
        prompt: 'Which pillar is most closely related to reliability?',
        options: ['Cost Optimization', 'Performance Efficiency', 'Reliability', 'Security'],
        answer: 2,
      },
      {
        prompt: 'Which of the following is a managed relational database service?',
        options: ['Amazon DynamoDB', 'Amazon S3', 'Amazon RDS', 'AWS Lambda'],
        answer: 2,
      },
      {
        prompt: 'What does IAM help you manage?',
        options: ['Serverless functions', 'User access and permissions', 'Storage lifecycle rules', 'VPC routing tables'],
        answer: 1,
      },
    ],
  },
  az900: {
    title: 'AZ-900 Azure Fundamentals',
    description: 'Practice key Azure concepts such as cloud models, core services, and security.',
    questions: [
      {
        prompt: 'Which Azure service provides virtual machines?',
        options: ['Azure Functions', 'Azure Virtual Machines', 'Azure Blob Storage', 'Azure App Service'],
        answer: 1,
      },
      {
        prompt: 'What is Azure Active Directory now called?',
        options: ['Microsoft Entra ID', 'Azure IAM', 'Azure Security Center', 'Azure Policy'],
        answer: 0,
      },
      {
        prompt: 'Which cloud deployment model is shared by multiple organizations?',
        options: ['Private cloud', 'Public cloud', 'Hybrid cloud', 'On-premises'],
        answer: 1,
      },
      {
        prompt: 'What is the primary purpose of Azure Monitor?',
        options: ['To host websites', 'To collect and analyze telemetry', 'To manage DNS zones', 'To create virtual networks'],
        answer: 1,
      },
      {
        prompt: 'Which Azure feature helps protect resources with policy rules?',
        options: ['Azure Policy', 'Azure CDN', 'Azure Load Balancer', 'Azure App Insights'],
        answer: 0,
      },
    ],
  },
};

let state = {
  mode: 'login',
  currentUser: null,
  currentExam: null,
  currentQuestionIndex: 0,
  answers: [],
  score: 0,
  message: '',
  error: '',
};

function loadUsers() {
  return JSON.parse(localStorage.getItem('practiceExamUsers') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('practiceExamUsers', JSON.stringify(users));
}

function render() {
  app.innerHTML = '';
  if (!state.currentUser) {
    renderAuth();
    return;
  }

  if (state.currentExam) {
    renderExam();
    return;
  }

  renderDashboard();
}

function renderAuth() {
  const section = document.createElement('section');
  section.className = 'card auth-grid';
  section.innerHTML = `
    <div>
      <h2>${state.mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p class="small">${state.mode === 'login' ? 'Login to continue practicing' : 'Sign up to save your progress and scores'}</p>
      <form id="auth-form">
        ${state.mode === 'signup' ? `
          <div class="form-group">
            <label for="name">Full name</label>
            <input id="name" name="name" placeholder="Jordan Lee" required />
          </div>
        ` : ''}
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" placeholder="Enter a password" required />
        </div>
        <button type="submit" class="primary-btn">${state.mode === 'login' ? 'Log in' : 'Create account'}</button>
      </form>
      <div class="inline-actions">
        <span class="small">${state.mode === 'login' ? 'New here?' : 'Already have an account?'}</span>
        <button type="button" class="secondary-btn" id="toggle-mode">${state.mode === 'login' ? 'Create account' : 'Log in'}</button>
      </div>
      ${state.message ? `<p class="message">${state.message}</p>` : ''}
      ${state.error ? `<p class="error">${state.error}</p>` : ''}
    </div>
    <div class="card" style="background: rgba(79, 140, 255, 0.12);">
      <h3>Why learners use this app</h3>
      <ul class="small">
        <li>Track your progress per exam</li>
        <li>Practice AWS and Azure fundamentals</li>
        <li>Receive instant feedback after each submission</li>
      </ul>
    </div>
  `;
  app.appendChild(section);

  document.getElementById('toggle-mode').addEventListener('click', () => {
    state.mode = state.mode === 'login' ? 'signup' : 'login';
    state.message = '';
    state.error = '';
    render();
  });

  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const name = formData.get('name')?.toString().trim() || '';
  const email = formData.get('email')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';

  const users = loadUsers();

  if (state.mode === 'signup') {
    if (!name || !email || !password) {
      state.error = 'Please fill in all fields.';
      render();
      return;
    }
    const exists = users.some((user) => user.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      state.error = 'That email already exists. Try logging in instead.';
      render();
      return;
    }
    const user = { id: Date.now(), name, email, password, completedExams: {} };
    users.push(user);
    saveUsers(users);
    state.currentUser = user;
    state.message = 'Account created successfully.';
    render();
    return;
  }

  const match = users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password);
  if (!match) {
    state.error = 'Invalid email or password.';
    render();
    return;
  }

  state.currentUser = match;
  state.message = 'Logged in successfully.';
  render();
}

function renderDashboard() {
  const section = document.createElement('section');
  section.className = 'card';

  const completedExams = state.currentUser?.completedExams || {};

  section.innerHTML = `
    <div class="status-line">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h2>Welcome, ${state.currentUser.name}</h2>
      </div>
      <button class="secondary-btn" id="logout-btn">Log out</button>
    </div>
    <p class="small">Pick a practice exam and start building confidence for your next certification.</p>
    <div class="exam-grid">
      ${Object.entries(examBank).map(([key, exam]) => {
        const completed = completedExams[key];
        return `
          <div class="exam-card">
            <h3>${exam.title}</h3>
            <p>${exam.description}</p>
            <p class="small">${completed ? `Last score: ${completed.score}/${completed.total}` : 'Not attempted yet'}</p>
            <button class="primary-btn" data-start="${key}">Start exam</button>
          </div>
        `;
      }).join('')}
    </div>
  `;
  app.appendChild(section);

  document.getElementById('logout-btn').addEventListener('click', () => {
    state.currentUser = null;
    state.currentExam = null;
    state.currentQuestionIndex = 0;
    state.answers = [];
    state.score = 0;
    state.message = 'You have been logged out.';
    render();
  });

  app.querySelectorAll('[data-start]').forEach((button) => {
    button.addEventListener('click', () => {
      startExam(button.getAttribute('data-start'));
    });
  });
}

function startExam(examKey) {
  state.currentExam = examKey;
  state.currentQuestionIndex = 0;
  state.answers = [];
  state.score = 0;
  state.error = '';
  render();
}

function renderExam() {
  const exam = examBank[state.currentExam];
  const question = exam.questions[state.currentQuestionIndex];
  const section = document.createElement('section');
  section.className = 'card';

  const answered = state.answers[state.currentQuestionIndex];

  section.innerHTML = `
    <div class="status-line">
      <div>
        <p class="eyebrow">${exam.title}</p>
        <h2>${question.prompt}</h2>
      </div>
      <button class="secondary-btn" id="back-dashboard">Exit</button>
    </div>
    <p class="small">Question ${state.currentQuestionIndex + 1} of ${exam.questions.length}</p>
    <div>
      ${question.options.map((option, index) => `
        <button class="option-btn ${answered === index ? 'active' : ''}" data-choice="${index}">${String.fromCharCode(65 + index)}. ${option}</button>
      `).join('')}
    </div>
    <div class="progress-row">
      <button class="secondary-btn" id="prev-btn" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>Previous</button>
      ${state.currentQuestionIndex < exam.questions.length - 1 ? '<button class="primary-btn" id="next-btn">Next</button>' : '<button class="primary-btn" id="submit-btn">Submit</button>'}
    </div>
    ${state.message ? `<p class="message">${state.message}</p>` : ''}
    ${state.error ? `<p class="error">${state.error}</p>` : ''}
  `;
  app.appendChild(section);

  document.getElementById('back-dashboard').addEventListener('click', () => {
    state.currentExam = null;
    state.currentQuestionIndex = 0;
    state.answers = [];
    state.score = 0;
    state.message = '';
    render();
  });

  app.querySelectorAll('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const selected = Number(button.getAttribute('data-choice'));
      state.answers[state.currentQuestionIndex] = selected;
      render();
    });
  });

  document.getElementById('prev-btn')?.addEventListener('click', () => {
    if (state.currentQuestionIndex > 0) {
      state.currentQuestionIndex -= 1;
      render();
    }
  });

  document.getElementById('next-btn')?.addEventListener('click', () => {
    if (state.currentQuestionIndex < exam.questions.length - 1) {
      state.currentQuestionIndex += 1;
      render();
    }
  });

  document.getElementById('submit-btn')?.addEventListener('click', () => {
    if (state.answers.length < exam.questions.length) {
      state.error = 'Please answer every question before submitting.';
      render();
      return;
    }
    calculateScore();
  });
}

function calculateScore() {
  const exam = examBank[state.currentExam];
  const total = exam.questions.length;
  const correctAnswers = exam.questions.reduce((count, question, index) => {
    return count + (state.answers[index] === question.answer ? 1 : 0);
  }, 0);
  state.score = correctAnswers;

  const users = loadUsers();
  const userIndex = users.findIndex((user) => user.id === state.currentUser.id);
  if (userIndex >= 0) {
    users[userIndex].completedExams[state.currentExam] = {
      score: correctAnswers,
      total,
      completedAt: new Date().toLocaleString(),
    };
    saveUsers(users);
    state.currentUser = users[userIndex];
  }

  const percentage = Math.round((correctAnswers / total) * 100);
  app.innerHTML = '';
  const result = document.createElement('section');
  result.className = 'card';
  result.innerHTML = `
    <p class="eyebrow">Results</p>
    <h2>${exam.title} complete</h2>
    <p class="small">You scored ${correctAnswers}/${total} (${percentage}%).</p>
    <div class="result-box">
      ${percentage >= 80 ? 'Excellent work. You are ready for deeper review.' : percentage >= 60 ? 'Nice progress. Review the missed topics and try again.' : 'Keep practicing. Focus on the concepts you missed and retake the exam.'}
    </div>
    <div class="progress-row">
      <button class="primary-btn" id="retry-btn">Retry exam</button>
      <button class="secondary-btn" id="dashboard-btn">Back to dashboard</button>
    </div>
  `;
  app.appendChild(result);

  document.getElementById('retry-btn').addEventListener('click', () => startExam(state.currentExam));
  document.getElementById('dashboard-btn').addEventListener('click', () => {
    state.currentExam = null;
    render();
  });
}

render();

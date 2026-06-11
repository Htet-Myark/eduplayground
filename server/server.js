import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const useInMemoryStore = !process.env.DATABASE_URL;
const memoryUsers = [];

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  if (useInMemoryStore) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getUserByEmail(email) {
  if (useInMemoryStore) {
    return memoryUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function createUser(name, email, passwordHash) {
  if (useInMemoryStore) {
    const user = { id: Date.now(), name, email, password_hash: passwordHash, attempts: [] };
    memoryUsers.push(user);
    return user;
  }

  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name, email, passwordHash]
  );
  return result.rows[0];
}

async function getUserById(userId) {
  if (useInMemoryStore) {
    return memoryUsers.find((user) => user.id === Number(userId));
  }

  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

await initDb();

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Server running' });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, passwordHash);
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/exams', (_req, res) => {
  res.json({
    exams: [
      { id: 'aws', title: 'AWS Cloud Practitioner', description: 'Core AWS services, security, pricing, and architecture.' },
      { id: 'azure', title: 'Azure Fundamentals', description: 'Core Azure services, governance, and security.' },
      { id: 'kubernetes', title: 'Kubernetes Basics', description: 'Pods, deployments, services, and networking.' },
      { id: 'docker', title: 'Docker Essentials', description: 'Containers, images, networking, and volumes.' },
      { id: 'kids', title: 'Kids Riddle Quiz', description: 'Fun 10-question riddles with simple clues and answers for children.' },
    ],
  });
});

function buildQuestionSet(examId) {
  const templates = {
    kids: [
      { prompt: 'I have many fibers, my name is related to one body part in the hand, I am green in colour, and vegans can eat me. What am I?', options: ['Lady finger', 'Apple', 'Banana', 'Carrot'], answer: 0, explanation: 'Lady finger is a green vegetable that is often eaten by vegans.' },
      { prompt: 'I am yellow and curved. Monkeys love me. What am I?', options: ['Banana', 'Potato', 'Tomato', 'Cabbage'], answer: 0, explanation: 'Bananas are yellow, curved, and a favorite fruit for monkeys.' },
      { prompt: 'I am round and red. I can be used in salads and ketchup. What am I?', options: ['Tomato', 'Orange', 'Pear', 'Mango'], answer: 0, explanation: 'A tomato is red, round, and used in many foods.' },
      { prompt: 'I have a hard shell and a soft inside. People crack me open to eat. What am I?', options: ['Egg', 'Lemon', 'Onion', 'Pea'], answer: 0, explanation: 'An egg has a shell outside and soft food inside.' },
      { prompt: 'I am white and fluffy. I float in the sky. What am I?', options: ['Cloud', 'Stone', 'Tree', 'Book'], answer: 0, explanation: 'Clouds are white and fluffy and float in the sky.' },
      { prompt: 'I am a pet that barks and loves to play. What am I?', options: ['Dog', 'Fish', 'Bird', 'Horse'], answer: 0, explanation: 'Dogs are common pets that bark and enjoy playing.' },
      { prompt: 'I am small and yellow. I shine in the sky during the day. What am I?', options: ['Sun', 'Moon', 'Star', 'Cloud'], answer: 0, explanation: 'The sun is a bright yellow star that shines in the day.' },
      { prompt: 'I have four legs and a tail. I moo and give milk. What am I?', options: ['Cow', 'Sheep', 'Goat', 'Pig'], answer: 0, explanation: 'A cow is an animal that gives milk and says moo.' },
      { prompt: 'I am round and you can bounce me. What am I?', options: ['Ball', 'Spoon', 'Chair', 'Lamp'], answer: 0, explanation: 'A ball is round and can be bounced.' },
      { prompt: 'I have pages and words. Children read me for stories. What am I?', options: ['Book', 'Pen', 'Pencil', 'Table'], answer: 0, explanation: 'A book contains pages and words for reading stories.' },
    ],
    aws: [
      { prompt: 'Which AWS service is most commonly used to store static website assets?', options: ['Amazon S3', 'Amazon RDS', 'Amazon EC2', 'AWS Lambda'], answer: 0, explanation: 'Amazon S3 is designed for durable object storage and is a common choice for static website assets.' },
      { prompt: 'What is the main purpose of AWS IAM?', options: ['Run serverless functions', 'Manage access and permissions', 'Host databases', 'Route traffic'], answer: 1, explanation: 'IAM controls identity and access for users, groups, roles, and policies.' },
      { prompt: 'Which AWS service helps distribute traffic across multiple EC2 instances?', options: ['Elastic Load Balancing', 'CloudTrail', 'Amazon SNS', 'AWS Config'], answer: 0, explanation: 'Elastic Load Balancing distributes incoming traffic across healthy targets.' },
      { prompt: 'What is the primary purpose of Amazon EC2?', options: ['To run virtual servers', 'To monitor billing', 'To manage DNS zones', 'To store logs'], answer: 0, explanation: 'Amazon EC2 provides resizable compute capacity in the form of virtual servers.' },
      { prompt: 'Which AWS feature gives you a private network inside AWS?', options: ['Amazon VPC', 'Amazon SQS', 'AWS CloudTrail', 'AWS Shield'], answer: 0, explanation: 'Amazon VPC lets you create an isolated virtual network for your resources.' },
      { prompt: 'What does Amazon RDS manage for you?', options: ['Relational databases', 'Object storage', 'Email delivery', 'API gateways'], answer: 0, explanation: 'Amazon RDS provides managed relational database services for common engines such as PostgreSQL and MySQL.' },
      { prompt: 'Which service is best suited for event-driven serverless compute?', options: ['AWS Lambda', 'Amazon EFS', 'AWS Direct Connect', 'Amazon Inspector'], answer: 0, explanation: 'AWS Lambda runs code in response to events without provisioning servers.' },
      { prompt: 'What is the purpose of AWS CloudFront?', options: ['Content delivery and acceleration', 'Database backups', 'Directory synchronization', 'IAM role management'], answer: 0, explanation: 'CloudFront provides a global content delivery network for low-latency content delivery.' },
      { prompt: 'Which service is commonly used to queue messages between distributed systems?', options: ['Amazon SQS', 'AWS WAF', 'AWS VPN', 'Amazon Route 53'], answer: 0, explanation: 'Amazon SQS decouples components by buffering messages between producers and consumers.' },
      { prompt: 'What does AWS Auto Scaling help with?', options: ['Adjusting capacity based on demand', 'Enforcing encryption keys', 'Creating IAM policies', 'Monitoring CPU credits'], answer: 0, explanation: 'Auto Scaling helps maintain application availability by adding or removing capacity as demand changes.' },
    ],
    azure: [
      { prompt: 'What is Azure Active Directory now known as?', options: ['Microsoft Entra ID', 'Azure Policy', 'Azure Monitor', 'Azure Front Door'], answer: 0, explanation: 'Microsoft Entra ID is the current identity service for Azure and Microsoft 365.' },
      { prompt: 'Which Azure resource is used to host web applications?', options: ['Azure App Service', 'Azure Blob Storage', 'Azure SQL Database', 'Azure Kubernetes Service'], answer: 0, explanation: 'Azure App Service is a managed platform for hosting web apps.' },
      { prompt: 'What is the purpose of Azure Resource Groups?', options: ['Store backup files', 'Organize related Azure resources', 'Encrypt data at rest', 'Monitor DNS zones'], answer: 1, explanation: 'Resource groups help organize and manage related Azure resources together.' },
      { prompt: 'Which Azure service provides virtual machines?', options: ['Azure Virtual Machines', 'Azure Functions', 'Azure Data Lake', 'Azure CDN'], answer: 0, explanation: 'Azure Virtual Machines provides infrastructure as a service compute resources.' },
      { prompt: 'What is Azure Blob Storage mainly used for?', options: ['Unstructured object data', 'Relational databases', 'Virtual networks', 'Active directory federation'], answer: 0, explanation: 'Azure Blob Storage stores unstructured object data such as documents and media.' },
      { prompt: 'Which Azure feature helps enforce governance policies?', options: ['Azure Policy', 'Azure Monitor', 'Azure Key Vault', 'Azure Service Bus'], answer: 0, explanation: 'Azure Policy enables governance by enforcing rules and effects across resources.' },
      { prompt: 'What does Azure Monitor help you do?', options: ['Collect and analyze telemetry', 'Manage DNS zones', 'Deploy web apps', 'Create virtual private networks'], answer: 0, explanation: 'Azure Monitor collects and analyzes telemetry from Azure resources.' },
      { prompt: 'Which service is used to store secrets securely?', options: ['Azure Key Vault', 'Azure CDN', 'Azure Front Door', 'Azure Backup'], answer: 0, explanation: 'Azure Key Vault stores and manages secrets, keys, and certificates securely.' },
      { prompt: 'What is one key benefit of Azure Availability Zones?', options: ['High availability and fault isolation', 'Lower storage costs', 'Simplified IAM', 'Faster DNS propagation'], answer: 0, explanation: 'Availability Zones provide isolation and redundancy for high availability architectures.' },
      { prompt: 'Which Azure platform is designed for container orchestration?', options: ['Azure Kubernetes Service', 'Azure SQL Database', 'Azure Table Storage', 'Azure CDN'], answer: 0, explanation: 'AKS provides managed Kubernetes orchestration for containerized applications.' },
    ],
    kubernetes: [
      { prompt: 'What is a Kubernetes Pod?', options: ['A container image', 'A group of one or more containers', 'A network rule', 'A storage volume'], answer: 1, explanation: 'A Pod is the smallest deployable unit in Kubernetes and can host one or more containers.' },
      { prompt: 'What does a Kubernetes Deployment manage?', options: ['Static IP addresses', 'Replica sets and rollout state', 'Virtual machines', 'DNS records'], answer: 1, explanation: 'Deployments manage rollout of ReplicaSets and desired replica counts.' },
      { prompt: 'Which Kubernetes object exposes an application internally or externally?', options: ['Service', 'ConfigMap', 'Secret', 'Namespace'], answer: 0, explanation: 'A Service provides stable networking and access to a set of Pods.' },
      { prompt: 'What is the role of a Kubernetes Namespace?', options: ['Isolates resources within a cluster', 'Stores images', 'Maps hostnames', 'Runs pods on GPU nodes'], answer: 0, explanation: 'Namespaces provide isolation and organization for resources in a cluster.' },
      { prompt: 'What does a Kubernetes ConfigMap store?', options: ['Configuration data', 'Encrypted passwords', 'Persistent volumes', 'Cluster certificates'], answer: 0, explanation: 'ConfigMaps store non-sensitive configuration data for applications.' },
      { prompt: 'What is a StatefulSet typically used for?', options: ['Stateful applications with stable identity', 'Temporary batch jobs', 'Load balancer configuration', 'DNS resolution'], answer: 0, explanation: 'StatefulSets manage stateful applications that need stable identities and persistent storage.' },
      { prompt: 'Which Kubernetes resource is used for persistent storage?', options: ['PersistentVolumeClaim', 'Service', 'ReplicaSet', 'Job'], answer: 0, explanation: 'PersistentVolumeClaims request storage resources for pods.' },
      { prompt: 'What does a Kubernetes Ingress help with?', options: ['HTTP routing into the cluster', 'Container image build', 'Cluster backup', 'Runtime scheduling'], answer: 0, explanation: 'Ingress resources manage external access to services through HTTP and HTTPS routing.' },
      { prompt: 'What is the purpose of a Kubernetes Secret?', options: ['Store sensitive data', 'Create replica sets', 'Route network traffic', 'Split namespaces'], answer: 0, explanation: 'Secrets store confidential data such as tokens and passwords.' },
      { prompt: 'What does kubectl apply do?', options: ['Apply a desired configuration to a cluster', 'Delete all containers', 'Create a Dockerfile', 'Start a virtual machine'], answer: 0, explanation: 'kubectl apply updates resources in the cluster to match a declared configuration.' },
    ],
    docker: [
      { prompt: 'What does Docker build an image from?', options: ['A Dockerfile', 'A YAML manifest', 'A shell script', 'An API key'], answer: 0, explanation: 'A Dockerfile contains the instructions used to build a container image.' },
      { prompt: 'What is a Docker container?', options: ['A virtual machine host', 'A running instance of an image', 'A backup archive', 'A package manager'], answer: 1, explanation: 'A container is a runnable instance created from a Docker image.' },
      { prompt: 'What is the purpose of a Docker volume?', options: ['Persist data beyond the container lifecycle', 'Increase CPU speed', 'Share secrets publicly', 'Replace networking'], answer: 0, explanation: 'Volumes provide persistent storage for containers across restarts and recreation.' },
      { prompt: 'What is the purpose of the docker run command?', options: ['Create and start a container', 'Build a new image', 'Remove unused files', 'Create a network bridge'], answer: 0, explanation: 'docker run creates and starts a container based on an image.' },
      { prompt: 'What is a Docker image?', options: ['A read-only template for containers', 'A host operating system', 'A network policy', 'A volume mount'], answer: 0, explanation: 'A Docker image is a static snapshot used to create containers.' },
      { prompt: 'What is the purpose of docker-compose?', options: ['Define and run multi-container applications', 'Build Kubernetes clusters', 'Manage cloud storage', 'Secure SSH keys'], answer: 0, explanation: 'Docker Compose helps define and run multi-container applications through a YAML file.' },
      { prompt: 'What does the EXPOSE instruction do in a Dockerfile?', options: ['Document which port the container listens on', 'Delete the image cache', 'Create a persistent volume', 'Install a package manager'], answer: 0, explanation: 'EXPOSE documents the port that a container will listen on at runtime.' },
      { prompt: 'What is the main difference between an image and a container?', options: ['An image is a template; a container is a running instance', 'A container is immutable; an image is mutable', 'A container stores code; an image stores logs', 'An image runs applications; a container does not'], answer: 0, explanation: 'An image is a static blueprint while a container is a running instance created from that image.' },
      { prompt: 'Why would you use a Docker network?', options: ['To allow containers to communicate securely', 'To accelerate CPU performance', 'To replace the host OS', 'To persist logs permanently'], answer: 0, explanation: 'Docker networks enable containers to communicate with each other and with the host.' },
      { prompt: 'What does the COPY instruction do in a Dockerfile?', options: ['Copy files from the host into the image', 'Start the container automatically', 'Remove old layers', 'Expose a port to the internet'], answer: 0, explanation: 'COPY adds files from the build context into the image filesystem.' },
    ],
  };

  const baseQuestions = templates[examId] || [];
  if (!baseQuestions.length) return [];

  return Array.from({ length: 50 }, (_, index) => {
    const base = baseQuestions[index % baseQuestions.length];
    return {
      ...base,
      prompt: `${base.prompt} (Practice ${index + 1})`,
      explanation: `${base.explanation} This item is part of the ${examId.toUpperCase()} practice set.`,
    };
  });
}

app.get('/api/exams/:examId/questions', (req, res) => {
  const { examId } = req.params;
  const questions = buildQuestionSet(examId);
  const limited = examId === 'kids' ? questions.slice(0, 10) : questions;
  res.json({ questions: limited });
});

app.get('/api/users/:userId/records', async (req, res) => {
  const user = await getUserById(req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ records: user.attempts || [] });
});

app.post('/api/exams/:examId/submit', async (req, res) => {
  const { examId } = req.params;
  const { userId, score, total, percentage, review } = req.body;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const attempt = {
    id: Date.now(),
    examId,
    score,
    total,
    percentage,
    completedAt: new Date().toISOString(),
    review,
  };

  user.attempts = user.attempts || [];
  user.attempts.push(attempt);

  res.json({ success: true, records: user.attempts });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

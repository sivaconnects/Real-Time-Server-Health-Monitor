# 📡 Real-Time Server Health Monitor

A real-time server monitoring dashboard built with **pure Node.js**. Shows live CPU, memory, disk, and system metrics on a clean web dashboard — auto refreshes every 2 seconds.

> Built as part of my DevOps learning journey — deployed on **AWS EC2**.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=flat-square&logo=node.js)
![AWS EC2](https://img.shields.io/badge/Deployed%20on-AWS%20EC2-orange?style=flat-square&logo=amazon-aws)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen?style=flat-square)

---

## 📸 Preview

![Server Health Monitor Dashboard](https://github.com/sivaconnects/Real-Time-Server-Health-Monitor/blob/main/Screenshot%202026-02-25%20115231.png)

---

## ✨ What It Shows

- ✅ Live CPU, Memory and Disk usage
- ✅ Per-core CPU breakdown
- ✅ CPU history chart
- ✅ System uptime and process info
- ✅ Auto alert when resources cross 85%

---

## 💻 Run On Your Local Machine

Follow these steps one by one 👇

### Step 1 — Install Node.js

> Node.js is the runtime that runs our app. Install it based on your OS.

**Ubuntu / Debian:**
```bash
sudo apt update -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs
```
Check if Node.js installed correctly:
```bash
node -v
npm -v
```
You should see version numbers printed. ✅

---

### Step 2 — Install Git

> Git is used to download (clone) the project to your machine.

**Ubuntu / Debian:**
```bash
sudo apt install -y git
```
---

### Step 3 — Download the Project

```bash
git clone https://github.com/sivaconnects/Real-Time-Server-Health-Monitor.git
```

Go into the project folder:
```bash
cd Real-Time-Server-Health-Monitor
```

---

### Step 4 — Start the App

```bash
node app.js
```

You should see this in the terminal:
```
🚀 Server Health Monitor
📡 Dashboard → http://localhost:3000
```

---

### Step 5 — Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

You will see the live dashboard. 🎉

> To stop the app press `Ctrl + C` in the terminal.

---

## ☁️ Deploy on AWS EC2

> EC2 is a virtual server on AWS. Follow these steps to run the app on the cloud so anyone can access it from anywhere.

### Step 1 — Create an EC2 Instance

1. Login to [AWS Console](https://aws.amazon.com/console/)
2. Go to **EC2** → Click **"Launch Instance"**
3. Fill in the details:
   - Name: `server-health-monitor`
   - AMI: **Amazon Linux 2023**
   - Instance type: **t2.micro** *(free tier)*
4. Under **Key pair** → click **"Create new key pair"** → download the `.pem` file and save it safely
5. Under **Security Group** → Add these rules:

| Port | Purpose |
|---|---|
| 22 | SSH — to connect to the server |
| 3000 | App — to open in browser |

6. Click **"Launch Instance"**

---

### Step 2 — Connect to Your EC2 Server

> SSH lets you control your EC2 server from your local terminal.

Open your terminal and run:

**Mac / Linux:**
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@<YOUR_EC2_PUBLIC_IP>
```

> Replace `<YOUR_EC2_PUBLIC_IP>` with the IP shown in your EC2 dashboard.

---

### Step 3 — Install Git on EC2

```bash
sudo yum install -y git
```

---

### Step 4 — Install Node.js on EC2

```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

---

### Step 5 — Download and Run the App

```bash
git clone https://github.com/sivaconnects/Real-Time-Server-Health-Monitor.git
cd Real-Time-Server-Health-Monitor
node app.js
```

Now open your browser and visit:
```
http://<YOUR_EC2_PUBLIC_IP>:3000
```

Your dashboard is live on the internet! 🎉

---

### Step 6 — Keep the App Running 24/7 with PM2

> By default the app stops when you close the terminal. PM2 keeps it running in the background.

```bash
# Install PM2
sudo npm install -g pm2

# Start the app with PM2
pm2 start app.js --name "health-monitor"

# Make it auto start when EC2 reboots
pm2 startup
pm2 save
```

Useful PM2 commands:
```bash
pm2 list              # see running apps
pm2 logs              # see live logs
pm2 restart health-monitor
pm2 stop health-monitor
```

---

## 🐛 Something Not Working?

| Problem | Fix |
|---|---|
| `node: command not found` | Node.js is not installed — redo Step 1 |
| `git: command not found` | Git is not installed — redo Step 2 |
| Can't SSH into EC2 | Run `chmod 400 your-key.pem` first |
| App opens but browser shows nothing | Make sure port 3000 is open in EC2 Security Group |
| App stops when terminal closes | Use PM2 — follow Step 6 |
| Port already in use | Run `kill $(lsof -t -i:3000)` then restart |

---


# 📡 Real-Time Server Health Monitor

A lightweight, real-time server monitoring dashboard built with **pure Node.js** — no frameworks, no external dependencies. Streams live CPU, memory, disk, and system metrics to a clean web dashboard using **Server-Sent Events (SSE)**.

> 🚀 Built as part of my DevOps learning journey — deployed on **AWS EC2**.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=flat-square&logo=node.js)
![AWS EC2](https://img.shields.io/badge/Deployed%20on-AWS%20EC2-orange?style=flat-square&logo=amazon-aws)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen?style=flat-square)

---

## 🖥️ Features

- **Live CPU usage** — per-core breakdown + average with real delta calculation (same method as `htop`)
- **Memory metrics** — heap used vs total, percentage with color-coded thresholds
- **Disk usage** — real disk read via `df` command
- **CPU history sparkline** — 40-point live graph drawn with HTML5 Canvas
- **Load average** — 1 min / 5 min / 15 min system load
- **Smart alerts** — warning banner auto-appears when CPU > 85%, Memory > 85%, or Disk > 90%
- **Auto-refresh** — metrics stream every 2 seconds via SSE (no polling, no WebSockets)
- **REST endpoint** — `/api/metrics` returns raw JSON for any external use
- **Zero npm dependencies** — uses only Node.js built-in modules

---

## 📸 Preview

> Dashboard shows live system stats including CPU cores, memory bar, disk usage, uptime, process ID, Node version, and a real-time CPU history chart.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (built-in `http`, `os`, `fs`, `child_process`) |
| Streaming | Server-Sent Events (SSE) |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Chart | HTML5 Canvas API |
| Deployment | AWS EC2 (Amazon Linux 2023) |
| Process Manager | PM2 |

---

## 📂 Project Structure

```
server-health-monitor/
├── app.js          ← entire application (server + dashboard UI)
├── package.json    ← project metadata
└── README.md       ← you are here
```

---

## ⚡ Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v14 or higher

**Install Node.js on Ubuntu / Debian:**
```bash
sudo apt update -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs
```

**Install Node.js on RHEL / CentOS / Amazon Linux:**
```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

**Install Node.js on macOS (Homebrew):**
```bash
brew install node
```

**Install Node.js on Windows:**
Download and install from [nodejs.org](https://nodejs.org/)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/sivaconnects/Real-Time-Server-Health-Monitor.git

# 2. Navigate into the project folder
cd Real-Time-Server-Health-Monitor

# 3. Run the app (no npm install needed — zero dependencies!)
node app.js
```

Then open your browser and visit:

```
http://localhost:3000
```

That's it. No `.env` files, no database, no setup. ✅

---

## 🌐 Available Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Live dashboard UI |
| `GET /stream` | SSE stream (real-time metrics) |
| `GET /api/metrics` | Raw JSON metrics snapshot |

---

## ☁️ Deploy on AWS EC2

### Step 1 — Launch EC2 Instance
- AMI: **Amazon Linux 2023**
- Instance type: **t2.micro** (free tier eligible)
- Security Group inbound rules:

| Port | Purpose |
|---|---|
| 22 | SSH access |
| 3000 | App access |

### Step 2 — SSH into Your Instance

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@<YOUR_EC2_PUBLIC_IP>
```

### Step 3 — Install Node.js

**Amazon Linux 2023 / RHEL / CentOS:**
```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

**Ubuntu / Debian:**
```bash
sudo apt update -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs
```

Verify installation on any OS:
```bash
node -v
npm -v
```

### Step 4 — Clone & Run

```bash
# Clone the repo
git clone https://github.com/sivaconnects/Real-Time-Server-Health-Monitor.git
cd Real-Time-Server-Health-Monitor

# Start the app
node app.js
```

Visit `http://<YOUR_EC2_PUBLIC_IP>:3000` in your browser 🎉

### Step 5 — Keep It Running with PM2

```bash
# Install PM2
sudo npm install -g pm2

# Start with PM2
pm2 start app.js --name "health-monitor"

# Auto-start on reboot
pm2 startup
pm2 save
```

### Step 6 — (Optional) Run on Port 80

```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
```

Also open port **80** in your EC2 Security Group. Then users can access it at:
```
http://<YOUR_EC2_PUBLIC_IP>
```

---

## 🔧 Configuration

You can change the port using an environment variable:

```bash
PORT=8080 node app.js
```

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| Can't SSH into EC2 | Run `chmod 400 your-key.pem`, check Security Group port 22 |
| Can't open in browser | Check Security Group allows port 3000 from `0.0.0.0/0` |
| App stops after SSH disconnect | Use PM2 (Step 5 above) |
| Port already in use | Run `kill $(lsof -t -i:3000)` then restart |
| Disk shows 0% | `df` command may not be available — works on Linux (EC2) |

---

## 📖 What I Learned

- How **Server-Sent Events (SSE)** work for real-time data streaming
- How to calculate **CPU usage** using time deltas from `os.cpus()`
- Deploying a Node.js app on **AWS EC2** and managing it with **PM2**
- Reading real system metrics using Node.js built-in modules
- Drawing a live chart using **HTML5 Canvas API** with no libraries

---

## 🤝 Contributing

Pull requests are welcome! If you find a bug or want to add a feature:

1. Fork the repo
2. Create a new branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m "Add your feature"`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a Pull Request

---

## 👨‍💻 Author

**Venkata Siva Prasad Kanishetty**
- GitHub: [@sivaconnects](https://github.com/sivaconnects)
- LinkedIn: [Venkata Siva Prasad Kanishetty](https://www.linkedin.com/in/kanishetty/)

---

## 📄 License

This project is licensed under the **ISC License**.

---

⭐ **If you found this helpful, please give it a star!** It motivates me to keep building and learning. 🙏

# 🚀 Hoppscotch Lite - Modern HTTP Client

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.3.3-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4.1.12-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
</div>

<div align="center">
  <h3>🌟 A sleek, modern, and lightweight HTTP client for developers 🌟</h3>
  <p><em>Test APIs, debug requests, and manage collections with style</em></p>
</div>

---

## ✨ Features

### 🎯 **Core Functionality**
- **Multi-Method Support**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Smart Request Builder**: Intuitive interface for crafting HTTP requests
- **Real-time Response**: Live response previews with syntax highlighting
- **JSON Formatting**: Automatic JSON beautification and validation

### 📊 **Advanced Features**
- **Request Collections**: Organize and save your favorite API calls
- **History Tracking**: Never lose track of your previous requests
- **Response Analysis**: Detailed response headers, cookies, and metadata
- **Export/Import**: Backup and share your collections and history

### 🎨 **User Experience**
- **Modern UI**: Beautiful, responsive design with dark/light mode support
- **Fast Navigation**: Quick access to recent requests and collections
- **Smart Search**: Find requests in history with powerful filtering
- **Copy & Share**: Easy copy-to-clipboard functionality

### 🔧 **Developer Friendly**
- **No Overflow**: Perfect text wrapping for long responses
- **Multiple Views**: Formatted, Preview, and Raw response modes
- **Request Details**: Complete request/response cycle visibility
- **Error Handling**: Graceful error display and debugging info

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/RamyBouchareb25/aetherium.git
cd aetherium

# Install dependencies
npm install
# or
yarn install
# or
bun install

# Start the development server
npm run dev
# or
yarn dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and start testing your APIs! 🎉

---

## 🐳 Docker Deployment

### Quick Docker Run
```bash
# Build the image
docker build -t aetherium .

# Run the container
docker run -p 3000:3000 aetherium
```

### Docker Compose (Recommended)
```yaml
version: '3.8'
services:
  aetherium:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

---

## ☸️ Kubernetes Deployment

Deploy to your Kubernetes cluster with ease:

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get deployments
kubectl get services

# Access via port-forward (for testing)
kubectl port-forward svc/aetherium-service 3000:80
```

---

## 📖 Usage Guide

### 🎯 Making Your First Request
1. **Select HTTP Method**: Choose from GET, POST, PUT, DELETE, etc.
2. **Enter URL**: Type your API endpoint
3. **Add Headers**: Set authentication, content-type, and custom headers
4. **Add Body**: For POST/PUT requests, add JSON, text, or form data
5. **Send**: Hit the send button and view the response!

### 📚 Managing Collections
- **Create Collection**: Organize related API calls
- **Save Requests**: Store frequently used requests
- **Export/Import**: Share collections across teams

### 📊 Analyzing Responses
- **Formatted View**: Syntax-highlighted, prettified responses
- **Preview Mode**: Render HTML responses directly
- **Raw View**: See the unprocessed response data
- **Headers Tab**: Inspect all response headers
- **Request Tab**: Review what was actually sent

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS 4.1.12 for modern design
- **UI Components**: Radix UI for accessible components
- **Icons**: Lucide React for beautiful icons
- **State**: React hooks for local state management
- **Storage**: Browser localStorage for persistence

---

## 🎨 Screenshots

> *Coming soon - Beautiful screenshots of the app in action!*

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use semantic commit messages
- Ensure responsive design
- Add proper error handling
- Write clean, readable code

---

## 🐛 Issues & Bug Reports

Found a bug? Have a feature request? 

- **Create an Issue**: [GitHub Issues](https://github.com/RamyBouchareb25/aetherium/issues)
- **Discussions**: [GitHub Discussions](https://github.com/RamyBouchareb25/aetherium/discussions)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [Hoppscotch](https://hoppscotch.io) - the amazing API development ecosystem
- Built with ❤️ using modern web technologies
- Thanks to the open-source community for amazing tools and libraries

---

<div align="center">
  <h3>⭐ Star this repository if you found it helpful!</h3>
  <p>Made with ❤️ by <a href="https://github.com/RamyBouchareb25">Ramy Bouchareb</a></p>
</div>

---

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **Documentation**: [Wiki](https://github.com/RamyBouchareb25/aetherium/wiki)
- **Changelog**: [Releases](https://github.com/RamyBouchareb25/aetherium/releases)

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
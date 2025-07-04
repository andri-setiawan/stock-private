# 📈 Stock Trader AI - Personal Trading Companion

> AI-powered virtual stock trading with real market data and intelligent recommendations

![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![React](https://img.shields.io/badge/React-19-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Features

- **🤖 Multi-AI Recommendations**: Choose from Google Gemini, GROQ AI, or OpenAI for trading insights
- **📊 Real-Time Portfolio Tracking**: Live market data with accurate P&L calculations reflecting current market values
- **💰 Virtual Portfolio**: $10,000 starting capital with enhanced database persistence and real-time sync
- **📱 Mobile-First Design**: Optimized PWA experience with offline support
- **🔐 Secure Authentication**: Protected with NextAuth.js and MariaDB
- **📈 Advanced Analytics**: Professional financial metrics with risk analysis
- **🎯 Enhanced Trading Interface**: AI-powered trade execution with validation
- **📋 Complete Transaction History**: Persistent trading history across devices
- **🔔 Smart Trading Alerts**: Real-time notifications with performance tracking
- **🤖 Automated Trading Bot**: Fully autonomous AI-powered trading system
- **⚖️ Risk Management**: Advanced position sizing and portfolio protection
- **🛡️ Safety Mechanisms**: Emergency stops, circuit breakers, and overspending prevention
- **🗄️ Database Persistence**: MariaDB with Prisma ORM for data integrity and real-time price synchronization
- **⚡ Performance Optimized**: Eliminated infinite loops and improved React rendering performance by 40%

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or 20+
- npm, yarn, or pnpm
- MariaDB or MySQL database
- Modern web browser

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd stock-trader-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys and database URL

# Set up database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

### Access the Application
- **Local**: http://localhost:3001
- **Network**: http://YOUR_LOCAL_IP:3001
- **Production**: https://your-domain.com

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.3.3, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4.x with mobile-first design
- **State Management**: Zustand 5.0.5 with database persistence
- **Database**: MariaDB/MySQL with Prisma ORM
- **Authentication**: NextAuth.js 4.24.11 with secure password hashing
- **APIs**: Finnhub (stock data), Multi-AI providers (Gemini/GROQ/OpenAI)
- **Server**: Custom Express 5.1.0 server with CORS and Helmet security

### Project Structure
```
stock-trader-ai/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Authentication pages
│   │   ├── (protected)/        # Main app pages
│   │   └── api/                # API routes
│   ├── components/             # React components
│   │   ├── PortfolioManager.tsx
│   │   ├── TradingInterface.tsx
│   │   ├── Analytics.tsx
│   │   └── MobileNav.tsx
│   ├── services/               # External API integrations
│   │   ├── finnhub.ts         # Stock data service
│   │   ├── gemini.ts          # AI recommendations
│   │   └── storage.ts         # Data persistence
│   ├── store/                  # State management
│   │   └── portfolio.ts       # Portfolio store (Zustand)
│   └── types/                  # TypeScript definitions
├── scripts/                    # Deployment and utility scripts
├── public/                     # Static assets
├── server.js                   # Custom Express server
└── docs/                       # Documentation
```

## 🎯 Core Features

### 1. Portfolio Management
- **Virtual Capital**: Start with $10,000 virtual money
- **Real-time Updates**: Portfolio values update every 30 seconds
- **P&L Tracking**: Track profits, losses, and performance metrics
- **Holdings Overview**: Detailed view of all stock positions

### 2. Multi-AI Trading Recommendations
- **Triple AI Provider Support**: Choose between Google Gemini, GROQ AI, or OpenAI for recommendations
  - **Google Gemini**: gemini-1.5-flash - Fast & efficient market analysis
  - **GROQ AI**: llama-3.1-8b-instant - Ultra-fast inference with Meta's model
  - **OpenAI**: gpt-4o-mini - Smart & efficient trading analysis
- **Confidence Scoring**: AI provides confidence levels with visual indicators
- **Risk Assessment**: Each recommendation includes risk level analysis
- **Detailed Justification**: Key factors explaining why to buy/sell/hold
- **Market Context**: Broader market analysis affecting recommendations
- **Portfolio Impact**: Real-time analysis of how trades affect existing holdings
- **Real-time Provider Switching**: Instantly compare different AI perspectives on the same stock

### 3. Enhanced Stock Trading Interface
- **Stock Search**: Real-time search with autocomplete and stock selection
- **AI-Powered Recommendations**: Comprehensive buy/sell analysis with confidence scores
- **Market Data**: Live quotes, charts, and detailed financial metrics
- **Trade Execution**: Buy/sell with real-time price validation and AI guidance
- **Smart Insights**: Target prices, suggested shares, and risk assessments
- **Visual Indicators**: Color-coded confidence levels and recommendation strength

### 4. Advanced Analytics Dashboard
- **Risk-Adjusted Performance**: Sharpe ratio, Sortino ratio, Calmar ratio, volatility analysis
- **Portfolio Attribution**: Individual stock and sector contribution analysis
- **AI Performance Tracking**: Success rate analysis, confidence accuracy, time-to-target metrics
- **Risk Assessment**: Value at Risk (VaR), maximum drawdown, diversification scoring
- **Interactive Analytics**: Multi-tab interface with timeframe selection and real-time updates

### 5. Automated Trading Bot
- **Autonomous Trading**: Fully automated AI-powered trade execution
- **Risk Management**: Advanced position sizing and portfolio protection
- **Market Awareness**: Trading hours and market condition monitoring
- **Safety Controls**: Emergency stops, circuit breakers, and human overrides
- **Performance Tracking**: Real-time bot status and trading statistics

### 6. Smart Alert System
- **Real-time Notifications**: Browser alerts for high-confidence opportunities
- **Priority Levels**: LOW, MEDIUM, HIGH, URGENT alert categories
- **Customizable Settings**: Configure thresholds, quiet hours, and preferences
- **Alert Analytics**: Track alert performance and success rates

## 🧭 Navigation

The app features 5 main sections accessible via bottom navigation:

- **📊 Portfolio**: Main dashboard with holdings overview and real-time performance
- **💰 Trade**: Enhanced manual trading interface with comprehensive AI-powered recommendations
- **💡 AI Tips**: Daily AI suggestions for manual review and analysis
- **🤖 Auto Bot**: Automated trading bot dashboard and controls
- **📈 Analytics**: Advanced financial analytics with risk-adjusted metrics and attribution analysis

## 🔧 Configuration

### Environment Variables
Create `.env.local` with:
```env
# API Keys
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key

# Authentication
USER_PASSWORD_HASH=bcrypt_hashed_password
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3001

# Server
PORT=3001
NODE_ENV=development
```

### API Configuration
- **Finnhub API**: Free tier provides 60 calls/minute for real-time stock data
- **Google Gemini AI**: Free tier with 60 queries/minute for trading recommendations
- **GROQ AI**: Free tier with 30 requests/minute for ultra-fast inference
- **OpenAI API**: Pay-per-use with efficient GPT-4o Mini model
- **Rate Limiting**: Built-in protection against API abuse
- **Provider Fallback**: Automatic switching when rate limits are hit

## 📱 Mobile Experience

### PWA Features
- **App-like Experience**: Installable as mobile app
- **Offline Support**: Basic functionality without internet
- **Touch Optimized**: Designed for mobile-first interaction
- **Responsive Design**: Works on all screen sizes

### Mobile Navigation
- **Bottom Tab Bar**: Easy thumb navigation
- **Swipe Gestures**: Intuitive mobile interactions
- **Touch Targets**: 44px minimum for accessibility
- **Fast Loading**: Optimized for mobile networks

## 🔒 Security Features

### Authentication
- **Secure Login**: bcrypt password hashing
- **Session Management**: JWT-based sessions with NextAuth.js
- **Route Protection**: Middleware protects all trading routes
- **CSRF Protection**: Built-in protection against cross-site attacks

### API Security
- **CORS Configuration**: Comprehensive origin allowlist
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: Secure error messages without information leakage

## 🌐 Network & Deployment

### Supported Access Points
- **Localhost**: http://localhost:3001, http://127.0.0.1:3001
- **Local Network**: http://YOUR_LOCAL_IP:3001
- **Public IP**: http://YOUR_PUBLIC_IP:3001
- **Production Domain**: https://your-domain.com

### Deployment Options
1. **Development**: `npm run dev`
2. **Production**: `npm run build && npm start`
3. **PM2**: `pm2 start ecosystem.config.js`
4. **Docker**: Dockerfile included for containerization

## 📊 Performance

### Optimization Features
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js built-in image optimization
- **Caching**: API response caching and static asset caching
- **Compression**: Gzip compression for all assets
- **Lazy Loading**: Components load on demand

### Performance Metrics
- **First Contentful Paint**: <2s
- **Largest Contentful Paint**: <3s
- **Time to Interactive**: <3s
- **Cumulative Layout Shift**: <0.1

## 🧪 Testing

### Test Suite
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests

# Test network access
./scripts/test-network-access.sh

# Configure firewall
./scripts/configure-firewall.sh
```

## 📚 Documentation

- **[Network Access Guide](NETWORK_ACCESS.md)**: Complete networking and firewall setup
- **[Deployment Guide](DEPLOYMENT.md)**: Production deployment instructions
- **[API Documentation](docs/API.md)**: API endpoints and usage
- **[Component Documentation](docs/COMPONENTS.md)**: React component guide

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm test             # Run test suite
```

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting with custom rules
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Troubleshooting
- **Network Issues**: Run `./scripts/test-network-access.sh`
- **Firewall Problems**: Run `./scripts/configure-firewall.sh`
- **API Errors**: Check environment variables and API key validity
- **Build Failures**: Ensure Node.js version compatibility

### Getting Help
1. Check the [documentation](docs/)
2. Review [troubleshooting guide](NETWORK_ACCESS.md#troubleshooting)
3. Check existing issues
4. Create a new issue with detailed description

## 🔮 Future Enhancements

### Planned Features
- **Advanced Charting**: Technical analysis tools
- **Paper Trading Competition**: Multi-user competitions
- **Options Trading**: Options contracts simulation
- **Portfolio Backtesting**: Historical strategy testing
- **Social Features**: Share trades and strategies
- **Advanced AI**: More sophisticated trading algorithms

### Performance Improvements
- **Redis Caching**: Advanced caching layer
- **CDN Integration**: Global content delivery
- **Database Optimization**: Advanced data persistence
- **Real-time Updates**: WebSocket integration

## 🔧 Recent Updates

### Latest Release: AI Quota Management & System Stability (June 2025)
- **✅ Intelligent AI Quota Management**: Prevents service interruptions with automatic provider fallback
- **✅ Real-time Quota Monitoring**: Professional dashboard with visual indicators and usage statistics
- **✅ Cross-Device Portfolio Sync**: Complete MariaDB migration for seamless multi-device access
- **✅ Enhanced System Stability**: Zero hydration errors with SSR-safe rendering patterns
- **✅ Atomic Trade Execution**: New database-backed trade system with overspending prevention
- **✅ Smart Resource Management**: Optimal utilization of free AI provider quotas (99.9% uptime)

### Previous Release: Triple AI Provider Integration (June 2025)
- **✅ OpenAI GPT-4o Mini Integration**: Added third AI provider option for trading analysis
- **✅ Multi-Provider Support**: Choose between Google Gemini, GROQ AI, or OpenAI
- **✅ Real-time Provider Switching**: Instantly switch AI providers with consistent results
- **✅ Enhanced Provider Sync**: Fixed AI provider persistence across all app components
- **✅ Unified Recommendation System**: All pages now use the selected AI provider consistently
- **✅ Automatic Cache Management**: Smart cache clearing when switching providers

### Previous Release: Phase 13 - Advanced Analytics Engine (June 2025)
- **✅ Professional Financial Analytics**: Complete risk-adjusted performance metrics suite
- **✅ Portfolio Attribution Analysis**: Individual stock and sector contribution tracking
- **✅ AI Performance Analytics**: Comprehensive AI recommendation success rate analysis
- **✅ Interactive Dashboard**: Multi-tab interface with timeframe selection
- **✅ Risk Assessment Tools**: Value at Risk, diversification scoring, stress testing

### Bug Fixes (June 2025)
- **✅ Fixed AI Provider Consistency**: Resolved issue where AI Tips always used GROQ regardless of settings
- **✅ Fixed Provider Synchronization**: All components now properly use selected AI provider
- **✅ Enhanced Real-time Provider Updates**: Components automatically refresh when provider changes
- **✅ Fixed Gemini AI Integration**: Updated to use `gemini-1.5-flash` model (deprecated `gemini-pro` resolved)
- **✅ Fixed Portfolio P&L Calculation**: Real-time total P&L now correctly reflects individual stock profits
- **✅ Enhanced Real-time Updates**: Portfolio summary now updates with live market prices

### Performance Improvements
- **Multi-AI Provider System**: Optimized AI service architecture supporting three providers
- **Smart Provider Switching**: Real-time updates without page refresh when changing AI providers
- **Enhanced Cache Management**: Intelligent cache clearing and refresh for consistent AI results
- **Advanced Analytics Engine**: Professional-grade financial metrics calculation
- **Real-time P&L Tracking**: Total portfolio gains/losses update automatically with market prices
- **Enhanced Error Handling**: Better error messages for AI service connectivity
- **Optimized Model Usage**: Faster AI responses with gemini-1.5-flash and gpt-4o-mini models
- **Mobile-Optimized Analytics**: Responsive design for complex financial data visualization

## 🎉 Acknowledgments

- **Finnhub.io**: Real-time stock market data
- **Google Gemini**: AI-powered trading recommendations with gemini-1.5-flash
- **GROQ**: Ultra-fast AI inference with llama-3.1-8b-instant
- **OpenAI**: Smart trading analysis with GPT-4o Mini
- **Next.js Team**: Excellent React framework
- **TradingView**: Lightweight Charts library
- **Tailwind CSS**: Utility-first CSS framework

---

**📈 Happy Trading with AI!**

> **Disclaimer**: This is a virtual trading simulator for educational purposes only. Not financial advice. Past performance does not guarantee future results.

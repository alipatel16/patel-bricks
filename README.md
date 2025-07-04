# Brick Production Management App

A comprehensive web application for managing brick production operations, built with React and Firebase. Track daily production, manage inventory, record sales, and analyze business performance with real-time data synchronization.

## 🚀 Features

### Production Management
- **Daily Production Tracking**: Record brick production with cement usage, shift details, and quality grades
- **Production Analytics**: View production trends, efficiency metrics, and performance statistics
- **Cement Usage Monitoring**: Track cement consumption and calculate production efficiency

### Inventory Management
- **Real-time Stock Tracking**: Monitor brick and cement inventory levels in real-time
- **Automated Stock Updates**: Automatic inventory adjustments based on production and sales
- **Low Stock Alerts**: Configurable alerts when inventory falls below threshold levels
- **Purchase Tracking**: Record cement purchases with supplier information and cost tracking

### Sales Management
- **Sales Recording**: Record brick sales with customer information and payment details
- **Customer Management**: Store and manage customer information for repeat business
- **Sales Analytics**: Track revenue, transaction volumes, and customer insights
- **Flexible Pricing**: Support for discounts and multiple payment methods

### Analytics & Reporting
- **Dashboard Overview**: Comprehensive dashboard with key performance indicators
- **Production Reports**: Detailed production analytics with trends and comparisons
- **Sales Reports**: Revenue analysis, customer insights, and sales performance metrics
- **Financial Overview**: Inventory valuation and basic profit tracking

### Additional Features
- **Real-time Data Sync**: Firebase Realtime Database ensures data consistency across devices
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Configurable Settings**: Customize cement ratios, pricing, and alert thresholds
- **Data Export**: Export reports and data for external analysis (planned feature)

## 🛠️ Technology Stack

- **Frontend**: React 18, Material-UI (MUI), React Router, React Hook Form
- **Backend**: Firebase Realtime Database
- **Charts**: Recharts for data visualization
- **Build Tool**: Create React App
- **Styling**: Material-UI components with custom theming

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (version 14 or higher)
- **npm** or **yarn** package manager
- **Firebase project** with Realtime Database enabled
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd brick-production-app
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Realtime Database

2. **Get Firebase Configuration**:
   - Go to Project Settings → General → Your apps
   - Click "Add app" and select Web
   - Copy the Firebase configuration object

3. **Configure Environment Variables**:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration:

```bash
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

4. **Set Database Rules**:
   - Copy the rules from `database.rules.json` to your Firebase Realtime Database rules
   - For production, implement proper authentication and security rules

### 4. Run the Application

```bash
npm start
# or
yarn start
```

The app will open in your browser at `http://localhost:3000`.

## 📁 Project Structure

```
brick-production-app/
├── public/                     # Static files
├── src/
│   ├── components/             # React components
│   │   ├── common/            # Shared components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   └── inventory/         # Inventory-specific components
│   ├── context/               # React Context providers
│   ├── hooks/                 # Custom React hooks
│   ├── pages/                 # Main page components
│   ├── services/              # API services and Firebase utilities
│   ├── styles/                # Global styles
│   └── utils/                 # Utility functions
├── firebase.json              # Firebase configuration
├── database.rules.json        # Firebase Database rules
└── package.json               # Project dependencies
```

## 🔧 Configuration

### Default Settings

The app comes with sensible defaults that can be customized:

- **Cement per Brick Ratio**: 0.05 bags (20 bricks per bag)
- **Default Brick Price**: ₹2.50
- **Low Stock Alerts**: 1000 bricks, 10 cement bags

### Customization

1. **Settings Page**: Use the in-app settings to modify configuration
2. **Constants File**: Edit `src/utils/constants.js` for default values
3. **Theme**: Modify `src/App.js` for UI theming

## 📊 Usage Guide

### Getting Started

1. **Initial Setup**: Configure your cement-to-brick ratio and default pricing in Settings
2. **Add Initial Inventory**: Set your starting brick and cement stock levels
3. **Record Production**: Start logging daily production with cement usage
4. **Track Sales**: Record brick sales with customer information
5. **Monitor Performance**: Use the dashboard and reports to track business metrics

### Best Practices

- **Daily Updates**: Record production and sales daily for accurate tracking
- **Regular Inventory Checks**: Verify and adjust inventory levels periodically
- **Customer Information**: Collect customer details to build a customer database
- **Monitor Alerts**: Pay attention to low stock alerts to avoid production delays

## 🔐 Security Considerations

**⚠️ Important**: This demo uses open Firebase rules for easy setup. For production use:

1. **Implement Authentication**: Add user authentication before deployment
2. **Secure Database Rules**: Restrict read/write access based on user authentication
3. **Environment Variables**: Keep Firebase configuration secure
4. **Input Validation**: The app includes client-side validation, but add server-side validation for production

## 🚀 Deployment

### Firebase Hosting

1. **Install Firebase CLI**:
```bash
npm install -g firebase-tools
```

2. **Login and Initialize**:
```bash
firebase login
firebase init hosting
```

3. **Build and Deploy**:
```bash
npm run build
firebase deploy
```

### Other Hosting Options

The app can be deployed to any static hosting service:
- **Netlify**: Connect your Git repository for automatic deployments
- **Vercel**: Simple deployment with Git integration
- **AWS S3**: Static website hosting with CloudFront
- **GitHub Pages**: Free hosting for public repositories

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. **Check the Issues**: Look for existing solutions in the GitHub issues
2. **Create an Issue**: Report bugs or request features
3. **Documentation**: Review this README and code comments
4. **Firebase Documentation**: Check [Firebase docs](https://firebase.google.com/docs) for Firebase-specific issues

## 🚧 Roadmap

### Planned Features

- **User Authentication**: Multi-user support with role-based access
- **Advanced Analytics**: Profit/loss analysis, forecasting, and business intelligence
- **Export/Import**: Data export to Excel/CSV and bulk import capabilities
- **Notifications**: Email and SMS notifications for alerts and reports
- **Mobile App**: React Native mobile application
- **API Integration**: REST API for third-party integrations
- **Multi-language Support**: Internationalization for global use

### Known Limitations

- **No Authentication**: Currently uses open Firebase rules
- **Basic Reporting**: Limited to basic analytics and reports
- **No Offline Support**: Requires internet connection for real-time sync
- **Single Business**: Designed for single brick production business

## 🙏 Acknowledgments

- **Material-UI**: For the excellent React component library
- **Firebase**: For real-time database and hosting services
- **Recharts**: For beautiful and responsive charts
- **React**: For the amazing frontend framework

---

**Built with ❤️ for brick production businesses**

For more information or commercial support, please contact the development team.
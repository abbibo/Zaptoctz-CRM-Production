# Deployment Pipeline

This project is configured for automated deployment to Firebase Hosting.

## Prerequisites

1.  **Firebase CLI**: The project uses `firebase-tools` (installed locally).
2.  **Authentication**: You must be logged in to Firebase.
    - Run `npx firebase login` if prompted.

## Automated Deployment

To deploy the entire application (Build + Deploy), run:

```bash
npm run deploy
```

This command executes:

1.  `npm run build`: Compiles the React application into the `build/` directory using `env-cmd` for environment variables.
2.  `firebase deploy`: Deploys the `build/` directory, Firestore rules, and Storage rules to Firebase.

## First-Time Setup (Important)

### Firebase Storage

If you see an error regarding **Firebase Storage** (e.g., "click 'Get Started' to set up"), you must perform a one-time manual initialization:

1.  Go to the [Firebase Console](https://console.firebase.google.com/project/zaptockz-crm-app/storage).
2.  Click **"Get Started"** on the Storage tab.
3.  Follow the prompts to create the default bucket.
4.  Once created, run `npm run deploy` again to apply the security rules.

## Configuration Files

- **`firebase.json`**: Configures Hosting rewrites, Firestore rules, and Storage rules.
- **`.firebaserc`**: Maps the `default` project alias to `zaptockz-crm-app`.
- **`.env`**: Contains local environment variables (injected during build).

## Live URL

The application is live at: **https://zaptockz-crm-app.web.app**
